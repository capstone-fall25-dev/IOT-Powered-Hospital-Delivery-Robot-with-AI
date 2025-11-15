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

        public async Task<PrescriptionItem?> GetByIdAsync(ulong id)
            => await _context.PrescriptionItems.FindAsync(id);

        public async Task<IEnumerable<PrescriptionItem>> GetByPrescriptionAsync(ulong prescriptionId)
            => await _context.PrescriptionItems.Where(x => x.PrescriptionId == prescriptionId).ToListAsync();

        public async Task<PrescriptionItem> CreateAsync(PrescriptionItem item)
        {
            _context.PrescriptionItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<PrescriptionItem?> UpdateAsync(PrescriptionItem item)
        {
            _context.PrescriptionItems.Update(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<bool> DeleteAsync(ulong id)
        {
            var item = await _context.PrescriptionItems.FindAsync(id);
            if (item == null) return false;

            _context.PrescriptionItems.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}