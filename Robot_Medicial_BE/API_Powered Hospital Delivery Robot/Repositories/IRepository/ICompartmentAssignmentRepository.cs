using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ICompartmentAssignmentRepository
    {
        Task<IEnumerable<CompartmentAssignment>> GetAllAsync(ulong? taskId = null, string? status = null);
        Task<CompartmentAssignment?> GetByIdAsync(ulong id);
        Task<CompartmentAssignment> CreateAsync(CompartmentAssignment assignment);
        Task<CompartmentAssignment?> UpdateAsync(ulong id, CompartmentAssignment assignment);
        Task<CompartmentAssignment?> UpdateLoadStatusAsync(ulong id, string itemDesc);
    }
}
