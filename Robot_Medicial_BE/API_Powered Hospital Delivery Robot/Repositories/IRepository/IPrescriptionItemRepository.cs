using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPrescriptionItemRepository
    {
        Task<PrescriptionItem?> GetByIdAsync(ulong id);
        Task<IEnumerable<PrescriptionItem>> GetByPrescriptionAsync(ulong prescriptionId);

        Task<PrescriptionItem> CreateAsync(PrescriptionItem item);
        Task<PrescriptionItem?> UpdateAsync(PrescriptionItem item);
        Task<bool> DeleteAsync(ulong id);
    }
}
