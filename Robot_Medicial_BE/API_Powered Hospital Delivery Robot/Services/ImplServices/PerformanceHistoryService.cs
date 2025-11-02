using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class PerformanceHistoryService : IPerformanceHistoryService
    {
        private readonly IPerformanceHistoryRepository _repository;
        private readonly IMapper _mapper;
        private readonly IRobotRepository _robotRepository;

        public PerformanceHistoryService(IPerformanceHistoryRepository repository, IMapper mapper, IRobotRepository robotRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _robotRepository = robotRepository;
        }

        public async Task<PerformanceHistoryResponseDto> CreateAsync(PerformanceHistoryDto historyDto)
        {
            var robot = await _robotRepository.GetByIdAsync(historyDto.RobotId);
            if (robot == null)
            {
                throw new InvalidOperationException("Robot not found");
            }

            var history = _mapper.Map<PerformanceHistory>(historyDto);
            history.CreatedAt = DateTime.UtcNow;
            history.CompletionDate = DateTime.UtcNow; // Default

            var created = await _repository.CreateAsync(history);
            return _mapper.Map<PerformanceHistoryResponseDto>(created);
        }

        public async Task<IEnumerable<PerformanceHistoryResponseDto>> GetAllAsync(ulong? robotId = null)
        {
            var histories = await _repository.GetAllAsync(robotId);
            return _mapper.Map<IEnumerable<PerformanceHistoryResponseDto>>(histories);
        }

        public async Task<PerformanceHistoryResponseDto?> GetByIdAsync(ulong id)
        {
            var history = await _repository.GetByIdAsync(id);
            return history != null ? _mapper.Map<PerformanceHistoryResponseDto>(history) : null;
        }
    }
}
