using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskService
    {
        Task<IEnumerable<TaskResponseDto>> GetAllAsync(string? priority = null);
        Task<TaskResponseDto?> GetByIdAsync(ulong id);
        Task<IEnumerable<TaskResponseDto>> GetByAssignedByAsync(ulong assignedById);
        Task<TaskResponseDto> CreateAsync(CreateTaskDto1 createTaskDto, ulong currentUserId);
        Task<TaskResponseDto?> UpdateAsync(ulong id, TaskDto taskDto);
        Task<bool> DeleteAsync(ulong id);
        Task<TaskResponseDto> SubmitAsync(ulong id, SubmitTaskDto submitDto, ulong currentUserId, string currentUsername);
        Task<TaskResponseDto> ConfirmAsync(ulong id, ulong adminUserId, string adminUsername);
        Task<TaskResponseDto> UpdateTaskProgressAsync(ulong taskId, UpdateProgressDto progressDto);
        Task<TaskResponseDto?> SetPriorityAsync(ulong id, TaskPriorityDto priorityDto);
        Task<int> SchedulePendingTasksAsync();
        Task<IEnumerable<TaskReportDto>> GetTaskReportAsync(ulong? robotId = null, DateTime? startDate = null, DateTime? endDate = null);
    }
}
