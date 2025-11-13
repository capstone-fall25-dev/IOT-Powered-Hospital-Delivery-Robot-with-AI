using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotCompartmentRepository
    {
        Task<RobotCompartment?> GetByIdAsync(ulong id);
        Task<RobotCompartment?> UpdateStatusAsync(ulong id, string status);
        Task<IEnumerable<RobotCompartment>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId);
        Task<IEnumerable<RobotCompartment>> GetByRobotAsync(ulong robotId);
    }
}