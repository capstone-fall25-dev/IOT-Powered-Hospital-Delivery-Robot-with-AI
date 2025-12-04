using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý nhật ký bảo trì robot
    /// </summary>
    public class RobotMaintenanceLogService : IRobotMaintenanceLogService
    {
        private readonly IRobotMaintenanceLogRepository _repository;
        private readonly IMapper _mapper;
        private readonly IRobotRepository _robotRepository;

        public RobotMaintenanceLogService(IRobotMaintenanceLogRepository repository, IMapper mapper, IRobotRepository robotRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _robotRepository = robotRepository;
        }

        /// <summary>
        /// Tạo nhật ký bảo trì mới
        /// </summary>
        public async Task<RobotMaintenanceLogResponseDto> CreateAsync(RobotMaintenanceLogDto logDto)
        {
            // Kiểm tra robot tồn tại
            var robot = await _robotRepository.GetByIdAsync(logDto.RobotId);
            if (robot == null)
            {
                throw new InvalidOperationException("Không tìm thấy robot");
            }

            var log = _mapper.Map<RobotMaintenanceLog>(logDto);

            var created = await _repository.CreateAsync(log);
            return _mapper.Map<RobotMaintenanceLogResponseDto>(created);
        }

        /// <summary>
        /// Lấy danh sách nhật ký bảo trì (có thể lọc theo robot)
        /// </summary>
        public async Task<IEnumerable<RobotMaintenanceLogResponseDto>> GetAllAsync(ulong? robotId = null)
        {
            var logs = await _repository.GetAllAsync(robotId);
            return _mapper.Map<IEnumerable<RobotMaintenanceLogResponseDto>>(logs);
        }

        /// <summary>
        /// Lấy chi tiết nhật ký bảo trì theo ID
        /// </summary>
        public async Task<RobotMaintenanceLogResponseDto?> GetByIdAsync(ulong id)
        {
            var log = await _repository.GetByIdAsync(id);
            return log != null ? _mapper.Map<RobotMaintenanceLogResponseDto>(log) : null;
        }
    }
}
