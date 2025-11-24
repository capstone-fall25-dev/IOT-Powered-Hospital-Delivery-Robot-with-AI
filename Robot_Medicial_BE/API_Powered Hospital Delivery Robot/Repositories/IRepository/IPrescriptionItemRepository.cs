using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPrescriptionItemRepository
    {
        // Lấy một mục thuốc theo ID
        Task<PrescriptionItem?> GetByIdAsync(ulong id);

        // Lấy tất cả mục thuốc thuộc một đơn thuốc
        Task<IEnumerable<PrescriptionItem>> GetByPrescriptionAsync(ulong prescriptionId);

        // Tạo mới một mục thuốc
        Task<PrescriptionItem> CreateAsync(PrescriptionItem item);

        // Cập nhật thông tin mục thuốc
        Task<PrescriptionItem?> UpdateAsync(PrescriptionItem item);

        // Xóa một mục thuốc theo ID
        Task<bool> DeleteAsync(ulong id);
    }
}