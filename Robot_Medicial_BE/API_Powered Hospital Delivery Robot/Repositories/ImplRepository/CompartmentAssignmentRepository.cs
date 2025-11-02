using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class CompartmentAssignmentRepository : ICompartmentAssignmentRepository
    {
        private readonly RobotManagerContext _context;

        public CompartmentAssignmentRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<CompartmentAssignment> CreateAsync(CompartmentAssignment assignment)
        {
            _context.CompartmentAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            return assignment;
        }

        public async Task<IEnumerable<CompartmentAssignment>> GetAllAsync(ulong? taskId = null, string? status = null)
        {
            var query = _context.CompartmentAssignments
                .Include(ca => ca.Compartment)
                .Include(ca => ca.Stop).ThenInclude(ts => ts.Destination)
                .Include(ca => ca.Task).ThenInclude(t => t.Robot)
                .AsQueryable();

            if (taskId.HasValue)
            {
                query = query.Where(ca => ca.TaskId == taskId.Value);
            }
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(ca => ca.Status == status);
            }

            return await query.ToListAsync();
        }

        public async Task<CompartmentAssignment?> GetByIdAsync(ulong id)
        {
            return await _context.CompartmentAssignments
                .Include(ca => ca.Compartment)
                .Include(ca => ca.Stop).ThenInclude(ts => ts.Destination)
                .Include(ca => ca.Task).ThenInclude(t => t.Robot)
                .FirstOrDefaultAsync(ca => ca.Id == id);
        }

        public async Task<CompartmentAssignment?> UpdateAsync(ulong id, CompartmentAssignment assignment)
        {
            var existing = await _context.CompartmentAssignments.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.CompartmentId = assignment.CompartmentId;
            existing.StopId = assignment.StopId;
            existing.TaskId = assignment.TaskId;
            existing.ItemDesc = assignment.ItemDesc;
            existing.Status = assignment.Status;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<CompartmentAssignment?> UpdateLoadStatusAsync(ulong id, string itemDesc)
        {
            var assignment = await _context.CompartmentAssignments.Include(a => a.Task).Include(a => a.Stop).Include(a => a.Compartment).FirstOrDefaultAsync(a => a.Id == id);
            if (assignment == null)
            {
                return null;
            }

            // Validate: Chỉ load nếu pending và task pending
            if (assignment.Status != "pending" || assignment.Task.Status != "pending")
            {
                throw new InvalidOperationException("Cannot load non-pending assignment or task");
            }
                
            if (assignment.Compartment.Status != "locked" || assignment.Compartment.IsActive != true)
            {
                throw new InvalidOperationException("Compartment not available for loading");
            }

            assignment.Status = "loaded";
            assignment.ItemDesc = itemDesc ?? assignment.ItemDesc; 
            assignment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return assignment;
        }
    }
}
