using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý dữ liệu nhân viên và session
    /// </summary>
    public class UserRepository : IUserRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public UserRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo nhân viên mới
        /// </summary>
        public async Task<User> CreateAsync(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        /// <summary>
        /// Lấy danh sách tất cả nhân viên (có thể lọc theo trạng thái)
        /// </summary>
        public async Task<IEnumerable<User>> GetAllAsync(bool? isActive = null)
        {
            var query = _context.Users.AsQueryable();
            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }
            return await query.ToListAsync();
        }

        /// <summary>
        /// Tìm nhân viên theo email
        /// </summary>
        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _context.Users
                .Include(u => u.Sessions)   
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        /// <summary>
        /// Lấy nhân viên theo ID (có thể include Tasks và Sessions)
        /// </summary>
        public async Task<User?> GetByIdAsync(ulong id, bool includeTasks = false, bool includeSessions = false)
        {
            var query = _context.Users.AsQueryable();
            if (includeTasks)
            {
                query = query.Include(u => u.Tasks);
            }

            if (includeSessions)
            {
                query = query.Include(u => u.Sessions);
            }

            return await query.FirstOrDefaultAsync(u => u.Id == id);
        }

        /// <summary>
        /// Cập nhật nhân viên theo ID
        /// </summary>
        public async Task<User?> UpdateAsync(ulong id, User user)
        {
            var existing = await _context.Users.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.Email = user.Email;
            existing.PasswordHash = user.PasswordHash;
            existing.FullName = user.FullName;
            existing.Role = user.Role;
            existing.IsActive = user.IsActive;
            existing.UpdatedAt = DateTimeHelper.Now();

            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Cập nhật nhân viên (truyền trực tiếp entity)
        /// </summary>
        public async System.Threading.Tasks.Task UpdateUserAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Thêm nhân viên mới (dạng void)
        /// </summary>
        public async System.Threading.Tasks.Task AddUserAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Kiểm tra username đã tồn tại chưa
        /// </summary>
        public async Task<bool> ExistsByUsernameAsync(string username)
        {
            return await _context.Users.AnyAsync(u => u.Email == username);
        }

        /// <summary>
        /// Tạo mới session cho nhân viên
        /// </summary>
        public async System.Threading.Tasks.Task CreateSessionAsync(Session session)
        {
            _context.Sessions.Add(session);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Cập nhật thông tin session
        /// </summary>
        public async System.Threading.Tasks.Task UpdateSessionAsync(Session session)
        {
            _context.Sessions.Update(session);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy session theo token hash
        /// </summary>
        public async Task<Session?> GetSessionByTokenHashAsync(string tokenHash)
        {
            return await _context.Sessions.FirstOrDefaultAsync(s => s.SessionToken == tokenHash);
        }
    }
}
