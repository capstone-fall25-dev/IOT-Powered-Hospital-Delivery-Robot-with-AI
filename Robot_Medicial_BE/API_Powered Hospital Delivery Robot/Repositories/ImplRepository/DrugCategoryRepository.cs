using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class DrugCategoryRepository : IDrugCategoryRepository
    {
        private readonly RobotManagerContext _context;

        public DrugCategoryRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<DrugCategory> CreateAsync(DrugCategory category)
        {
            _context.DrugCategories.Add(category);
            await _context.SaveChangesAsync();
            return category;
        }

        public async Task<IEnumerable<DrugCategory>> GetAllAsync()
        {
            return await _context.DrugCategories.ToListAsync();
        }

        public async Task<DrugCategory?> GetByIdAsync(ulong id)
        {
            return await _context.DrugCategories.FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<DrugCategory?> GetByNameAsync(string name)
        {
            return await _context.DrugCategories.FirstOrDefaultAsync(c => c.Name == name);
        }

        public async Task<DrugCategory?> UpdateAsync(ulong id, DrugCategory category)
        {
            var existing = await _context.DrugCategories.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.Name = category.Name;

            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
