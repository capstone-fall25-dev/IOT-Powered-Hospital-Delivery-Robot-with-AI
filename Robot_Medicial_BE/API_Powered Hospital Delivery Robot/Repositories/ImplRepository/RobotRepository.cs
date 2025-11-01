using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class RobotRepository : IRobotRepository
    {
        private readonly RobotmanagerContext _context;

        public RobotRepository(RobotmanagerContext context)
        {
            _context = context;
        }

        public async Task<Robot> CreateAsync(Robot robot)
        {
            _context.Robots.Add(robot);
            await _context.SaveChangesAsync();
            return robot;
        }

        public async Task<IEnumerable<Robot>> GetAllAsync(string? status = null)
        {
            var query = _context.Robots.Include(r => r.RobotCompartments).AsQueryable();
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(r => r.Status == status);
            }
            return await query.ToListAsync();
        }

        public async Task<Robot?> GetByCodeAsync(string code)
        {
            return await _context.Robots.FirstOrDefaultAsync(r => r.Code == code);
        }

        public async Task<Robot?> GetByIdAsync(ulong id)
        {
            return await _context.Robots
                .Include(r => r.RobotCompartments)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<Robot?> UpdateAsync(ulong id, Robot robot)
        {
            var existing = await _context.Robots.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.Code = robot.Code;
            existing.Name = robot.Name;
            existing.BatteryPercent = robot.BatteryPercent;
            existing.Latitude = robot.Latitude;
            existing.Longitude = robot.Longitude;
            existing.ProgressOverallPct = robot.ProgressOverallPct;
            existing.ProgressLegPct = robot.ProgressLegPct;
            existing.IsMicOn = robot.IsMicOn;
            existing.EtaDeliveryAt = robot.EtaDeliveryAt;
            existing.EtaReturnAt = robot.EtaReturnAt;
            existing.ErrorCountSession = robot.ErrorCountSession;
            existing.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<Robot?> UpdateStatusAsync(ulong id, string status)
        {
            var existing = await _context.Robots.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.Status = status;
            existing.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
