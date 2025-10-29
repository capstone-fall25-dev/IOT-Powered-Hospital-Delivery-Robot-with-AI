using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Task = System.Threading.Tasks.Task;
namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllAsync(bool? isActive = null); // Có thể filter theo IsActive
        Task<User?> GetByIdAsync(ulong id);
        Task<User?> GetByUsernameAsync(string username); // Để check unique
        Task<User> CreateAsync(User user);
        Task<User?> UpdateAsync(ulong id, User user);

        Task<bool> ExistsByUsernameAsync(string username);
        Task AddUserAsync(User user);
        Task UpdateUserAsync(User user);
    }
}
