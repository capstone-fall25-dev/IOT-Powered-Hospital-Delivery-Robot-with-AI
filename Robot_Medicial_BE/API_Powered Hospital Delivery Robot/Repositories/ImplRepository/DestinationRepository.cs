using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý điểm đến
    /// </summary>
    public class DestinationRepository : IDestinationRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public DestinationRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo mới một điểm đến
        /// </summary>
        public async Task<Destination> CreateAsync(Destination destination)
        {
            _context.Destinations.Add(destination);
            await _context.SaveChangesAsync();
            return destination;
        }

        /// <summary>
        /// Lấy danh sách điểm đến (có thể lọc theo khu vực hoặc tầng)
        /// </summary>
        public async Task<IEnumerable<Destination>> GetAllAsync(string? area = null, string? floor = null)
        {
            var query = _context.Destinations.AsQueryable();
            if (!string.IsNullOrEmpty(area)) query = query.Where(d => d.Area == area);
            if (!string.IsNullOrEmpty(floor)) query = query.Where(d => d.Floor == floor);
            return await query.ToListAsync();
        }

        /// <summary>
        /// Lấy điểm đến theo ID
        /// </summary>
        public async Task<Destination?> GetByIdAsync(ulong id)
        {
            return await _context.Destinations.FindAsync(id);
        }

        /// <summary>
        /// Lấy điểm đến theo tên
        /// </summary>
        public async Task<Destination?> GetByNameAsync(string name)
        {
            return await _context.Destinations.FirstOrDefaultAsync(d => d.Name == name);
        }

        /// <summary>
        /// Cập nhật thông tin điểm đến theo ID
        /// </summary>
        public async Task<Destination?> UpdateAsync(ulong id, Destination destination)
        {
            var existing = await _context.Destinations.FindAsync(id);
            if (existing == null) return null;

            existing.Name = destination.Name;
            existing.Area = destination.Area;
            existing.Floor = destination.Floor;
            existing.X = destination.X;
            existing.Y = destination.Y;
            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Lấy tọa độ vị trí của điểm đến (dùng cho robot di chuyển)
        /// </summary>
        public async Task<DestinationPositionDto?> GetPositionByIdAsync(ulong destinationId)
        {
            return await _context.Destinations
                .Where(d => d.Id == destinationId)
                .Select(d => new DestinationPositionDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    X = d.X ?? 0,
                    Y = d.Y ?? 0,
                    Area = d.Area,
                    Floor = d.Floor
                })
                .FirstOrDefaultAsync();
        }
    }
}
