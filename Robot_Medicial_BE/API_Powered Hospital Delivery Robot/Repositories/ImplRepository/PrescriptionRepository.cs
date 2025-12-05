using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý đơn thuốc
    /// </summary>
    public class PrescriptionRepository : IPrescriptionRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public PrescriptionRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách đơn thuốc (có thể lọc theo bệnh nhân và trạng thái)
        /// </summary>
        public async Task<IEnumerable<Prescription>> GetAllAsync(ulong? patientId, string? status)
        {
            var q = _context.Prescriptions.AsQueryable();

            if (patientId.HasValue)
                q = q.Where(x => x.PatientId == patientId);

            if (!string.IsNullOrEmpty(status))
                q = q.Where(x => x.Status == status);

            return await q.Include(x => x.Patient).Include(x => x.PrescriptionItems).ThenInclude(i => i.Medicine).ToListAsync();
        }

        /// <summary>
        /// Lấy đơn thuốc theo ID (có thể include chi tiết thuốc và bệnh nhân)
        /// </summary>
        public async Task<Prescription?> GetByIdAsync(ulong id, bool includeItems = false, bool includePatient = false)
        {
            var query = _context.Prescriptions.AsQueryable();

            if (includeItems)
                query = query
                    .Include(p => p.PrescriptionItems)
                        .ThenInclude(i => i.Medicine);

            if (includePatient)
                query = query.Include(p => p.Patient);

            return await query.FirstOrDefaultAsync(p => p.Id == id);
        }

        /// <summary>
        /// Lấy đơn thuốc theo mã code
        /// </summary>
        public async Task<Prescription?> GetByCodeAsync(string code)
            => await _context.Prescriptions.FirstOrDefaultAsync(x => x.PrescriptionCode == code);

        /// <summary>
        /// Tạo mới đơn thuốc
        /// </summary>
        public async Task<Prescription> CreateAsync(Prescription pres)
        {
            _context.Prescriptions.Add(pres);
            await _context.SaveChangesAsync();
            return pres;
        }

        /// <summary>
        /// Cập nhật đơn thuốc
        /// </summary>
        public async Task<Prescription?> UpdateAsync(Prescription pres)
        {
            _context.Prescriptions.Update(pres);
            await _context.SaveChangesAsync();
            return pres;
        }

        /// <summary>
        /// Xóa mềm đơn thuốc (đánh dấu IsDeleted = true)
        /// </summary>
        public async Task<bool> SoftDeleteAsync(ulong id)
        {
            var pres = await _context.Prescriptions.FindAsync(id);
            if (pres == null) return false;

            pres.Status = "canceled";
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Khôi phục đơn thuốc đã xóa mềm
        /// </summary>
        public async Task<bool> RestoreAsync(ulong id)
        {
            var pres = await _context.Prescriptions.FindAsync(id);
            if (pres == null) return false;

            pres.Status = "pending";
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
