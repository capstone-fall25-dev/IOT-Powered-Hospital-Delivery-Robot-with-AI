using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class RobotMaintenanceLogRepository : IRobotMaintenanceLogRepository
    {
        private readonly RobotManagerContext _context;

        public RobotMaintenanceLogRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<RobotMaintenanceLog> CreateAsync(RobotMaintenanceLog log)
        {
            _context.RobotMaintenanceLogs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }

        public async Task<IEnumerable<RobotMaintenanceLog>> GetAllAsync(ulong? robotId = null)
        {
            var query = _context.RobotMaintenanceLogs.AsQueryable();
            if (robotId.HasValue)
            {
                query = query.Where(l => l.RobotId == robotId.Value);
            }

            return await query.Include(l => l.Robot).ToListAsync();
        }

        public async Task<RobotMaintenanceLog?> GetByIdAsync(ulong id)
        {
            return await _context.RobotMaintenanceLogs.Include(l => l.Robot).FirstOrDefaultAsync(l => l.Id == id);
        }
    }
}
