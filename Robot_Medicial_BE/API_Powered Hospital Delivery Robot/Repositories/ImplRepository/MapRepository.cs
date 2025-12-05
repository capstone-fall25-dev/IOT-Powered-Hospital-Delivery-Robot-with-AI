using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý bản đồ
    /// </summary>
    public class MapRepository : IMapRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public MapRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Upload bản đồ mới (từ ROS2 hoặc manual)
        /// </summary>
        public async Task<Map> UploadAsync(Map map)
        {
            _context.Maps.Add(map);
            await _context.SaveChangesAsync();
            return map;
        }

        /// <summary>
        /// Tạo map từ giao diện quản trị
        /// </summary>
        public async Task<Map> CreateAsync(Map map)
        {
            _context.Maps.Add(map);
            await _context.SaveChangesAsync();
            return map;
        }

        /// <summary>
        /// Lấy danh sách tất cả các bản đồ
        /// </summary>
        public async Task<IEnumerable<Map>> GetAllAsync()
        {
            return await _context.Maps
                .AsNoTracking()
                .Include(m => m.Robots)
                .Include(m => m.Destinations)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy bản đồ theo ID (có thể include danh sách robot đang dùng)
        /// </summary>
        public async Task<Map?> GetByIdAsync(ulong id, bool includeRobots = false)
        {
            var query = _context.Maps.AsQueryable();
            if (includeRobots)
                query = query.Include(m => m.Robots);

            query = query.Include(m => m.Tasks)
                         .Include(m => m.Destinations)
                         .ThenInclude(d => d.TaskStops)
                         .ThenInclude(ts => ts.Task);

            return await query.FirstOrDefaultAsync(m => m.Id == id);
        }

        /// <summary>
        /// Lấy dữ liệu ảnh (image bytes) của bản đồ
        /// </summary>
        public async Task<byte[]?> GetImageAsync(ulong id)
        {
            var map = await _context.Maps
                .AsNoTracking()
                .Select(m => new { m.Id, m.ImageData })
                .FirstOrDefaultAsync(m => m.Id == id);

            return map?.ImageData;
        }

        /// <summary>
        /// Lấy bản đồ theo tên (dùng để kiểm tra trùng)
        /// </summary>
        public async Task<Map?> GetByNameAsync(string mapName)
        {
            return await _context.Maps
                .FirstOrDefaultAsync(m => m.MapName == mapName);
        }

        /// <summary>
        /// Cập nhật bản đồ theo ID
        /// </summary>
        public async Task<Map?> UpdateAsync(ulong id, Map map)
        {
            var existing = await _context.Maps.FindAsync(id);
            if (existing == null)
                return null;

            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Xóa bản đồ theo ID
        /// </summary>
        public async Task<bool> DeleteAsync(ulong id)
        {
            var map = await _context.Maps.FindAsync(id);
            if (map == null)
                return false;

            _context.Maps.Remove(map);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
