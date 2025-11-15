using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class DrugCategoryRepository : IDrugCategoryRepository
    {
        private readonly RobotManagerContext _ctx;

        public DrugCategoryRepository(RobotManagerContext ctx)
        {
            _ctx = ctx;
        }

        public async Task<IEnumerable<DrugCategory>> GetAllAsync()
            => await _ctx.DrugCategories.ToListAsync();

        public async Task<DrugCategory?> GetByIdAsync(ulong id)
            => await _ctx.DrugCategories.FindAsync(id);

        public async Task<DrugCategory?> GetByNameAsync(string name)
            => await _ctx.DrugCategories.FirstOrDefaultAsync(c => c.Name == name);

        public async Task<DrugCategory> CreateAsync(DrugCategory cat)
        {
            _ctx.DrugCategories.Add(cat);
            await _ctx.SaveChangesAsync();
            return cat;
        }

        public async Task<DrugCategory?> UpdateAsync(ulong id, DrugCategory cat)
        {
            var existing = await _ctx.DrugCategories.FindAsync(id);
            if (existing == null) return null;

            existing.Name = cat.Name;
            await _ctx.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteAsync(ulong id)
        {
            var category = await _ctx.DrugCategories
                .Include(c => c.Medicines)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                throw new InvalidOperationException("Category not found");

            if (category.Medicines.Any())
                throw new InvalidOperationException("Cannot delete category because it is being used by medicines.");

            _ctx.DrugCategories.Remove(category);
            await _ctx.SaveChangesAsync();
            return true;
        }
    }
}
