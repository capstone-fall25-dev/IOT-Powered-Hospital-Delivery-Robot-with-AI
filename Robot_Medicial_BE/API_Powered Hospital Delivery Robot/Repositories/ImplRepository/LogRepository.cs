using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý log hệ thống
    /// </summary>
    public class LogRepository : ILogRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public LogRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo mới một bản ghi log
        /// </summary>
        public async Task<Log> CreateAsync(Log log)
        {
            _context.Logs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }

        /// <summary>
        /// Lấy danh sách log (có thể lọc theo robot, task hoặc loại log)
        /// </summary>
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

        /// <summary>
        /// Lấy một bản ghi log theo ID
        /// </summary>
        public async Task<Log?> GetByIdAsync(ulong id)
        {
            return await _context.Logs.FirstOrDefaultAsync(l => l.Id == id);
        }
    }
}
