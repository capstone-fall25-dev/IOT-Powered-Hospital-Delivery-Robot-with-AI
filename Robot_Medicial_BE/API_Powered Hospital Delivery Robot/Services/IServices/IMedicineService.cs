using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IMedicineService
    {
        Task<IEnumerable<MedicineResponseDto>> GetAllAsync(ulong? categoryId = null, MedicineStatus? status = null);
        Task<MedicineResponseDto?> GetByIdAsync(ulong id);
        Task<MedicineResponseDto> CreateAsync(MedicineDto medicineDto);
        Task<MedicineResponseDto?> UpdateAsync(ulong id, MedicineDto medicineDto);
        Task<ScanExpiredResponseDto> ScanExpiredAsync(bool flagOnly = true);
        Task<int> RemoveExpiredAsync();
        Task<IEnumerable<MedicineStockReportDto>> GetStockReportAsync(int threshold = 10);
    }
}
