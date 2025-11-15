using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IMedicineRepository
    {
        Task<IEnumerable<Medicine>> GetAllAsync();
        Task<Medicine?> GetByIdAsync(ulong id);
        Task<Medicine?> GetByCodeAsync(string code);
        Task<Medicine> CreateAsync(Medicine medicine);
        Task<Medicine?> UpdateAsync(ulong id, Medicine updated);
        Task<bool> DeleteAsync(ulong id);
    }
}
