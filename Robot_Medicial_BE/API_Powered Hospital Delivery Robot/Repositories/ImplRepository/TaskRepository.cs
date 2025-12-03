using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class TaskRepository : ITaskRepository
    {
        private readonly RobotManagerContext _context;

        public TaskRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Models.Entities.Task>> GetListAsync(TaskFilterDto? filter)
        {
            var q = _context.Tasks
                .Include(t => t.Robot)
                .Include(t => t.AssignedByNavigation)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Patient)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.CompartmentAssignments)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Destination)
                .AsQueryable();

            if (filter?.RobotId != null)
                q = q.Where(t => t.RobotId == filter.RobotId);

            if (!string.IsNullOrEmpty(filter?.Status))
                q = q.Where(t => t.Status == filter.Status);

            if (!string.IsNullOrEmpty(filter?.Priority))
                q = q.Where(t => t.Priority == filter.Priority);

            return await q.OrderByDescending(t => t.CreatedAt).ToListAsync();
        }

        public async Task<Models.Entities.Task?> GetByIdAsync(ulong id)
        {
            return await _context.Tasks

                // Robot + Map + Người giao
                .Include(t => t.Robot)
                .Include(t => t.Map)
                .Include(t => t.AssignedByNavigation)

                // Stops
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Destination)

                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Patient)

                // Assignment + Compartment
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.CompartmentAssignments)
                        .ThenInclude(a => a.Compartment)
                            .ThenInclude(c => c.Category)

                // Prescription FULL
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Patient)
                        .ThenInclude(p => p.Prescriptions!)
                            .ThenInclude(rx => rx.PrescriptionItems!)
                                .ThenInclude(i => i.Medicine)

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
            existing.UpdatedAt = DateTime.Now;
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
               => _context.RobotCompartments
                   .Include(c => c.Category)
                   .FirstOrDefaultAsync(c => c.Id == id);

        public async Task<bool> IsCompartmentBusyAsync(ulong id)
        {
            return await _context.CompartmentAssignments
                .AnyAsync(a => a.CompartmentId == id &&
                               a.Status != "delivered" &&
                               a.Status != "canceled");
        }

        public async Task<Prescription?> GetLatestApprovedPrescriptionForPatientAsync(ulong patientId)
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
            robot.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
        }

        public async Task<IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }

        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public async Task<Models.Entities.Task?> GetTaskWithStopsAsync(ulong taskId)
        {
            return await _context.Tasks
                .Include(t => t.Map)
                .Include(t => t.Robot)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Destination)
                .FirstOrDefaultAsync(t => t.Id == taskId);
        }

        public async Task<Map?> GetMapByTaskIdAsync(ulong taskId)
        {
            return await _context.Tasks
                .Where(t => t.Id == taskId)
                .Select(t => t.Map)
                .FirstOrDefaultAsync();
        }
    }
}
