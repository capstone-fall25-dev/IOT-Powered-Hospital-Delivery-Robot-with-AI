using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ITaskHistoryRepository
    {
        System.Threading.Tasks.Task AddAsync(TaskHistory history);
        Task<List<TaskHistory>> GetHistoryAsync(TaskHistoryFilterDto filter);
        Task<int> GetHistoryCountAsync(TaskHistoryFilterDto filter);
        Task<TaskHistory?> GetByTaskIdAsync(ulong taskId);
        Task<TaskHistory?> GetLastHistoryAsync(ulong taskId);
    }
}
