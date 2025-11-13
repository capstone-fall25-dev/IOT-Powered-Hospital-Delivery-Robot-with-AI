using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class TaskRepository : ITaskRepository
    {
        private readonly RobotManagerContext _context;
        public TaskRepository(RobotManagerContext context) => _context = context;

        public async Task<IEnumerable<Models.Entities.Task>> GetAllAsync(TaskFilterDto? filter)
        {
            var q = _context.Tasks
                .Include(t => t.Robot)
                .Include(t => t.AssignedByNavigation)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.CompartmentAssignments)
                        .ThenInclude(a => a.Compartment)
                .AsQueryable();

            if (filter?.RobotId != null) q = q.Where(t => t.RobotId == filter.RobotId);
            if (!string.IsNullOrEmpty(filter?.Status)) q = q.Where(t => t.Status == filter.Status);
            if (!string.IsNullOrEmpty(filter?.Priority)) q = q.Where(t => t.Priority == filter.Priority);

            return await q.OrderByDescending(t => t.CreatedAt).ToListAsync();
        }

        public async Task<Models.Entities.Task?> GetByIdAsync(ulong id)
        {
            return await _context.Tasks
                .Include(t => t.Robot)
                .Include(t => t.AssignedByNavigation) 
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.CompartmentAssignments)
                        .ThenInclude(a => a.Compartment)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Patient)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Destination)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<Models.Entities.Task> CreateAsync(Models.Entities.Task task)
        {
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();
            return task;
        }

        public async Task<Models.Entities.Task?> UpdateAsync(ulong id, Models.Entities.Task task)
        {
            var existing = await _context.Tasks.FindAsync(id);
            if (existing == null) return null;

            existing.Status = task.Status;
            existing.Priority = task.Priority;
            existing.ScheduledStartAt = task.ScheduledStartAt;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteAsync(ulong id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return false;
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TaskStop> CreateStopAsync(TaskStop stop)
        {
            _context.TaskStops.Add(stop);
            await _context.SaveChangesAsync();
            return stop;
        }

        public async Task<CompartmentAssignment> CreateAssignmentAsync(CompartmentAssignment assignment)
        {
            _context.CompartmentAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            return assignment;
        }

        // ==== Helpers ====
        public Task<Robot?> GetRobotAsync(ulong id)
            => _context.Robots.Include(r => r.RobotCompartments).FirstOrDefaultAsync(r => r.Id == id);

        public Task<Map?> GetMapAsync(ulong id)
            => _context.Maps.FirstOrDefaultAsync(m => m.Id == id);

        public Task<RobotCompartment?> GetCompartmentAsync(ulong id)
            => _context.RobotCompartments.FirstOrDefaultAsync(c => c.Id == id);

        public async Task<bool> IsCompartmentBusyAsync(ulong id)
        {
            return await _context.CompartmentAssignments
                .AnyAsync(a => a.CompartmentId == id &&
                               a.Status != "delivered" &&
                               a.Status != "canceled");
        }

        public async Task<Prescription?> GetLatestPrescriptionForPatientAsync(ulong patientId)
        {
            return await _context.Prescriptions
                .Include(p => p.PrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .Where(p => p.PatientId == patientId && (p.Status == "approved" || p.Status == "dispensed"))
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<Prescription?> GetPrescriptionByCodeAsync(string code)
        {
            return await _context.Prescriptions
                .Include(p => p.PrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .FirstOrDefaultAsync(p => p.PrescriptionCode == code);
        }

        public async System.Threading.Tasks.Task UpdateRobotStatusAsync(ulong robotId, string status)
        {
            var robot = await _context.Robots.FindAsync(robotId);
            if (robot == null) return;

            robot.Status = status;
            robot.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}
