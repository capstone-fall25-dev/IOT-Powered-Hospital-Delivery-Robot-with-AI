using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskService
    {
        Task<IEnumerable<TaskListItemDto>> GetAllAsync(TaskFilterDto? filter);
        Task<TaskDetailDto?> GetByIdAsync(ulong id);
        Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, ulong currentUserId);
        Task<TaskResponseDto?> UpdateAsync(ulong id, UpdateTaskDto dto);
        Task<bool> DeleteAsync(ulong id);
    }
}
