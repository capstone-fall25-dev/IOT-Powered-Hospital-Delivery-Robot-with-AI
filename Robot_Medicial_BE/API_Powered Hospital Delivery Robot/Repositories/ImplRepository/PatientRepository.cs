using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý dữ liệu bệnh nhân
    /// </summary>
    public class PatientRepository : IPatientRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public PatientRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Kiểm tra phòng có tồn tại không
        /// </summary>
        public async Task<bool> ExistsRoomAsync(ulong roomId)
            => await _context.Rooms.AnyAsync(r => r.Id == roomId);

        /// <summary>
        /// Tạo mới bệnh nhân
        /// </summary>
        public async Task<Patient> CreateAsync(Patient patient)
        {
            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();
            return patient;
        }

        /// <summary>
        /// Lấy toàn bộ danh sách bệnh nhân
        /// </summary>
        public async Task<IEnumerable<Patient>> GetAllAsync()
        {
            return await _context.Patients
                .Include(p => p.Room)
                .Include(p => p.Prescriptions)
                .ToListAsync();
        }

        /// <summary>
        /// Lọc bệnh nhân theo nhiều tiêu chí
        /// </summary>
        public async Task<IEnumerable<Patient>> FilterAsync(PatientFilterDto f)
        {
            var q = _context.Patients.Include(p => p.Room).AsQueryable();

            if (!string.IsNullOrEmpty(f.Keyword))
                q = q.Where(p =>
                    p.FullName.Contains(f.Keyword) ||
                    p.PatientCode.Contains(f.Keyword) ||
                    (p.Department != null && p.Department.Contains(f.Keyword)) ||
                    (p.Room!.RoomName != null && p.Room.RoomName.Contains(f.Keyword)));

            if (!string.IsNullOrEmpty(f.Status))
                q = q.Where(p => p.Status == f.Status);

            return await q
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy bệnh nhân theo ID, có thể include phòng và đơn thuốc
        /// </summary>
        public async Task<Patient?> GetByIdAsync(ulong id, bool includeRoom = false, bool includePrescriptions = false)
        {
            IQueryable<Patient> q = _context.Patients;

            if (includeRoom)
                q = q.Include(p => p.Room);

            if (includePrescriptions)
                q = q.Include(p => p.Prescriptions)
                     .ThenInclude(pr => pr.PrescriptionItems)
                     .ThenInclude(i => i.Medicine);

            return await q.FirstOrDefaultAsync(p => p.Id == id);
        }

        /// <summary>
        /// Lấy bệnh nhân theo mã bệnh nhân
        /// </summary>
        public async Task<Patient?> GetByCodeAsync(string code)
            => await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == code);

        /// <summary>
        /// Cập nhật thông tin bệnh nhân theo ID
        /// </summary>
        public async Task<Patient?> UpdateAsync(ulong id, Patient patient)
        {
            var ex = await _context.Patients.FindAsync(id);
            if (ex == null) return null;

            _context.Entry(ex).CurrentValues.SetValues(patient);
            await _context.SaveChangesAsync();

            return ex;
        }

        /// <summary>
        /// Cho bệnh nhân xuất viện
        /// </summary>
        public async Task<Patient?> DischargeAsync(ulong id, string? reason)
        {
            var patient = await _context.Patients.FindAsync(id);
            if (patient == null) return null;

            patient.Status = "discharged";
            patient.RoomId = null;
            patient.RoomNumber = null;

            if (!string.IsNullOrWhiteSpace(reason))
            {
                patient.FullName = $"{patient.FullName} ({reason})";
            }

            await _context.SaveChangesAsync();
            return patient;
        }

        /// <summary>
        /// Lấy lịch sử nhận thuốc của bệnh nhân
        /// </summary>
        public async Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id)
        {
            return await _context.PrescriptionItems
                .Include(i => i.Medicine)
                .Where(i => i.Prescription.PatientId == id)
                .GroupBy(i => i.Medicine.Name)
                .Select(g => new PatientMedicineHistoryDto
                {
                    MedicineName = g.Key,
                    Dosage = g.First().Dosage,
                    LastPrescribedAt = g.Max(i => i.Prescription.CreatedAt),
                    TotalPrescribedQuantity = g.Sum(i => i.Quantity)
                })
                .OrderByDescending(x => x.LastPrescribedAt)
                .ToListAsync();
        }
    }
}
