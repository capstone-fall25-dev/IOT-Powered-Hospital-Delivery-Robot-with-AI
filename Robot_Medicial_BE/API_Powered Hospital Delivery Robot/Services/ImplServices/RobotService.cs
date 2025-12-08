using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using API_Powered_Hospital_Delivery_Robot.Hubs;
namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý robot
    /// </summary>
    public class RobotService : IRobotService
    {
        private readonly IRobotRepository _robotRepository;
        private readonly IMapRepository _mapRepository;
        private readonly IMapper _mapper;
        private readonly ILogRepository _logRepository;
        private readonly IAlertService _alertService;
        private readonly IRobotCompartmentRepository _robotCompartmentRepository;
   private readonly IHubContext<RobotHub> _hub;
    private readonly IConfiguration _config;
    private readonly ILogger<RobotService> _logger;

      // Mong muốn từ UI (không phải ground truth)
    private static bool _desiredOn = false;
    // Mã robot được phép điều khiển (cấu hình trong appsettings, mặc định RBT001)
    private string AllowedRobotCode => _config["Robots:AllowedCode"] ?? "RBT001";


        // Các trạng thái hợp lệ của robot
        private readonly string[] ValidStatuses = { "transporting", "awaiting_handover", "returning_to_station", "at_station", "completed", "charging", "needs_attention", "manual_control", "offline" };

        public RobotService(IRobotRepository robotRepository,
            IMapper mapper, IMapRepository mapRepository, ILogRepository logRepository, IAlertService alertService, IRobotCompartmentRepository robotCompartmentRepository, IHubContext<RobotHub> hub,
        IConfiguration config,
        ILogger<RobotService> logger)
        {
            _robotRepository = robotRepository;
            _mapper = mapper;
            _mapRepository = mapRepository;
            _logRepository = logRepository;
            _alertService = alertService;
            _robotCompartmentRepository = robotCompartmentRepository;
            
             // ➕ ADD
        _hub = hub;
        _config = config;
        _logger = logger;
        }

        /// <summary>
        /// Gán bản đồ cho robot
        /// </summary>
        public async Task<AssignMapResponseDto> AssignMapAsync(ulong robotId, ulong mapId)
        {
            var robot = await _robotRepository.GetByIdAsync(robotId, includeTasks: true);
            if (robot == null)
                throw new InvalidOperationException("Không tìm thấy robot");

            if (robot.Tasks.Any(t => t.Status == "in_progress" || t.Status == "transporting"))
                throw new InvalidOperationException("Không thể gán bản đồ cho robot đang có nhiệm vụ đang chạy");

            var map = await _mapRepository.GetByIdAsync(mapId);
            if (map == null)
                throw new InvalidOperationException("Không tìm thấy bản đồ");

            var updatedRobot = await _robotRepository.AssignMapAsync(robotId, mapId);
            if (updatedRobot == null)
                throw new InvalidOperationException("Không thể gán bản đồ");

            await _logRepository.CreateAsync(new Log
            {
                RobotId = robotId,
                LogType = "info",
                Message = $"Robot {robot.Code} đã được gán bản đồ {map.MapName}",
                CreatedAt = DateTime.Now
            });

            return new AssignMapResponseDto
            {
                RobotId = robotId,
                MapId = mapId,
                MapName = map.MapName,
                Message = "Gán bản đồ thành công"
            };
        }

        /// <summary>
        /// Tạo robot mới
        /// </summary>
        public async Task<RobotResponseDto> CreateAsync(RobotDto robotDto)
        {
            if (string.IsNullOrEmpty(robotDto.Code))
                throw new ArgumentException("Mã robot không được để trống");

            var existing = await _robotRepository.GetByCodeAsync(robotDto.Code);
            if (existing != null)
                throw new InvalidOperationException("Mã robot đã tồn tại");

            if (robotDto.BatteryPercent < 0 || robotDto.BatteryPercent > 100)
                throw new ArgumentException("Phần trăm pin phải nằm trong khoảng 0 và 100");

            // Ánh xạ robot từ DTO
            var robot = _mapper.Map<Robot>(robotDto);

            robot.Status = "at_station";
            robot.CreatedAt = robot.UpdatedAt = robot.LastHeartbeatAt = DateTime.Now;

            // Lưu robot trước
            var createdRobot = await _robotRepository.CreateAsync(robot);

            // Tạo ngăn chứa
            var compartments = (robotDto.Compartments ?? new List<CompartmentDto>()).Select((c, index) => new RobotCompartment
            {
                RobotId = createdRobot.Id,
                CompartmentCode = $"C{index + 1:000}",
                Status = c.IsLocked ? "locked" : "unlocked",
                CategoryId = c.CategoryId,
                IsActive = true
            }).ToList();

            // Lưu ngăn chứa
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

        /// <summary>
        /// Cập nhật thông tin robot
        /// </summary>
        public async Task<RobotResponseDto> UpdateAsync(ulong robotId, UpdateRobotDto updateDto)
        {
            // Lấy robot hiện tại
            var existingRobot = await _robotRepository.GetByIdAsync(robotId, includeCompartments: true, includeTasks: true);
            if (existingRobot == null)
                throw new InvalidOperationException("Robot không tồn tại");

            // Không cho sửa nếu robot đang chạy nhiệm vụ
            if (existingRobot.Tasks.Any(t => t.Status is "in_progress" or "transporting"))
                throw new InvalidOperationException("Không thể cập nhật robot khi đang thực hiện nhiệm vụ");

            // Cập nhật tên (nếu có)
            if (!string.IsNullOrWhiteSpace(updateDto.Name))
                existingRobot.Name = updateDto.Name.Trim();

            // Cập nhật bản đồ (nếu có thay đổi)
            if (updateDto.MapId.HasValue)
            {
                var map = await _mapRepository.GetByIdAsync(updateDto.MapId.Value);
                if (map == null)
                    throw new InvalidOperationException($"Bản đồ với ID {updateDto.MapId.Value} không tồn tại");
                existingRobot.MapId = updateDto.MapId.Value;
            }
            else
            {
                existingRobot.MapId = null; // Bỏ gán bản đồ
            }

            // Xóa hết ngăn chứa cũ + tạo mới
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

            // Cập nhật thời gian
            existingRobot.UpdatedAt = DateTime.Now;

            // Lưu robot
            var updatedRobot = await _robotRepository.UpdateAsync(existingRobot);

            // Ghi log hành động
            var mapChange = updateDto.MapId.HasValue
                ? $"gán bản đồ '{updatedRobot.Map?.MapName}'"
                : "bỏ gán bản đồ";

            await _logRepository.CreateAsync(new Log
            {
                RobotId = robotId,
                LogType = "info",
                Message = $"Robot {updatedRobot.Code} ({updatedRobot.Name}) đã được cập nhật: tên, loại ngăn chứa và {mapChange}",
                CreatedAt = DateTime.Now
            });

            // Trả về response đầy đủ
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

        /// <summary>
        /// Lấy danh sách tất cả robot (có thể lọc theo trạng thái)
        /// </summary>
        public async Task<IEnumerable<RobotResponseDto>> GetAllAsync(string? status = null)
        {
            var robots = await _robotRepository.GetAllAsync(status);
            return _mapper.Map<IEnumerable<RobotResponseDto>>(robots);
        }

        /// <summary>
        /// Lấy chi tiết robot theo ID
        /// </summary>
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
                .Select(t => new TaskResponseDto
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

        /// <summary>
        /// Cập nhật vị trí robot
        /// </summary>
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
                    Message = $"Robot {updated.Code} vượt quá ngưỡng lỗi ({updated.ErrorCountSession} lỗi). Vị trí: {dto.Latitude},{dto.Longitude}"
                });
            }

            return _mapper.Map<RobotResponseDto>(updated);
        }

        /// <summary>
        /// ROS cập nhật trạng thái robot theo mã
        /// </summary>
        public async Task<RobotResponseDto?> UpdateStatusAsync(RobotStatusUpdateDto dto)
        {
            if (string.IsNullOrEmpty(dto.Code) || string.IsNullOrEmpty(dto.Status))
                throw new ArgumentException("Mã robot hoặc trạng thái không được để trống");

            var updated = await _robotRepository.UpdateStatusAsync(dto.Code, dto.Status);
            if (updated == null)
                throw new InvalidOperationException($"Không tìm thấy robot với mã {dto.Code}");

            await _logRepository.CreateAsync(new Log
            {
                RobotId = updated.Id,
                LogType = "info",
                Message = $"Robot {updated.Code} đã cập nhật trạng thái thành {dto.Status}",
                CreatedAt = DateTime.Now
            });

            return _mapper.Map<RobotResponseDto>(updated);
        }

        /// <summary>
        /// Admin/Doctor cập nhật trạng thái robot theo ID
        /// </summary>
        public async Task<RobotResponseDto?> UpdateStatusAsync(ulong id, UpdateStatusDto dto)
        {
            if (!ValidStatuses.Contains(dto.Status))
                throw new ArgumentException($"Trạng thái không hợp lệ: {dto.Status}. Phải là một trong: {string.Join(", ", ValidStatuses)}");

            var existing = await _robotRepository.GetByIdAsync(id);
            if (existing == null)
                throw new InvalidOperationException("Không tìm thấy robot");

            if (existing.Status == "offline")
                throw new InvalidOperationException("Không thể cập nhật trạng thái của robot offline");

            var updated = await _robotRepository.UpdateStatusAsync(id, dto.Status);
            return updated != null ? _mapper.Map<RobotResponseDto>(updated) : null;
        }

        /// <summary>
        /// Lấy danh sách robot theo bản đồ
        /// </summary>
        public async Task<IEnumerable<RobotResponseDto>> GetByMapAsync(ulong mapId)
        {
            var robots = await _robotRepository.GetAllByMapWithCompartmentsAsync(mapId);

            return robots.Select(r => new RobotResponseDto
            {
                Id = r.Id,
                Code = r.Code ?? "",
                Name = r.Name,
                Status = r.Status ?? "unknown",
                BatteryPercent = r.BatteryPercent,
                MapId = r.MapId,

                Compartments = r.RobotCompartments.Select(c => new CompartmentDto
                {
                    Id = c.Id,
                    Code = c.CompartmentCode,
                    CategoryId = c.CategoryId,
                    IsLocked = c.Status == "locked"
                }).ToList()
            });
        }

            /// <summary>
    /// Gửi lệnh bật/tắt robot xuống ROS2 qua SignalR (không ghi DB).
    /// FE sẽ chỉ đổi UI khi có ack từ ROS2 (RobotPowerStatus).
    /// </summary>
    public async Task<RobotPowerResponseDto> TogglePowerAsync(ToggleRequestDto req)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.RobotCode))
            throw new ArgumentException("robotCode không được để trống");

        if (!string.Equals(req.RobotCode, AllowedRobotCode, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Robot không được phép điều khiển");

        _desiredOn = !_desiredOn;
        var state = _desiredOn ? "on" : "off";

        var payload = new
        {
            type = "robot_power",
            robotCode = req.RobotCode,
            state,
            timestamp = DateTime.UtcNow
        };

        await _hub.Clients.All.SendAsync("ReceiveRobotPower", payload);
        _logger.LogInformation("Sent ReceiveRobotPower for {RobotCode} → {State}", req.RobotCode, state);

        // Không ghi DB ở đây; chỉ trả về cho FE biết đã gửi lệnh
        return new RobotPowerResponseDto
        {
            RobotCode = req.RobotCode,
            Power = _desiredOn,
            Status = _desiredOn ? "at_station" : "offline",
            Time = DateTime.UtcNow,
            Message = "sent"
        };
    }

    /// <summary>
    /// ROS2 báo cáo kết quả (ground truth): xác thực robot rồi GHI DB + broadcast ack.
    /// </summary>
    public async Task<RobotPowerResponseDto> ReportPowerAsync(PowerReportDto report)
    {
        if (report == null || string.IsNullOrWhiteSpace(report.RobotCode))
            throw new ArgumentException("Thiếu robotCode.");

        if (!string.Equals(report.RobotCode, AllowedRobotCode, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Robot không hợp lệ.");

        var robot = await _robotRepository.GetByCodeAsync(report.RobotCode);
        if (robot == null)
            throw new InvalidOperationException($"Robot {report.RobotCode} không tồn tại.");

        // on → at_station ; off → offline
        var newStatus = report.Power ? "at_station" : "offline";

        // Ghi DB qua repository (đảm bảo UpdatedAt cập nhật)
        var updated = await _robotRepository.UpdateStatusAsync(robot.Id, newStatus);
        if (updated == null)
            throw new InvalidOperationException("Cập nhật trạng thái thất bại.");

        var response = new RobotPowerResponseDto
        {
            RobotCode = report.RobotCode,
            Power = report.Power,
            Status = newStatus,
            Time = DateTime.UtcNow,
            Message = "ok"
        };

        // Phát ack cho FE — FE chỉ update UI khi nhận event này
        await _hub.Clients.All.SendAsync("RobotPowerStatus", response);
        _logger.LogInformation("Persisted {RobotCode} status → {Status}", report.RobotCode, newStatus);

        return response;
    }

    }
}
