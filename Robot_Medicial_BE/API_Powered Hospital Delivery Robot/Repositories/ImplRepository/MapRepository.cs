using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class MapRepository : IMapRepository
    {
        private readonly RobotManagerContext _context;

        public MapRepository(RobotManagerContext context)
        {
            _context = context;
        }

        // -------------------------------
        // 📤 Upload (tạo mới map - ROS2 hoặc manual)
        // -------------------------------
        public async Task<Map> UploadAsync(Map map)
        {
            _context.Maps.Add(map);
            await _context.SaveChangesAsync();
            return map;
        }

        // -------------------------------
        // 🧱 Create (tạo map từ giao diện quản trị)
        // -------------------------------
        public async Task<Map> CreateAsync(Map map)
        {
            _context.Maps.Add(map);
            await _context.SaveChangesAsync();
            return map;
        }

        // -------------------------------
        // 📋 Lấy toàn bộ maps
        // -------------------------------
        public async Task<IEnumerable<Map>> GetAllAsync()
        {
            return await _context.Maps
                .AsNoTracking()
                .ToListAsync();
        }

        // -------------------------------
        // 🔍 Lấy map theo ID (tuỳ chọn include robot)
        // -------------------------------
        public async Task<Map?> GetByIdAsync(ulong id, bool includeRobots = false)
        {
            var query = _context.Maps.AsQueryable();

            if (includeRobots)
                query = query.Include(m => m.Robots);

            return await query.FirstOrDefaultAsync(m => m.Id == id);
        }

        // -------------------------------
        // 🖼️ Lấy dữ liệu ảnh map
        // -------------------------------
        public async Task<byte[]?> GetImageAsync(ulong id)
        {
            var map = await _context.Maps
                .AsNoTracking()
                .Select(m => new { m.Id, m.ImageData })
                .FirstOrDefaultAsync(m => m.Id == id);

            return map?.ImageData;
        }

        // -------------------------------
        // 🔍 Kiểm tra trùng tên map
        // -------------------------------
        public async Task<Map?> GetByNameAsync(string mapName)
        {
            return await _context.Maps
                .FirstOrDefaultAsync(m => m.MapName == mapName);
        }

        // -------------------------------
        // ✏️ Cập nhật thông tin map
        // -------------------------------
        public async Task<Map?> UpdateAsync(ulong id, Map map)
        {
            var existing = await _context.Maps.FindAsync(id);
            if (existing == null)
                return null;

            existing.MapName = map.MapName;
            existing.ImageName = map.ImageName;
            existing.Width = map.Width;
            existing.Height = map.Height;
            existing.Resolution = map.Resolution;
            existing.OriginX = map.OriginX;
            existing.OriginY = map.OriginY;
            existing.OriginZ = map.OriginZ;
            existing.Mode = map.Mode;
            existing.Negate = map.Negate;
            existing.OccupiedThresh = map.OccupiedThresh;
            existing.FreeThresh = map.FreeThresh;
            existing.ImageData = map.ImageData;

            await _context.SaveChangesAsync();
            return existing;
        }

        // -------------------------------
        // 🗑️ Xoá map (nếu cần)
        // -------------------------------
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
