using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class RobotService : IRobotService
    {
        private readonly IRobotRepository _repository;
        private readonly IMapper _mapper;

        // Enum status cho validate
        private readonly string[] ValidStatuses = { "transporting", "awaiting_handover", "returning_to_station", "at_station", "completed", "charging", "needs_attention", "manual_control", "offline" };

        public RobotService(IRobotRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<RobotResponseDto> CreateAsync(RobotDto robotDto)
        {
            // Check code là duy nhất
            var existing = await _repository.GetByCodeAsync(robotDto.Code);
            if (existing != null)
            {
                throw new InvalidOperationException("Robot code đã tồn tại");
            }

            if (robotDto.BatteryPercent < 0 || robotDto.BatteryPercent > 100)
            {
                throw new ArgumentException("Phần trăm pin phải từ 0 đến 100");
            }

            var robot = _mapper.Map<Robot>(robotDto);
            robot.Status = "at_station";
            robot.CreatedAt = DateTime.Now;
            robot.LastHeartbeatAt = DateTime.Now; // Default

            var created = await _repository.CreateAsync(robot);
            return _mapper.Map<RobotResponseDto>(created);
        }

        public async Task<IEnumerable<RobotResponseDto>> GetAllAsync(string? status = null)
        {
            var robots = await _repository.GetAllAsync(status);
            return _mapper.Map<IEnumerable<RobotResponseDto>>(robots);
        }

        public async Task<RobotResponseDto> GetByIdAsync(ulong id)
        {
            var robot = await _repository.GetByIdAsync(id);

            if (robot != null)
            {
                return _mapper.Map<RobotResponseDto>(robot);
            }
            return null;
        }

        public async Task<RobotResponseDto> UpdateStatusAsync(ulong id, UpdateStatusDto statusDto)
        {
            // Validate status enum
            if (!ValidStatuses.Contains(statusDto.Status))
            {
                throw new ArgumentException($"Trạng thái: {statusDto.Status} không hợp lệ. Phải là một trong các trạng thái sau: {string.Join(", ", ValidStatuses)}");
            }

            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Không tìm thấy robot");
            }

            // Không update nếu offline
            if (existing.Status == "offline")
            {
                throw new InvalidOperationException("Không thể cập nhật trạng thái của robot khi ngoại tuyến");
            }

            var updated = await _repository.UpdateStatusAsync(id, statusDto.Status);
            if (updated != null)
            {
                return _mapper.Map<RobotResponseDto>(updated);
            }
            return null;
        }

        public async Task<RobotResponseDto> UpdateLocationAsync(ulong id, UpdateLocationDto locationDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Không tìm thấy robot");
            }

            // Business logic: Validate latitude/longitude (ví dụ: trong khoảng hợp lý)
            if (locationDto.Latitude < -90 || locationDto.Latitude > 90)
            {
                throw new ArgumentException("Vĩ độ phải từ -90 đến 90");
            }
            if (locationDto.Longitude < -180 || locationDto.Longitude > 180)
            {
                throw new ArgumentException("Kinh độ phải từ -180 đến 180");
            }

            // Update location và timestamp
            existing.Latitude = locationDto.Latitude;
            existing.Longitude = locationDto.Longitude;
            existing.UpdatedAt = DateTime.Now;
            existing.LastHeartbeatAt = DateTime.Now; 

            var updated = await _repository.UpdateAsync(id, existing); 
            return _mapper.Map<RobotResponseDto>(updated);
        }
    }
}
