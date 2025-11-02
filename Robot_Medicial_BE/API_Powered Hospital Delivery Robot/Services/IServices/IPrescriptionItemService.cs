using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPrescriptionItemService
    {
        Task<IEnumerable<PrescriptionItemResponseDto>> GetAllAsync(ulong? prescriptionId = null, ulong? medicineId = null);
        Task<PrescriptionItemResponseDto?> GetByIdAsync(ulong id);
        Task<PrescriptionItemResponseDto> CreateAsync(PrescriptionItemDto itemDto);
        Task<PrescriptionItemResponseDto?> UpdateAsync(ulong id, PrescriptionItemDto itemDto);
        Task<ReportDamagedMedicineResponseDto> ReportDamagedAsync(ulong id, ReportDamagedMedicineDto damagedDto);
    }
}