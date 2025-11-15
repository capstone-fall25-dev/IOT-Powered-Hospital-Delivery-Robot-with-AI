using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class MedicineRepository : IMedicineRepository
    {
        private readonly RobotManagerContext _context;

        public MedicineRepository(RobotManagerContext ctx)
        {
            _context = ctx;
        }

        public async Task<IEnumerable<Medicine>> GetAllAsync()
            => await _context.Medicines.Include(m => m.Category).ToListAsync();

        public async Task<Medicine?> GetByIdAsync(ulong id)
            => await _context.Medicines.Include(m => m.Category).FirstOrDefaultAsync(m => m.Id == id);

        public async Task<Medicine?> GetByCodeAsync(string code)
            => await _context.Medicines.FirstOrDefaultAsync(x => x.MedicineCode == code);

        public async Task<Medicine> CreateAsync(Medicine medicine)
        {
            _context.Medicines.Add(medicine);
            await _context.SaveChangesAsync();
            return medicine;
        }

        public async Task<Medicine?> UpdateAsync(ulong id, Medicine updated)
        {
            var m = await _context.Medicines.FindAsync(id);
            if (m == null) return null;

            _context.Entry(m).CurrentValues.SetValues(updated);
            await _context.SaveChangesAsync();
            return m;
        }

        public async Task<bool> DeleteAsync(ulong id)
        {
            var m = await _context.Medicines.FindAsync(id);
            if (m == null) return false;

            _context.Medicines.Remove(m);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
