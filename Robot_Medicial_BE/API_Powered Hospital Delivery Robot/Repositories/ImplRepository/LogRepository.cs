using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class LogRepository : ILogRepository
    {
        private readonly RobotManagerContext _context;

        public LogRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<Log> CreateAsync(Log log)
        {
            _context.Logs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }

        public async Task<IEnumerable<Log>> GetAllAsync(ulong? robotId = null, ulong? taskId = null, string? logType = null)
        {
            var query = _context.Logs.AsQueryable();
            if (robotId.HasValue)
            {
                query = query.Where(l => l.RobotId == robotId.Value);
            }

            if (taskId.HasValue)
            {
                query = query.Where(l => l.TaskId == taskId.Value);
            }

            if (!string.IsNullOrEmpty(logType))
            {
                query = query.Where(l => l.LogType == logType);
            }

            return await query.OrderByDescending(l => l.CreatedAt).ToListAsync();
        }

        public async Task<Log?> GetByIdAsync(ulong id)
        {
            return await _context.Logs.FirstOrDefaultAsync(l => l.Id == id);
        }
    }
}
