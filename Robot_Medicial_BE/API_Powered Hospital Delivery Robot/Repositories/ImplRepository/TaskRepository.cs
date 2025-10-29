using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class TaskRepository : ITaskRepository
    {
        private readonly RobotManagerContext _context;

        public TaskRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<bool> CancelAsync(ulong id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
            {
                return false;
            }

            task.Status = "canceled";
            task.CompletedAt = DateTime.Now;
            task.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Models.Entities.Task> CreateAsync(Models.Entities.Task task)
        {
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();
            return task;
        }

        public async Task<IEnumerable<Models.Entities.Task>> GetAllAsync()
        {
            return await _context.Tasks.Include(t => t.Robot).Include(t => t.AssignedByNavigation).ToListAsync();
        }

        public async Task<IEnumerable<Models.Entities.Task>> GetByAssignedByAsync(ulong assignedById)
        {
            return await _context.Tasks
                .Where(t => t.AssignedBy == assignedById)
                .Include(t => t.Robot)
                .Include(t => t.AssignedByNavigation)
                .ToListAsync();
        }

        public async Task<Models.Entities.Task?> GetByIdAsync(ulong id)
        {
            return await _context.Tasks
                .Include(t => t.Robot)
                .Include(t => t.AssignedByNavigation)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<Models.Entities.Task?> UpdateAsync(ulong id, Models.Entities.Task task)
        {
            var existing = await _context.Tasks.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.RobotId = task.RobotId;
            existing.AssignedBy = task.AssignedBy;
            existing.Status = task.Status;
            existing.StartedAt = task.StartedAt;
            existing.CompletedAt = task.CompletedAt;
            existing.TotalDurationS = task.TotalDurationS;
            existing.TotalErrors = task.TotalErrors;
            existing.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
