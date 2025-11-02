using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPrescriptionService
    {
        Task<IEnumerable<PrescriptionResponseDto>> GetAllAsync(ulong? patientId = null, string? status = null);
        Task<PrescriptionResponseDto?> GetByIdAsync(ulong id);
        Task<PrescriptionResponseDto> CreateAsync(PrescriptionDto prescriptionDto, ulong currentUserId);
        Task<PrescriptionResponseDto?> UpdateStatusAsync(ulong id, string status);
        Task<PrescriptionItemResponseDto> AddItemAsync(ulong prescriptionId, PrescriptionItemDto itemDto);
        Task<AssignPrescriptionResponseDto> AssignToTaskAsync(ulong prescriptionId, ulong taskId); 
    }
}
