using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Task = System.Threading.Tasks.Task;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllAsync(bool? isActive = null);
        Task<User?> GetByIdAsync(ulong id, bool includeTasks = false, bool includeSessions = false); // Param để include relations
        Task<User?> GetByEmailAsync(string email);
        Task<User> CreateAsync(User user);
        Task<User?> UpdateAsync(ulong id, User user);

        Task<bool> ExistsByUsernameAsync(string username);
        Task AddUserAsync(User user);
        Task UpdateUserAsync(User user);
    }
}
