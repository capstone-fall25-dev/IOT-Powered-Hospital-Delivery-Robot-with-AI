using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotMaintenanceLogRepository
    {
        Task<IEnumerable<RobotMaintenanceLog>> GetAllAsync(ulong? robotId = null);
        Task<RobotMaintenanceLog?> GetByIdAsync(ulong id);
        Task<RobotMaintenanceLog> CreateAsync(RobotMaintenanceLog log);
    }
}
