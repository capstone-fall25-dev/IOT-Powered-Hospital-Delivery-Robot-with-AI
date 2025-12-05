using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý mục thuốc trong đơn thuốc
    /// </summary>
    public class PrescriptionItemRepository : IPrescriptionItemRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public PrescriptionItemRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy một mục thuốc theo ID
        /// </summary>
        public async Task<PrescriptionItem?> GetByIdAsync(ulong id)
            => await _context.PrescriptionItems.FindAsync(id);

        /// <summary>
        /// Lấy tất cả mục thuốc thuộc một đơn thuốc
        /// </summary>
        public async Task<IEnumerable<PrescriptionItem>> GetByPrescriptionAsync(ulong prescriptionId)
            => await _context.PrescriptionItems.Where(x => x.PrescriptionId == prescriptionId).ToListAsync();

        /// <summary>
        /// Tạo mới một mục thuốc
        /// </summary>
        public async Task<PrescriptionItem> CreateAsync(PrescriptionItem item)
        {
            _context.PrescriptionItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// Cập nhật thông tin mục thuốc
        /// </summary>
        public async Task<PrescriptionItem?> UpdateAsync(PrescriptionItem item)
        {
            _context.PrescriptionItems.Update(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// Xóa một mục thuốc theo ID
        /// </summary>
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