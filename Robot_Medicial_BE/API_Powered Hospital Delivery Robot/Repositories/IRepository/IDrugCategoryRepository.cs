using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IDrugCategoryRepository
    {
        // Lấy danh sách tất cả danh mục thuốc
        Task<IEnumerable<DrugCategory>> GetAllAsync();

        // Lấy danh mục thuốc theo ID
        Task<DrugCategory?> GetByIdAsync(ulong id);

        // Lấy danh mục thuốc theo tên (dùng để kiểm tra trùng)
        Task<DrugCategory?> GetByNameAsync(string name);

        // Tạo mới danh mục thuốc
        Task<DrugCategory> CreateAsync(DrugCategory cat);

        // Cập nhật danh mục thuốc theo ID
        Task<DrugCategory?> UpdateAsync(ulong id, DrugCategory cat);

        // Xóa danh mục thuốc theo ID
        Task<bool> DeleteAsync(ulong id);
    }
}