using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ILogRepository
    {
        // Lấy danh sách log, có thể lọc theo robot, task hoặc loại log
        Task<IEnumerable<Log>> GetAllAsync(
            ulong? robotId = null,
            ulong? taskId = null,
            string? logType = null);

        // Lấy một bản ghi log theo ID
        Task<Log?> GetByIdAsync(ulong id);

        // Tạo mới một bản ghi log
        Task<Log> CreateAsync(Log log);
    }
}