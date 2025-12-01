using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskHistoryService
    {
        System.Threading.Tasks.Task CreateHistoryFromTaskAsync(Models.Entities.Task task);
        Task<PagedTaskHistoryDto> GetHistoryAsync(TaskHistoryFilterDto filter);
        Task<TaskHistory?> GetLastHistoryAsync(ulong taskId);
        Task<TaskHistoryResponseDto?> GetDetailAsync(ulong historyId);
    }
}
