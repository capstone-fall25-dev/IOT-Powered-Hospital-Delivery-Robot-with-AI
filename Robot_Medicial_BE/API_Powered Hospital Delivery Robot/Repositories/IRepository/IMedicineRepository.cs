using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IMedicineRepository
    {
        // Lấy danh sách tất cả các loại thuốc
        Task<IEnumerable<Medicine>> GetAllAsync();

        // Lấy thông tin thuốc theo ID
        Task<Medicine?> GetByIdAsync(ulong id);

        // Lấy thông tin thuốc theo mã thuốc
        Task<Medicine?> GetByCodeAsync(string code);

        // Tạo mới một loại thuốc
        Task<Medicine> CreateAsync(Medicine medicine);

        // Cập nhật thông tin thuốc theo ID
        Task<Medicine?> UpdateAsync(ulong id, Medicine updated);

        // Xóa thuốc theo ID
        Task<bool> DeleteAsync(ulong id);
    }
}