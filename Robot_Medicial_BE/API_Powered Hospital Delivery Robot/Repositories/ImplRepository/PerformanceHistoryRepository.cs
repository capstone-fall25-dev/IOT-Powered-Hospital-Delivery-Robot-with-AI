using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý lịch sử hiệu suất robot
    /// </summary>
    public class PerformanceHistoryRepository : IPerformanceHistoryRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public PerformanceHistoryRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo mới bản ghi lịch sử hiệu suất
        /// </summary>
        public async Task<PerformanceHistory> CreateAsync(PerformanceHistory history)
        {
            _context.PerformanceHistories.Add(history);
            await _context.SaveChangesAsync();
            return history;
        }

        /// <summary>
        /// Lấy danh sách lịch sử hiệu suất (có thể lọc theo robotId)
        /// </summary>
        public async Task<IEnumerable<PerformanceHistory>> GetAllAsync(ulong? robotId = null)
        {
            var query = _context.PerformanceHistories.AsQueryable();
            if (robotId.HasValue)
            {
                query = query.Where(h => h.RobotId == robotId.Value);
            }

            return await query.Include(h => h.Robot).OrderByDescending(h => h.CreatedAt).ToListAsync();
        }

        /// <summary>
        /// Lấy một bản ghi hiệu suất theo ID
        /// </summary>
        public async Task<PerformanceHistory?> GetByIdAsync(ulong id)
        {
            return await _context.PerformanceHistories.Include(h => h.Robot).FirstOrDefaultAsync(h => h.Id == id);
        }
    }
}
