using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPerformanceHistoryRepository
    {
        // Lấy danh sách lịch sử hiệu suất (có thể lọc theo robotId)
        Task<IEnumerable<PerformanceHistory>> GetAllAsync(ulong? robotId = null);

        // Lấy một bản ghi hiệu suất theo ID
        Task<PerformanceHistory?> GetByIdAsync(ulong id);

        // Tạo mới bản ghi lịch sử hiệu suất
        Task<PerformanceHistory> CreateAsync(PerformanceHistory history);
    }
}