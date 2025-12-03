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
                .Include(m => m.Robots)
                .Include(m => m.Destinations)
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

            query = query.Include(m => m.Tasks)
                         .Include(m => m.Destinations)
                         .ThenInclude(d => d.TaskStops)
                         .ThenInclude(ts => ts.Task);

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
        // ✏️ Cập nhật thông tin map (không sửa MapName và ImageData)
        // -------------------------------
        public async Task<Map?> UpdateAsync(ulong id, Map map)
        {
            var existing = await _context.Maps.FindAsync(id);
            if (existing == null)
                return null;

            // Vì map là existing đã được update từ service, chỉ cần save
            // (Không cần manual set từng field nữa, vì _mapper.Map đã set vào existing)
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
