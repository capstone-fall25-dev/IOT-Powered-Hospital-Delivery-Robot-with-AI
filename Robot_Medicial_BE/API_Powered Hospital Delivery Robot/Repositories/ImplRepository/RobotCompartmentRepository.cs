using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý ngăn chứa của robot
    /// </summary>
    public class RobotCompartmentRepository : IRobotCompartmentRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public RobotCompartmentRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy thông tin một ngăn chứa theo ID
        /// </summary>
        public async Task<RobotCompartment?> GetByIdAsync(ulong id)
        {
            return await _context.RobotCompartments
                .Include(c => c.Category)
                .Include(c => c.Patient)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        /// <summary>
        /// Cập nhật trạng thái của ngăn chứa (locked/unlocked)
        /// </summary>
        public async Task<RobotCompartment?> UpdateStatusAsync(ulong id, string status)
        {
            if (!new[] { "locked", "unlocked" }.Contains(status))
                throw new ArgumentException("Trạng thái không hợp lệ: phải là 'locked' hoặc 'unlocked'");

            var compartment = await _context.RobotCompartments.FindAsync(id);
            if (compartment == null)
                throw new InvalidOperationException("Không tìm thấy ngăn chứa");

            compartment.Status = status;
            await _context.SaveChangesAsync();
            return compartment;
        }

        /// <summary>
        /// Cập nhật thông tin ngăn chứa
        /// </summary>
        public async Task<RobotCompartment?> UpdateAsync(ulong id, RobotCompartment compartment)
        {
            var existing = await _context.RobotCompartments.FindAsync(id);
            if (existing == null)
                return null;

            existing.CategoryId = compartment.CategoryId;
            existing.Status = compartment.Status;
            existing.IsActive = compartment.IsActive;
            // Giữ nguyên CompartmentCode và RobotId
            // existing.CompartmentCode = compartment.CompartmentCode; // Không đổi code
            // existing.RobotId = compartment.RobotId; // Không đổi robot

            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Lấy các ngăn chứa theo danh mục và robot
        /// </summary>
        public async Task<IEnumerable<RobotCompartment>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId)
        {
            return await _context.RobotCompartments
                .Include(rc => rc.Robot)
                .Include(rc => rc.Category)
                .Include(rc => rc.Patient)
                .Where(rc => rc.RobotId == robotId && rc.CategoryId == categoryId && rc.IsActive == true)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy tất cả ngăn chứa của một robot
        /// </summary>
        public async Task<IEnumerable<RobotCompartment>> GetByRobotAsync(ulong robotId)
        {
            return await _context.RobotCompartments
                .Include(rc => rc.Category)
                .Include(rc => rc.Patient)
                .Where(rc => rc.RobotId == robotId && rc.IsActive == true)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy ngăn chứa của robot (có thể lọc theo category)
        /// </summary>
        public async Task<IEnumerable<RobotCompartment>> GetFilteredByRobotAsync(ulong robotId, ulong? categoryId)
        {
            // Lấy danh sách compartment ID đang được sử dụng bởi task active (pending, in_progress, etc.)
            var busyCompartmentIds = await _context.CompartmentAssignments
                .Include(a => a.Stop)
                    .ThenInclude(s => s!.Task)
                .Where(a => a.Stop != null &&
                           a.Stop.Task != null &&
                           a.Status != "delivered" &&
                           a.Status != "canceled" &&
                           a.Stop.Task.Status != "completed" &&
                           a.Stop.Task.Status != "canceled" &&
                           a.Stop.Task.Status != "failed")
                .Select(a => a.CompartmentId)
                .Distinct()
                .ToListAsync();

            var query = _context.RobotCompartments
                .Include(rc => rc.Category)
                .Include(rc => rc.Patient)
                .Where(rc => rc.RobotId == robotId && 
                            rc.IsActive == true &&
                            rc.Status == "unlocked" &&  // Chỉ lấy unlocked
                            !busyCompartmentIds.Contains(rc.Id)); // Loại bỏ compartment đang được sử dụng

            // Nếu không chọn Category → trả tất cả unlocked và không busy
            if (categoryId == null)
                return await query.ToListAsync();

            // Nếu chọn Category → filter theo logic business
            return await query
                .Where(rc =>
                    rc.CategoryId == null              // chưa gán category → vẫn hợp lệ
                    || rc.CategoryId == categoryId     // category đúng loại → hợp lệ
                )
                .ToListAsync();
        }

        /// <summary>
        /// Gán bệnh nhân vào ngăn chứa
        /// </summary>
        public async System.Threading.Tasks.Task AssignPatientToCompartment(ulong compartmentId, ulong patientId)
        {
            var comp = await _context.RobotCompartments.FindAsync(compartmentId);
            if (comp == null)
                throw new InvalidOperationException("Không tìm thấy ngăn chứa");

            comp.PatientId = patientId;
            comp.Status = "locked";

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Gán danh mục (category) cho ngăn chứa
        /// </summary>
        public async Task<bool> AssignCategoryToCompartment(ulong compId, ulong categoryId)
        {
            var comp = await _context.RobotCompartments.FindAsync(compId);
            if (comp == null) return false;

            comp.CategoryId = categoryId;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Tạo nhiều ngăn chứa cùng lúc (thường khi tạo robot mới)
        /// </summary>
        public async System.Threading.Tasks.Task CreateManyAsync(IEnumerable<RobotCompartment> compartments)
        {
            _context.RobotCompartments.AddRange(compartments);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Giải phóng ngăn chứa (xóa bệnh nhân, reset trạng thái)
        /// </summary>
        public async System.Threading.Tasks.Task ReleaseCompartmentAsync(ulong compartmentId)
        {
            var comp = await _context.RobotCompartments.FindAsync(compartmentId)
                ?? throw new InvalidOperationException("Khoang không tồn tại.");

            comp.PatientId = null;
            comp.CategoryId = null;

            if (comp.Status == "locked")
                comp.Status = "unlocked";

            _context.RobotCompartments.Update(comp);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Xóa tất cả ngăn chứa của một robot (khi xóa robot)
        /// </summary>
        public async System.Threading.Tasks.Task DeleteByRobotIdAsync(ulong robotId)
        {
            var compartments = await _context.RobotCompartments
                .Where(rc => rc.RobotId == robotId)
                .ToListAsync();

            if (compartments.Any())
            {
                _context.RobotCompartments.RemoveRange(compartments);
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Xóa một ngăn chứa theo ID
        /// </summary>
        public async System.Threading.Tasks.Task<bool> DeleteAsync(ulong id)
        {
            var compartment = await _context.RobotCompartments.FindAsync(id);
            if (compartment == null)
                return false;

            _context.RobotCompartments.Remove(compartment);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}