using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class PrescriptionRepository : IPrescriptionRepository
    {
        private readonly RobotManagerContext _context;

        public PrescriptionRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<PrescriptionItem> AddItemToPrescriptionAsync(ulong prescriptionId, PrescriptionItem item)
        {
            var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
            if (prescription == null)
            {
                throw new InvalidOperationException("Prescription not found");
            }

            item.PrescriptionId = prescriptionId;
            _context.PrescriptionItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<bool> AssignPrescriptionToTaskAsync(ulong prescriptionId, ulong taskId)
        {
            var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
            if (prescription == null)
            {
                return false;
            }

            var taskPatientAssignment = new TaskPatientAssignment
            {
                TaskId = taskId,
                PatientId = prescription.PatientId
            };

            _context.TaskPatientAssignments.Add(taskPatientAssignment);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Prescription> CreateAsync(Prescription prescription)
        {
            _context.Prescriptions.Add(prescription);
            await _context.SaveChangesAsync();
            return prescription;
        }

        public async Task<IEnumerable<Prescription>> GetAllAsync(ulong? patientId = null, string? status = null)
        {
            var query = _context.Prescriptions.AsQueryable();
            if (patientId.HasValue)
            {
                query = query.Where(p => p.PatientId == patientId.Value);
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(p => p.Status == status);
            }

            return await query.Include(p => p.Patient).Include(p => p.PrescriptionItems).ToListAsync();
        }

        public async Task<Prescription?> GetByCodeAsync(string prescriptionCode)
        {
            return await _context.Prescriptions.FirstOrDefaultAsync(p => p.PrescriptionCode == prescriptionCode);
        }

        public async Task<Prescription?> GetByIdAsync(ulong id, bool includeItems = false, bool includePatient = false)
        {
            var query = _context.Prescriptions.AsQueryable();
            if (includeItems)
            {
                query = query.Include(p => p.PrescriptionItems).ThenInclude(i => i.Medicine);
            }

            if (includePatient)
            {
                query = query.Include(p => p.Patient);
            }

            return await query.FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Prescription?> UpdateAsync(ulong id, Prescription prescription)
        {
            var existing = await _context.Prescriptions.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.PrescriptionCode = prescription.PrescriptionCode;
            existing.PatientId = prescription.PatientId;
            existing.UsersId = prescription.UsersId;
            existing.Status = prescription.Status;

            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
