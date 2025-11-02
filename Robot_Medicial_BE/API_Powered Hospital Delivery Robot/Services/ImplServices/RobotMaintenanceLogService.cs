using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class RobotMaintenanceLogService : IRobotMaintenanceLogService
    {
        private readonly IRobotMaintenanceLogRepository _repository;
        private readonly IMapper _mapper;
        private readonly IRobotRepository _robotRepository; // Validate robot

        public RobotMaintenanceLogService(IRobotMaintenanceLogRepository repository, IMapper mapper, IRobotRepository robotRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _robotRepository = robotRepository;
        }

        public async Task<RobotMaintenanceLogResponseDto> CreateAsync(RobotMaintenanceLogDto logDto)
        {
            // Validate robot exists
            var robot = await _robotRepository.GetByIdAsync(logDto.RobotId);
            if (robot == null)
            {
                throw new InvalidOperationException("Robot not found");
            }

            var log = _mapper.Map<RobotMaintenanceLog>(logDto);

            var created = await _repository.CreateAsync(log);
            return _mapper.Map<RobotMaintenanceLogResponseDto>(created);
        }

        public async Task<IEnumerable<RobotMaintenanceLogResponseDto>> GetAllAsync(ulong? robotId = null)
        {
            var logs = await _repository.GetAllAsync(robotId);
            return _mapper.Map<IEnumerable<RobotMaintenanceLogResponseDto>>(logs);
        }

        public async Task<RobotMaintenanceLogResponseDto?> GetByIdAsync(ulong id)
        {
            var log = await _repository.GetByIdAsync(id);
            return log != null ? _mapper.Map<RobotMaintenanceLogResponseDto>(log) : null;
        }
    }
}
