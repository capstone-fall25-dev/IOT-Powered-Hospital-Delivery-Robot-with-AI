using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý danh mục thuốc
    /// </summary>
    public class DrugCategoryRepository : IDrugCategoryRepository
    {
        private readonly RobotManagerContext _ctx;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public DrugCategoryRepository(RobotManagerContext ctx)
        {
            _ctx = ctx;
        }

        /// <summary>
        /// Lấy danh sách tất cả danh mục thuốc
        /// </summary>
        public async Task<IEnumerable<DrugCategory>> GetAllAsync()
            => await _ctx.DrugCategories.ToListAsync();

        /// <summary>
        /// Lấy danh mục thuốc theo ID
        /// </summary>
        public async Task<DrugCategory?> GetByIdAsync(ulong id)
            => await _ctx.DrugCategories.FindAsync(id);

        /// <summary>
        /// Lấy danh mục thuốc theo tên
        /// </summary>
        public async Task<DrugCategory?> GetByNameAsync(string name)
            => await _ctx.DrugCategories.FirstOrDefaultAsync(c => c.Name == name);

        /// <summary>
        /// Tạo mới danh mục thuốc
        /// </summary>
        public async Task<DrugCategory> CreateAsync(DrugCategory cat)
        {
            _ctx.DrugCategories.Add(cat);
            await _ctx.SaveChangesAsync();
            return cat;
        }

        /// <summary>
        /// Cập nhật danh mục thuốc theo ID
        /// </summary>
        public async Task<DrugCategory?> UpdateAsync(ulong id, DrugCategory cat)
        {
            var existing = await _ctx.DrugCategories.FindAsync(id);
            if (existing == null) return null;

            existing.Name = cat.Name;
            await _ctx.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Xóa danh mục thuốc theo ID (chỉ khi không còn thuốc sử dụng)
        /// </summary>
        public async Task<bool> DeleteAsync(ulong id)
        {
            var category = await _ctx.DrugCategories
                .Include(c => c.Medicines)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                throw new InvalidOperationException("Không tìm thấy danh mục thuốc.");

            if (category.Medicines.Any())
                throw new InvalidOperationException("Không thể xóa danh mục vì đang được sử dụng bởi thuốc.");

            _ctx.DrugCategories.Remove(category);
            await _ctx.SaveChangesAsync();
            return true;
        }
    }
}
