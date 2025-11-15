using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotCompartmentRepository
    {
        Task<RobotCompartment?> GetByIdAsync(ulong id);

        System.Threading.Tasks.Task CreateManyAsync(IEnumerable<RobotCompartment> compartments);
        Task<RobotCompartment?> UpdateStatusAsync(ulong id, string status);
        Task<IEnumerable<RobotCompartment>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId);
        Task<IEnumerable<RobotCompartment>> GetByRobotAsync(ulong robotId);
        public System.Threading.Tasks.Task AssignPatientToCompartment(ulong compartmentId, ulong patientId);
        Task<bool> AssignCategoryToCompartment(ulong compId, ulong categoryId);
        Task<IEnumerable<RobotCompartment>> GetFilteredByRobotAsync(ulong robotId, ulong? categoryId);
    }
}