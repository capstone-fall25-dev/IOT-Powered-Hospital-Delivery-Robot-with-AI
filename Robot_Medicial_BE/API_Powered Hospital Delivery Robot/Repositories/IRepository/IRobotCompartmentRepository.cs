using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotCompartmentRepository
    {
        Task<RobotCompartment?> GetByIdAsync(ulong id); // For test/view
        Task<RobotCompartment?> UpdateStatusAsync(ulong id, string status); // UC 38: Open/Close
    }
}