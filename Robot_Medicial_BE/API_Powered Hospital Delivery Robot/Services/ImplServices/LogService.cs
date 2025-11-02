using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class LogService : ILogService
    {
        private readonly ILogRepository _repository;
        private readonly IMapper _mapper;

        public LogService(ILogRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<LogResponseDto> CreateAsync(LogDto logDto)
        {
            var log = _mapper.Map<Log>(logDto);
            log.CreatedAt = DateTime.UtcNow;

            var created = await _repository.CreateAsync(log);
            return _mapper.Map<LogResponseDto>(created);
        }

        public async Task<IEnumerable<LogResponseDto>> GetAllAsync(ulong? robotId = null, ulong? taskId = null, string? logType = null)
        {
            var logs = await _repository.GetAllAsync(robotId, taskId, logType);
            return _mapper.Map<IEnumerable<LogResponseDto>>(logs);
        }

        public async Task<LogResponseDto?> GetByIdAsync(ulong id)
        {
            var log = await _repository.GetByIdAsync(id);
            return log != null ? _mapper.Map<LogResponseDto>(log) : null;
        }
    }
}
