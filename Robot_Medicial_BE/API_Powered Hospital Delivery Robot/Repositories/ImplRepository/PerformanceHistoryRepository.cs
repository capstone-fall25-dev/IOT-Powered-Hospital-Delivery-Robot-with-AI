using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class PerformanceHistoryRepository : IPerformanceHistoryRepository
    {
        private readonly RobotManagerContext _context;

        public PerformanceHistoryRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<PerformanceHistory> CreateAsync(PerformanceHistory history)
        {
            _context.PerformanceHistories.Add(history);
            await _context.SaveChangesAsync();
            return history;
        }

        public async Task<IEnumerable<PerformanceHistory>> GetAllAsync(ulong? robotId = null)
        {
            var query = _context.PerformanceHistories.AsQueryable();
            if (robotId.HasValue)
            {
                query = query.Where(h => h.RobotId == robotId.Value);
            }

            return await query.Include(h => h.Robot).OrderByDescending(h => h.CreatedAt).ToListAsync();
        }

        public async Task<PerformanceHistory?> GetByIdAsync(ulong id)
        {
            return await _context.PerformanceHistories.Include(h => h.Robot).FirstOrDefaultAsync(h => h.Id == id);
        }
    }
}
