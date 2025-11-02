using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class AlertRepository : IAlertRepository
    {
        private readonly RobotManagerContext _context;

        public AlertRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<Alert> CreateAsync(Alert alert)
        {
            _context.Alerts.Add(alert);
            await _context.SaveChangesAsync();
            return alert;
        }

        public async Task<IEnumerable<Alert>> GetAllAsync(ulong? robotId = null, string? status = null, string? severity = null, ulong? prescriptionItemId = null)
        {
            var query = _context.Alerts.AsQueryable();
            if (robotId.HasValue)
            {
                query = query.Where(a => a.RobotId == robotId.Value);
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(a => a.Status == status);
            }

            if (!string.IsNullOrEmpty(severity))
            {
                query = query.Where(a => a.Severity == severity);
            }

            if (prescriptionItemId.HasValue)
            {
                query = query.Where(a => a.PrescriptionItemId == prescriptionItemId.Value);
            }

            return await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
        }

        public async Task<Alert?> GetByIdAsync(ulong id)
        {
            return await _context.Alerts.FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<Alert?> UpdateAsync(ulong id, Alert alert)
        {
            var existing = await _context.Alerts.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.Severity = alert.Severity;
            existing.Category = alert.Category;
            existing.Status = alert.Status;
            existing.Message = alert.Message;
            existing.ResolvedAt = alert.ResolvedAt;
            existing.PrescriptionItemId = alert.PrescriptionItemId;

            await _context.SaveChangesAsync();
            return existing;
        }
    }
}