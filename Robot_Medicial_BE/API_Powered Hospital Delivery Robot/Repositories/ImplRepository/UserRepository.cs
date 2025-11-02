using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class UserRepository : IUserRepository
    {
        private readonly RobotManagerContext _context;

        public UserRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<User> CreateAsync(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<IEnumerable<User>> GetAllAsync(bool? isActive = null)
        {
            var query = _context.Users.AsQueryable();
            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }
            return await query.ToListAsync();
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

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
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
