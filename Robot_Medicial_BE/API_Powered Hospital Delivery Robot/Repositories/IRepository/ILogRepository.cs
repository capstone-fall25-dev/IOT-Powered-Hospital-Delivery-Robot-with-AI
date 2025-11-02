using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ILogRepository
    {
        Task<IEnumerable<Log>> GetAllAsync(ulong? robotId = null, ulong? taskId = null, string? logType = null);
        Task<Log?> GetByIdAsync(ulong id);
        Task<Log> CreateAsync(Log log);
    }
}
