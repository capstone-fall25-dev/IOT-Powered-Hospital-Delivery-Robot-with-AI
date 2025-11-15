using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPrescriptionService
    {
        Task<PrescriptionResponseDto> CreateAsync(PrescriptionCreateDto dto);
        Task<PrescriptionResponseDto?> GetByIdAsync(ulong id);
        Task<IEnumerable<PrescriptionResponseDto>> GetAllAsync(ulong? patientId, string? status);
        Task<PrescriptionResponseDto> UpdateAsync(ulong id, PrescriptionUpdateDto dto);
        Task<bool> SoftDeleteAsync(ulong id);
        Task<bool> RestoreAsync(ulong id);
    }
}
