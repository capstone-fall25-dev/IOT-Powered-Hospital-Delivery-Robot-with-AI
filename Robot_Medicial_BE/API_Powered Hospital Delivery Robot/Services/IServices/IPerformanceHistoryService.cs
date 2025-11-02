using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPerformanceHistoryService
    {
        Task<IEnumerable<PerformanceHistoryResponseDto>> GetAllAsync(ulong? robotId = null);
        Task<PerformanceHistoryResponseDto?> GetByIdAsync(ulong id);
        Task<PerformanceHistoryResponseDto> CreateAsync(PerformanceHistoryDto historyDto); // Thủ công, hoặc tự động từ Task
    }
}
