using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý dữ liệu task và các điểm dừng
    /// </summary>
    public class TaskRepository : ITaskRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public TaskRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách task (có thể lọc theo robot, trạng thái, độ ưu tiên)
        /// </summary>
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

        /// <summary>
        /// Lấy chi tiết một task theo ID (kèm đầy đủ thông tin liên quan)
        /// </summary>
        public async Task<Models.Entities.Task?> GetByIdAsync(ulong id)
        {
            return await _context.Tasks
                .AsSplitQuery()

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
                    .ThenInclude(s => s.Patient!)
                        .ThenInclude(p => p.Prescriptions!)
                            .ThenInclude(rx => rx.PrescriptionItems!)
                                .ThenInclude(i => i.Medicine)

                .FirstOrDefaultAsync(t => t.Id == id);
        }

        /// <summary>
        /// Lấy task theo ID cho trang edit (tối ưu - không load prescription data)
        /// </summary>
        public async Task<Models.Entities.Task?> GetByIdForEditAsync(ulong id)
        {
            return await _context.Tasks
                .AsSplitQuery()
                .AsNoTracking() // Chỉ đọc, không track changes

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

                // KHÔNG load Prescription data để tối ưu performance

                .FirstOrDefaultAsync(t => t.Id == id);
        }

        /// <summary>
        /// Tạo task mới
        /// </summary>
        public async Task<Models.Entities.Task> CreateAsync(Models.Entities.Task task)
        {
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();
            return task;
        }

        /// <summary>
        /// Cập nhật task theo ID
        /// </summary>
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

        /// <summary>
        /// Xóa task theo ID
        /// </summary>
        public async Task<bool> DeleteAsync(ulong id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return false;
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Tạo mới một điểm dừng của task
        /// </summary>
        public async Task<bool> DeleteStopAsync(ulong stopId)
        {
            var stop = await _context.TaskStops.FindAsync(stopId);
            if (stop == null) return false;

            _context.TaskStops.Remove(stop);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TaskStop> CreateStopAsync(TaskStop stop)
        {
            _context.TaskStops.Add(stop);
            await _context.SaveChangesAsync();
            return stop;
        }

        /// <summary>
        /// Tạo phân bổ ngăn chứa cho task
        /// </summary>
        public async Task<CompartmentAssignment> CreateAssignmentAsync(CompartmentAssignment assignment)
        {
            _context.CompartmentAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            return assignment;
        }

        /// <summary>
        /// Lấy thông tin robot theo ID
        /// </summary>
        public Task<Robot?> GetRobotAsync(ulong id)
            => _context.Robots.Include(r => r.RobotCompartments).FirstOrDefaultAsync(r => r.Id == id);

        /// <summary>
        /// Lấy thông tin bản đồ theo ID
        /// </summary>
        public Task<Map?> GetMapAsync(ulong id)
            => _context.Maps.FirstOrDefaultAsync(m => m.Id == id);

        /// <summary>
        /// Lấy thông tin ngăn chứa của robot
        /// </summary>
        public Task<RobotCompartment?> GetCompartmentAsync(ulong id)
               => _context.RobotCompartments
                   .Include(c => c.Category)
                   .FirstOrDefaultAsync(c => c.Id == id);

        /// <summary>
        /// Kiểm tra ngăn chứa đang được dùng chưa
        /// </summary>
        public async Task<bool> IsCompartmentBusyAsync(ulong id)
        {
            // Kiểm tra compartment có đang được sử dụng bởi task active không
            // Chỉ coi là busy nếu assignment thuộc về task chưa completed/canceled/failed
            return await _context.CompartmentAssignments
                .Include(a => a.Stop)
                    .ThenInclude(s => s!.Task)
                .AnyAsync(a => a.CompartmentId == id &&
                               a.Status != "delivered" &&
                               a.Status != "canceled" &&
                               a.Stop != null &&
                               a.Stop.Task != null &&
                               a.Stop.Task.Status != "completed" &&
                               a.Stop.Task.Status != "canceled" &&
                               a.Stop.Task.Status != "failed");
        }

        /// <summary>
        /// Kiểm tra robot đã có task pending chưa (để tránh assign nhiều task cho cùng một robot)
        /// </summary>
        public async Task<bool> HasRobotPendingTaskAsync(ulong robotId)
        {
            return await _context.Tasks
                .AnyAsync(t => t.RobotId == robotId && t.Status == "pending");
        }

        /// <summary>
        /// Lấy đơn thuốc mới nhất của bệnh nhân
        /// </summary>
        public async Task<Prescription?> GetLatestApprovedPrescriptionForPatientAsync(ulong patientId)
        {
            return await _context.Prescriptions
                .Include(p => p.PrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .Where(p => p.PatientId == patientId && (p.Status == "approved" || p.Status == "dispensed"))
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// Lấy đơn thuốc theo mã code
        /// </summary>
        public async Task<Prescription?> GetPrescriptionByCodeAsync(string code)
        {
            return await _context.Prescriptions
                .Include(p => p.PrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .FirstOrDefaultAsync(p => p.PrescriptionCode == code);
        }

        /// <summary>
        /// Cập nhật trạng thái robot
        /// </summary>
        public async System.Threading.Tasks.Task UpdateRobotStatusAsync(ulong robotId, string status)
        {
            var robot = await _context.Robots.FindAsync(robotId);
            if (robot == null) return;

            robot.Status = status;
            robot.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Bắt đầu transaction
        /// </summary>
        public async Task<IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }

        /// <summary>
        /// Lưu thay đổi vào database
        /// </summary>
        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy task kèm danh sách các điểm dừng
        /// </summary>
        public async Task<Models.Entities.Task?> GetTaskWithStopsAsync(ulong taskId)
        {
            return await _context.Tasks
                .Include(t => t.Map)
                .Include(t => t.Robot)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.Destination)
                .Include(t => t.TaskStops)
                    .ThenInclude(s => s.CompartmentAssignments)
                .FirstOrDefaultAsync(t => t.Id == taskId);
        }

        /// <summary>
        /// Lấy bản đồ liên quan đến task
        /// </summary>
        public async Task<Map?> GetMapByTaskIdAsync(ulong taskId)
        {
            return await _context.Tasks
                .Where(t => t.Id == taskId)
                .Select(t => t.Map)
                .FirstOrDefaultAsync();
        }
    }
}
