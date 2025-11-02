using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
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

        // Enum statuses từ dump
        private readonly string[] ValidStatuses = { "transporting", "awaiting_handover", "returning_to_station", "at_station", "completed", "charging", "needs_attention", "manual_control", "offline" };

        public RobotService(IRobotRepository robotRepository, IMapper mapper, IMapRepository mapRepository
            )
        {
            _robotRepository = robotRepository;
            _mapper = mapper;
            _mapRepository = mapRepository;
        }

        public async Task<AssignMapResponseDto> AssignMapAsync(ulong robotId, ulong mapId)
        {
            var robot = await _robotRepository.GetByIdAsync(robotId, includeTasks: true);
            if (robot == null)
            {
                throw new InvalidOperationException("Robot not found");
            }

            // Không assign nếu task đang in_progress
            if (robot.Tasks.Any(t => t.Status == "in_progress" || t.Status == "transporting"))
            {
                throw new InvalidOperationException("Cannot assign map to robot with active tasks");
            }

            var map = await _mapRepository.GetByIdAsync(mapId);
            if (map == null)
            {
                throw new InvalidOperationException("Map not found");
            }

            var updatedRobot = await _robotRepository.AssignMapAsync(robotId, mapId);
            if (updatedRobot == null)
            {
                throw new InvalidOperationException("Failed to assign map");
            }

            // Tạo Log tự động 
            var log = new Log
            {
                RobotId = robotId,
                LogType = "info",
                Message = $"Robot {robot.Code} assigned to map {map.MapName}",
                CreatedAt = DateTime.UtcNow
            };

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
            {
                throw new InvalidOperationException("Robot code already exists");
            }

            if (robotDto.BatteryPercent < 0 || robotDto.BatteryPercent > 100)
            {
                throw new ArgumentException("Battery percent must be between 0 and 100");
            }

            var robot = _mapper.Map<Robot>(robotDto);
            robot.Status = "completed";
            robot.CreatedAt = DateTime.UtcNow;
            robot.UpdatedAt = DateTime.UtcNow;
            robot.LastHeartbeatAt = DateTime.UtcNow; // Default

            var created = await _robotRepository.CreateAsync(robot);
            return _mapper.Map<RobotResponseDto>(created);
        }

        public async Task<IEnumerable<RobotResponseDto>> GetAllAsync(string? status = null)
        {
            var robots = await _robotRepository.GetAllAsync(status);
            return _mapper.Map<IEnumerable<RobotResponseDto>>(robots);
        }

        public async Task<RobotResponseDto?> GetByIdAsync(ulong id)
        {
            var robot = await _robotRepository.GetByIdAsync(id, includeCompartments: true, includeTasks: true);
            return robot != null ? _mapper.Map<RobotResponseDto>(robot) : null;
        }

        public async Task<RobotResponseDto?> UpdatePositionAsync(ulong id, UpdatePositionDto positionDto)
        {
            var updated = await _robotRepository.UpdatePositionAsync(id, positionDto.Latitude, positionDto.Longitude);
            if (updated == null) return null;

            // Chức năng: Auto alert if error_count > 3 or status="failed" - UC 38: Robot Error Alert Notification (Robot Error Handling)
            if (updated.ErrorCountSession > 3 || updated.Status == "failed")
            {
              
            }

            return updated != null ? _mapper.Map<RobotResponseDto>(updated) : null;
        }

        public async Task<RobotResponseDto?> UpdateStatusAsync(ulong id, UpdateStatusDto statusDto)
        {
            if (!ValidStatuses.Contains(statusDto.Status))
            {
                throw new ArgumentException($"Invalid status: {statusDto.Status}. Must be one of: {string.Join(", ", ValidStatuses)}");
            }

            var existing = await _robotRepository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Robot not found");
            }

            if (existing.Status == "offline")
            {
                throw new InvalidOperationException("Cannot update status of offline robot");
            }

            var updated = await _robotRepository.UpdateStatusAsync(id, statusDto.Status);
            return updated != null ? _mapper.Map<RobotResponseDto>(updated) : null;
        }
    }
}
