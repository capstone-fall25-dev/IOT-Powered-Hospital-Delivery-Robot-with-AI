using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý phân bổ ngăn chứa cho task
    /// </summary>
    public class CompartmentAssignmentRepository : ICompartmentAssignmentRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public CompartmentAssignmentRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo mới phân bổ ngăn chứa cho task
        /// </summary>
        public async Task<CompartmentAssignment> CreateAsync(CompartmentAssignment assignment)
        {
            _context.CompartmentAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            return assignment;
        }

        /// <summary>
        /// Lấy danh sách phân bổ ngăn chứa (có thể lọc theo task hoặc trạng thái)
        /// </summary>
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

        /// <summary>
        /// Lấy một bản ghi phân bổ theo ID
        /// </summary>
        public async Task<CompartmentAssignment?> GetByIdAsync(ulong id)
        {
            return await _context.CompartmentAssignments
                .Include(ca => ca.Compartment)
                .Include(ca => ca.Stop).ThenInclude(ts => ts.Destination)
                .Include(ca => ca.Task).ThenInclude(t => t.Robot)
                .FirstOrDefaultAsync(ca => ca.Id == id);
        }

        /// <summary>
        /// Cập nhật thông tin phân bổ theo ID
        /// </summary>
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
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Cập nhật trạng thái đã nạp hàng (item đã được đặt vào ngăn)
        /// </summary>
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
                throw new InvalidOperationException("Không thể nạp hàng khi assignment hoặc task không ở trạng thái pending");
            }
                
            if (assignment.Compartment.Status != "locked" || assignment.Compartment.IsActive != true)
            {
                throw new InvalidOperationException("Ngăn chứa không khả dụng để nạp hàng");
            }

            assignment.Status = "loaded";
            assignment.ItemDesc = itemDesc ?? assignment.ItemDesc; 
            assignment.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return assignment;
        }
    }
}
