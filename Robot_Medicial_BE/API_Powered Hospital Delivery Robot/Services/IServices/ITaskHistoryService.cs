using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskHistoryService
    {
        // Tạo lịch sử nhiệm vụ từ một nhiệm vụ hiện có
        System.Threading.Tasks.Task CreateHistoryFromTaskAsync(Models.Entities.Task task, string? note = null);
        
        // Lấy lịch sử nhiệm vụ theo các tiêu chí lọc
        Task<PagedTaskHistoryDto> GetHistoryAsync(TaskHistoryFilterDto filter);
        
        // Lấy bản ghi lịch sử gần nhất của một nhiệm vụ
        Task<TaskHistory?> GetLastHistoryAsync(ulong taskId);
        
        // Lấy chi tiết một bản ghi lịch sử nhiệm vụ theo ID
        Task<TaskHistoryResponseDto?> GetDetailAsync(ulong historyId);
    }
}
