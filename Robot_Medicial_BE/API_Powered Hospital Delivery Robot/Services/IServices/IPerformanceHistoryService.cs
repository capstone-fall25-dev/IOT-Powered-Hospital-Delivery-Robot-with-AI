using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPerformanceHistoryService
    {
        // Lấy danh sách lịch sử hiệu suất, có thể lọc theo robot
        Task<IEnumerable<PerformanceHistoryResponseDto>> GetAllAsync(ulong? robotId = null);

        // Lấy một bản ghi hiệu suất theo ID
        Task<PerformanceHistoryResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới bản ghi lịch sử hiệu suất (thủ công hoặc tự động sau mỗi task)
        Task<PerformanceHistoryResponseDto> CreateAsync(PerformanceHistoryDto historyDto);
    }
}