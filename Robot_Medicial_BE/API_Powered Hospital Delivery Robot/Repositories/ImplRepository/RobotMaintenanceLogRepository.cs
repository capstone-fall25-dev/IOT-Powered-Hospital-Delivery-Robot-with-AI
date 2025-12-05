using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý nhật ký bảo trì robot
    /// </summary>
    public class RobotMaintenanceLogRepository : IRobotMaintenanceLogRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public RobotMaintenanceLogRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo mới bản ghi bảo trì
        /// </summary>
        public async Task<RobotMaintenanceLog> CreateAsync(RobotMaintenanceLog log)
        {
            _context.RobotMaintenanceLogs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }

        /// <summary>
        /// Lấy danh sách nhật ký bảo trì (có thể lọc theo robotId)
        /// </summary>
        public async Task<IEnumerable<RobotMaintenanceLog>> GetAllAsync(ulong? robotId = null)
        {
            var query = _context.RobotMaintenanceLogs.AsQueryable();
            if (robotId.HasValue)
            {
                query = query.Where(l => l.RobotId == robotId.Value);
            }

            return await query.Include(l => l.Robot).ToListAsync();
        }

        /// <summary>
        /// Lấy một bản ghi bảo trì theo ID
        /// </summary>
        public async Task<RobotMaintenanceLog?> GetByIdAsync(ulong id)
        {
            return await _context.RobotMaintenanceLogs.Include(l => l.Robot).FirstOrDefaultAsync(l => l.Id == id);
        }
    }
}
