using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPerformanceHistoryRepository
    {
        Task<IEnumerable<PerformanceHistory>> GetAllAsync(ulong? robotId = null);
        Task<PerformanceHistory?> GetByIdAsync(ulong id);
        Task<PerformanceHistory> CreateAsync(PerformanceHistory history);
    }
}
