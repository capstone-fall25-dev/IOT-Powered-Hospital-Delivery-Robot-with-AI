using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPrescriptionItemRepository
    {
        Task<IEnumerable<PrescriptionItem>> GetAllAsync(ulong? prescriptionId = null, ulong? medicineId = null);
        Task<PrescriptionItem?> GetByIdAsync(ulong id);
        Task<PrescriptionItem> CreateAsync(PrescriptionItem item);
        Task<PrescriptionItem?> UpdateAsync(ulong id, PrescriptionItem item);
        Task<bool> ReportDamagedAsync(ulong id, string reason, string? description);
    }
}
