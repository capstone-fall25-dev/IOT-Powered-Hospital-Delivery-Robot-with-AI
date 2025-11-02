using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ICompartmentAssignmentService
    {
        Task<IEnumerable<CompartmentAssignmentResponseDto>> GetAllAsync(ulong? taskId = null, string? status = null);
        Task<CompartmentAssignmentResponseDto?> GetByIdAsync(ulong id);
        Task<CompartmentAssignmentResponseDto> CreateAsync(CompartmentAssignmentDto assignmentDto);
        Task<CompartmentAssignmentResponseDto?> UpdateAsync(ulong id, CompartmentAssignmentDto assignmentDto);
        Task<CompartmentAssignmentResponseDto?> LoadAsync(ulong id, LoadCompartmentDto loadDto);
        Task<IEnumerable<CompartmentAssignmentResponseDto>> BulkLoadForTaskAsync(ulong taskId, List<LoadCompartmentDto> loadDtos);
    }
}
