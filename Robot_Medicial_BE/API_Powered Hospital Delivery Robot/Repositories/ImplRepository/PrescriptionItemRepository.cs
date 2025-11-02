using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class PrescriptionItemRepository : IPrescriptionItemRepository
    {
        private readonly RobotManagerContext _context;

        public PrescriptionItemRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<PrescriptionItem> CreateAsync(PrescriptionItem item)
        {
            _context.PrescriptionItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<IEnumerable<PrescriptionItem>> GetAllAsync(ulong? prescriptionId = null, ulong? medicineId = null)
        {
            var query = _context.PrescriptionItems.AsQueryable();
            if (prescriptionId.HasValue)
            {
                query = query.Where(i => i.PrescriptionId == prescriptionId.Value);
            }
            if (medicineId.HasValue)
            {
                query = query.Where(i => i.MedicineId == medicineId.Value);
            }
            return await query.ToListAsync();
        }

        public async Task<PrescriptionItem?> GetByIdAsync(ulong id)
        {
            return await _context.PrescriptionItems.FirstOrDefaultAsync(i => i.Id == id);
        }

        public async Task<bool> ReportDamagedAsync(ulong id, string reason, string? description)
        {
            var item = await _context.PrescriptionItems.FindAsync(id);
            if (item == null)
            {
                return false;
            }
            // Append damage info to instructions, but truncate to avoid exceeding varchar(255) limit
            var damageNote = $"; Damaged: {reason} - {description ?? "N/A"}";
            var currentInstructions = item.Instructions ?? "";
            var newInstructions = currentInstructions + damageNote;
            if (newInstructions.Length > 255)
            {
                // Truncate to fit, prioritizing existing instructions + summary
                newInstructions = currentInstructions.Length > 200
                    ? currentInstructions.Substring(0, 200) + "...; Damaged"
                    : currentInstructions + damageNote.Substring(0, 255 - currentInstructions.Length);
            }
            item.Instructions = newInstructions;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<PrescriptionItem?> UpdateAsync(ulong id, PrescriptionItem item)
        {
            var existing = await _context.PrescriptionItems.FindAsync(id);
            if (existing == null)
            {
                return null;
            }
            existing.MedicineId = item.MedicineId;
            existing.Quantity = item.Quantity;
            existing.Dosage = item.Dosage;
            existing.Instructions = item.Instructions;
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}