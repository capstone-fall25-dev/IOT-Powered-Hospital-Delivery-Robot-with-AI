using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.EntityFrameworkCore.Storage;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ITaskRepository
    {
        // List nhẹ dành cho TaskListItemDto
        Task<IEnumerable<Models.Entities.Task>> GetListAsync(TaskFilterDto? filter);

        // Detail đầy đủ
        Task<Models.Entities.Task?> GetByIdAsync(ulong id);

        Task<Models.Entities.Task> CreateAsync(Models.Entities.Task task);
        Task<Models.Entities.Task?> UpdateAsync(ulong id, Models.Entities.Task task);
        Task<bool> DeleteAsync(ulong id);

        Task<TaskStop> CreateStopAsync(TaskStop stop);
        Task<CompartmentAssignment> CreateAssignmentAsync(CompartmentAssignment assignment);

        // Helpers
        Task<Robot?> GetRobotAsync(ulong id);
        Task<Map?> GetMapAsync(ulong id);
        Task<RobotCompartment?> GetCompartmentAsync(ulong id);
        Task<bool> IsCompartmentBusyAsync(ulong id);

        Task<Prescription?> GetLatestPrescriptionForPatientAsync(ulong patientId);
        Task<Prescription?> GetPrescriptionByCodeAsync(string code);

        System.Threading.Tasks.Task UpdateRobotStatusAsync(ulong robotId, string status);

        Task<IDbContextTransaction> BeginTransactionAsync();

        Task<int> SaveChangesAsync();
    }
}
