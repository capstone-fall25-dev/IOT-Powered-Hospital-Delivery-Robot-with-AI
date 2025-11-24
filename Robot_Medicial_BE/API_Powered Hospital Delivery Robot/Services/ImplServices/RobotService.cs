using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class RobotService : IRobotService
    {
        private readonly IRobotRepository _robotRepository;
        private readonly IMapRepository _mapRepository;
        private readonly IMapper _mapper;
        private readonly ILogRepository _logRepository;
        private readonly IAlertService _alertService;
        private readonly IRobotCompartmentRepository _robotCompartmentRepository;

        private readonly string[] ValidStatuses = { "transporting", "awaiting_handover", "returning_to_station", "at_station", "completed", "charging", "needs_attention", "manual_control", "offline" };

        public RobotService(IRobotRepository robotRepository,
            IMapper mapper, IMapRepository mapRepository, ILogRepository logRepository, IAlertService alertService, IRobotCompartmentRepository robotCompartmentRepository)
        {
            _robotRepository = robotRepository;
            _mapper = mapper;
            _mapRepository = mapRepository;
            _logRepository = logRepository;
            _alertService = alertService;
            _robotCompartmentRepository = robotCompartmentRepository;
        }

        public async Task<AssignMapResponseDto> AssignMapAsync(ulong robotId, ulong mapId)
        {
            var robot = await _robotRepository.GetByIdAsync(robotId, includeTasks: true);
            if (robot == null)
                throw new InvalidOperationException("Robot not found");

            if (robot.Tasks.Any(t => t.Status == "in_progress" || t.Status == "transporting"))
                throw new InvalidOperationException("Cannot assign map to robot with active tasks");

            var map = await _mapRepository.GetByIdAsync(mapId);
            if (map == null)
                throw new InvalidOperationException("Map not found");

            var updatedRobot = await _robotRepository.AssignMapAsync(robotId, mapId);
            if (updatedRobot == null)
                throw new InvalidOperationException("Failed to assign map");

            await _logRepository.CreateAsync(new Log
            {
                RobotId = robotId,
                LogType = "info",
                Message = $"Robot {robot.Code} assigned to map {map.MapName}",
                CreatedAt = DateTime.UtcNow
            });

            return new AssignMapResponseDto
            {
                RobotId = robotId,
                MapId = mapId,
                MapName = map.MapName,
                Message = "Map assigned successfully"
            };
        }

        public async Task<RobotResponseDto> CreateAsync(RobotDto robotDto)
        {
            var existing = await _robotRepository.GetByCodeAsync(robotDto.Code);
            if (existing != null)
                throw new InvalidOperationException("Robot code already exists");

            if (robotDto.BatteryPercent < 0 || robotDto.BatteryPercent > 100)
                throw new ArgumentException("Battery percent must be between 0 and 100");

            // map robot từ DTO
            var robot = _mapper.Map<Robot>(robotDto);

            robot.Status = "at_station";
            robot.CreatedAt = robot.UpdatedAt = robot.LastHeartbeatAt = DateTime.UtcNow;

            // Lưu robot trước
            var createdRobot = await _robotRepository.CreateAsync(robot);

            // tạo compartments
            var compartments = robotDto.Compartments.Select((c, index) => new RobotCompartment
            {
                RobotId = createdRobot.Id,
                CompartmentCode = $"C{index + 1:000}",
                Status = c.IsLocked ? "locked" : "unlocked",
                CategoryId = c.CategoryId,
                IsActive = true
            }).ToList();

            // Lưu compartments
            await _robotCompartmentRepository.CreateManyAsync(compartments);


            var response = new RobotResponseDto
            {
                Id = createdRobot.Id,
                Code = createdRobot.Code,
                Name = createdRobot.Name,
                Status = createdRobot.Status,
                BatteryPercent = createdRobot.BatteryPercent,
                Compartments = createdRobot.RobotCompartments.Select(c => new CompartmentDto
                {

                    Code = c.CompartmentCode,
                    CategoryId = c.CategoryId

                }).ToList()


            };

            return response;

        }

        public async Task<RobotResponseDto> UpdateAsync(ulong robotId, UpdateRobotDto updateDto)
        {
            // 1. Lấy robot hiện tại
            var existingRobot = await _robotRepository.GetByIdAsync(robotId, includeCompartments: true, includeTasks: true);
            if (existingRobot == null)
                throw new InvalidOperationException("Robot không tồn tại");

            // 2. Không cho sửa nếu robot đang chạy nhiệm vụ
            if (existingRobot.Tasks.Any(t => t.Status is "in_progress" or "transporting"))
                throw new InvalidOperationException("Không thể cập nhật robot khi đang thực hiện nhiệm vụ");

            // 3. Cập nhật Tên (nếu có)
            if (!string.IsNullOrWhiteSpace(updateDto.Name))
                existingRobot.Name = updateDto.Name.Trim();

            // 4. Cập nhật Map (nếu có thay đổi)
            if (updateDto.MapId.HasValue)
            {
                var map = await _mapRepository.GetByIdAsync(updateDto.MapId.Value);
                if (map == null)
                    throw new InvalidOperationException($"Map với ID {updateDto.MapId.Value} không tồn tại");
                existingRobot.MapId = updateDto.MapId.Value;
            }
            else
            {
                existingRobot.MapId = null; // Bỏ gán map
            }

            // 5. Xóa hết compartments cũ + tạo mới
            await _robotCompartmentRepository.DeleteByRobotIdAsync(robotId);

            var newCompartments = updateDto.Compartments
                .Select((c, index) => new RobotCompartment
                {
                    RobotId = robotId,
                    CompartmentCode = $"C{index + 1:000}",
                    CategoryId = c.CategoryId,
                    Status = c.IsLocked ? "locked" : "unlocked",
                    IsActive = true
                })
                .ToList();

            await _robotCompartmentRepository.CreateManyAsync(newCompartments);

            // 6. Cập nhật thời gian
            existingRobot.UpdatedAt = DateTime.UtcNow;

            // 7. Lưu robot
            var updatedRobot = await _robotRepository.UpdateAsync(existingRobot);

            // 8. Log hành động
            var mapChange = updateDto.MapId.HasValue
                ? $"gán map '{updatedRobot.Map?.MapName}'"
                : "bỏ gán map";

            await _logRepository.CreateAsync(new Log
            {
                RobotId = robotId,
                LogType = "info",
                Message = $"Robot {updatedRobot.Code} ({updatedRobot.Name}) đã được cập nhật: tên, loại ngăn chứa và {mapChange}",
                CreatedAt = DateTime.UtcNow
            });

            // 9. Trả về response đầy đủ
            return new RobotResponseDto
            {
                Id = updatedRobot.Id,
                Code = updatedRobot.Code,
                Name = updatedRobot.Name,
                Status = updatedRobot.Status,
                BatteryPercent = updatedRobot.BatteryPercent,
                MapId = updatedRobot.MapId,
                Compartments = updatedRobot.RobotCompartments.Select(c => new CompartmentDto
                {
                    Code = c.CompartmentCode,
                    CategoryId = c.CategoryId
                }).ToList()
            };
        }

        public async Task<IEnumerable<RobotResponseDto>> GetAllAsync(string? status = null)
        {
            var robots = await _robotRepository.GetAllAsync(status);
            return _mapper.Map<IEnumerable<RobotResponseDto>>(robots);
        }

        public async Task<RobotResponseDto?> GetByIdAsync(ulong id)
        {
            var robot = await _robotRepository.GetByIdAsync(id, includeCompartments: true, includeTasks: true, includeTaskStops: true);

            if (robot == null)
                return null;

            return new RobotResponseDto
            {
                Id = robot.Id,
                Code = robot.Code ?? string.Empty,
                Name = robot.Name,
                Status = robot.Status ?? "Unknown",
                BatteryPercent = robot.BatteryPercent,
                Latitude = robot.Latitude,
                Longitude = robot.Longitude,
                ProgressOverallPct = robot.ProgressOverallPct,
                ProgressLegPct = robot.ProgressLegPct,
                IsMicOn = robot.IsMicOn,
                EtaDeliveryAt = robot.EtaDeliveryAt,
                EtaReturnAt = robot.EtaReturnAt,
                ErrorCountSession = robot.ErrorCountSession,
                LastHeartbeatAt = robot.LastHeartbeatAt,

                MapId = robot.MapId,
                Compartments = robot.RobotCompartments.Select(c => new CompartmentDto
                {

                    Code = c.CompartmentCode,
                    CategoryId = c.CategoryId

                }).ToList(),

                Tasks = robot
                .Tasks
                .

                Select(t => new TaskResponseDto
                {
                    Id = t.Id,
                    Status = t.Status,
                    RobotName = robot.Name,

                    Stops = t.TaskStops?
                    .OrderBy(ts => ts.SeqNo)
                    .Select(ts => new TaskStopResponseDto
                    {
                        SeqNo = ts.SeqNo,
                        PatientName = ts.Patient?.FullName,
                        DestinationName = ts.CustomName,



                    })
                    .ToList() ?? new List<TaskStopResponseDto>()

                }).ToList(),




            };
        }

        public async Task<RobotResponseDto?> UpdatePositionAsync(ulong id, UpdatePositionDto dto)
        {
            var updated = await _robotRepository.UpdatePositionAsync(id, dto.Latitude, dto.Longitude);
            if (updated == null) return null;

            if (updated.ErrorCountSession > 3 || updated.Status == "failed")
            {
                await _alertService.CreateAsync(new AlertDto
                {
                    RobotId = id,
                    Severity = "high",
                    Category = "system",
                    Status = "open",
                    Message = $"Robot {updated.Code} error threshold exceeded ({updated.ErrorCountSession} errors). Position: {dto.Latitude},{dto.Longitude}"
                });
            }

            return _mapper.Map<RobotResponseDto>(updated);
        }

        // ✅ ROS cập nhật trạng thái theo Code
        public async Task<RobotResponseDto?> UpdateStatusAsync(RobotStatusUpdateDto dto)
        {
            if (string.IsNullOrEmpty(dto.Code) || string.IsNullOrEmpty(dto.Status))
                throw new ArgumentException("Robot code or status cannot be empty");

            var updated = await _robotRepository.UpdateStatusAsync(dto.Code, dto.Status);
            if (updated == null)
                throw new InvalidOperationException($"Robot with code {dto.Code} not found");

            await _logRepository.CreateAsync(new Log
            {
                RobotId = updated.Id,
                LogType = "info",
                Message = $"Robot {updated.Code} updated status to {dto.Status}",
                CreatedAt = DateTime.UtcNow
            });

            return _mapper.Map<RobotResponseDto>(updated);
        }

        // ✅ Admin/Doctor cập nhật theo Id
        public async Task<RobotResponseDto?> UpdateStatusAsync(ulong id, UpdateStatusDto dto)
        {
            if (!ValidStatuses.Contains(dto.Status))
                throw new ArgumentException($"Invalid status: {dto.Status}. Must be one of: {string.Join(", ", ValidStatuses)}");

            var existing = await _robotRepository.GetByIdAsync(id);
            if (existing == null)
                throw new InvalidOperationException("Robot not found");

            if (existing.Status == "offline")
                throw new InvalidOperationException("Cannot update status of offline robot");

            var updated = await _robotRepository.UpdateStatusAsync(id, dto.Status);
            return updated != null ? _mapper.Map<RobotResponseDto>(updated) : null;
        }
    }
}
