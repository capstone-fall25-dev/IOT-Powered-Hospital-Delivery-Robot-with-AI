using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IDrugCategoryRepository
    {
        Task<IEnumerable<DrugCategory>> GetAllAsync();
        Task<DrugCategory?> GetByIdAsync(ulong id);
        Task<DrugCategory?> GetByNameAsync(string name);
        Task<DrugCategory> CreateAsync(DrugCategory category);
        Task<DrugCategory?> UpdateAsync(ulong id, DrugCategory category);
    }
}
