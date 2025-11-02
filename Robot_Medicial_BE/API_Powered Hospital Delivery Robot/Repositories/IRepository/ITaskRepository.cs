using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ITaskRepository
    {
        Task<IEnumerable<Models.Entities.Task>> GetAllAsync(string? priority = null);
        Task<Models.Entities.Task?> GetByIdAsync(ulong id);
        Task<IEnumerable<Models.Entities.Task>> GetByAssignedByAsync(ulong assignedById); 
        Task<Models.Entities.Task> CreateAsync(Models.Entities.Task task);
        Task<Models.Entities.Task?> UpdateAsync(ulong id, Models.Entities.Task task);
        Task<bool> CancelAsync(ulong id);
        Task<IEnumerable<TaskStop>> GetTaskStopsByTaskIdAsync(ulong taskId);
        Task<TaskStop> CreateTaskStopAsync(TaskStop taskStop);
        Task<Models.Entities.Task?> UpdateTaskProgressAsync(ulong taskId, int seqNo, string stopStatus, int? durationS = null);
        Task<Models.Entities.Task?> UpdatePriorityAsync(ulong id, string priority);
        Task<IEnumerable<Models.Entities.Task>> GetPendingForSchedulingAsync(DateTime? fromDate = null);
        Task<IEnumerable<TaskReportDto>> GetTaskReportAsync(ulong? robotId = null, DateTime? startDate = null, DateTime? endDate = null);
    }
}
