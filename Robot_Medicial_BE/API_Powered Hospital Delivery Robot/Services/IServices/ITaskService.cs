using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskService
    {
        Task<IEnumerable<TaskResponseDto>> GetAllAsync();
        Task<TaskResponseDto?> GetByIdAsync(ulong id);
        Task<IEnumerable<TaskResponseDto>> GetByAssignedByAsync(ulong assignedById);
        Task<TaskResponseDto> CreateAsync(TaskDto taskDto);
        Task<TaskResponseDto?> UpdateAsync(ulong id, TaskDto taskDto);
        Task<bool> DeleteAsync(ulong id);
    }
}
