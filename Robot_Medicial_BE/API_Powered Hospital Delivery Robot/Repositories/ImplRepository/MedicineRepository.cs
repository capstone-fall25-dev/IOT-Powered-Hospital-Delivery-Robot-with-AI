using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý dữ liệu thuốc
    /// </summary>
    public class MedicineRepository : IMedicineRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public MedicineRepository(RobotManagerContext ctx)
        {
            _context = ctx;
        }

        /// <summary>
        /// Lấy danh sách tất cả các loại thuốc
        /// </summary>
        public async Task<IEnumerable<Medicine>> GetAllAsync()
            => await _context.Medicines.Include(m => m.Category).ToListAsync();

        /// <summary>
        /// Lấy thông tin thuốc theo ID
        /// </summary>
        public async Task<Medicine?> GetByIdAsync(ulong id)
            => await _context.Medicines.Include(m => m.Category).FirstOrDefaultAsync(m => m.Id == id);

        /// <summary>
        /// Lấy thông tin thuốc theo mã thuốc
        /// </summary>
        public async Task<Medicine?> GetByCodeAsync(string code)
            => await _context.Medicines.FirstOrDefaultAsync(x => x.MedicineCode == code);

        /// <summary>
        /// Tạo mới một loại thuốc
        /// </summary>
        public async Task<Medicine> CreateAsync(Medicine medicine)
        {
            _context.Medicines.Add(medicine);
            await _context.SaveChangesAsync();
            return medicine;
        }

        /// <summary>
        /// Cập nhật thông tin thuốc theo ID
        /// </summary>
        public async Task<Medicine?> UpdateAsync(ulong id, Medicine updated)
        {
            var m = await _context.Medicines.FindAsync(id);
            if (m == null) return null;

            _context.Entry(m).CurrentValues.SetValues(updated);
            await _context.SaveChangesAsync();
            return m;
        }

        /// <summary>
        /// Xóa thuốc theo ID
        /// </summary>
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
