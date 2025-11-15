using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPrescriptionItemService
    {
        Task<PrescriptionItemResponseDto> CreateAsync(PrescriptionItemCreateDto dto);
        Task<PrescriptionItemResponseDto?> UpdateAsync(ulong id, PrescriptionItemUpdateDto dto);
        Task<bool> DeleteAsync(ulong id);
    }
}