using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Task = System.Threading.Tasks.Task;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IUserRepository
    {
        // Lấy danh sách tất cả user
        Task<IEnumerable<User>> GetAllAsync(bool? isActive = null);

        // Lấy user theo ID (có thể include Tasks và Sessions)
        Task<User?> GetByIdAsync(ulong id, bool includeTasks = false, bool includeSessions = false);

        // Tìm user theo email
        Task<User?> GetByEmailAsync(string email);

        // Tạo user mới
        Task<User> CreateAsync(User user);

        // Cập nhật user theo ID
        Task<User?> UpdateAsync(ulong id, User user);

        // Kiểm tra username đã tồn tại chưa
        Task<bool> ExistsByUsernameAsync(string username);

        // Thêm user mới (dạng void)
        Task AddUserAsync(User user);

        // Cập nhật user (truyền trực tiếp entity)
        Task UpdateUserAsync(User user);
    }
}