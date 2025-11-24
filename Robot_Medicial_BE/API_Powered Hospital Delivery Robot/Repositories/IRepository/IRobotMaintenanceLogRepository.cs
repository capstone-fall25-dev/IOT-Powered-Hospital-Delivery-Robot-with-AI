using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotMaintenanceLogRepository
    {
        // Lấy danh sách nhật ký bảo trì (có thể lọc theo robotId)
        Task<IEnumerable<RobotMaintenanceLog>> GetAllAsync(ulong? robotId = null);

        // Lấy một bản ghi bảo trì theo ID
        Task<RobotMaintenanceLog?> GetByIdAsync(ulong id);

        // Tạo mới bản ghi bảo trì
        Task<RobotMaintenanceLog> CreateAsync(RobotMaintenanceLog log);
    }
}