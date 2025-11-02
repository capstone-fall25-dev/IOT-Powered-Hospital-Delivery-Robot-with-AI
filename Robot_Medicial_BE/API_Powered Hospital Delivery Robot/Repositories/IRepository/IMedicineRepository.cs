using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IMedicineRepository
    {
        Task<IEnumerable<Medicine>> GetAllAsync(ulong? categoryId = null, MedicineStatus? status = null);
        Task<Medicine?> GetByIdAsync(ulong id);
        Task<Medicine?> GetByCodeAsync(string medicineCode);
        Task<Medicine> CreateAsync(Medicine medicine);
        Task<Medicine?> UpdateAsync(ulong id, Medicine medicine);
        Task<ScanExpiredResponseDto> ScanAndFlagExpiredAsync(bool flagOnly = true); 
        Task<int> RemoveExpiredAsync();
        Task<IEnumerable<MedicineStockReportDto>> GetStockReportAsync(int threshold = 10);
    }
}
