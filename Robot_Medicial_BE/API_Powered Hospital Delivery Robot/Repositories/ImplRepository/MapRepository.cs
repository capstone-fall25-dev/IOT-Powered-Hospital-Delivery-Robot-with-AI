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

        public async Task<Map> UploadAsync(Map map)
        {
            _context.Maps.Add(map);
            await _context.SaveChangesAsync();
            return map;
        }

        public async Task<Map> CreateAsync(Map map)
        {
            _context.Maps.Add(map);
            await _context.SaveChangesAsync();
            return map;
        }

        public async Task<IEnumerable<Map>> GetAllAsync()
        {
            return await _context.Maps
                .AsNoTracking()
                .Include(m => m.Robots)
                .Include(m => m.Destinations)
                .ToListAsync();
        }

        public async Task<IEnumerable<Map>> GetAllWithRobotsAsync()
        {
            return await _context.Maps
                .AsNoTracking()
                .Include(m => m.Robots)
                .Include(m => m.Destinations)
                .Where(m => m.Robots != null && m.Robots.Any())
                .ToListAsync();
        }

        public async Task<Map?> GetByIdAsync(ulong id, bool includeRobots = false)
        {
            var query = _context.Maps.AsQueryable();
            if (includeRobots) query = query.Include(m => m.Robots);

            query = query
                .Include(m => m.Tasks)
                .Include(m => m.Destinations)
                    .ThenInclude(d => d.TaskStops)
                    .ThenInclude(ts => ts.Task);

            return await query.FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<byte[]?> GetImageAsync(ulong id)
        {
            var map = await _context.Maps
                .AsNoTracking()
                .Select(m => new { m.Id, m.ImageData })
                .FirstOrDefaultAsync(m => m.Id == id);

            return map?.ImageData;
        }

        public async Task<Map?> GetByNameAsync(string mapName)
        {
            return await _context.Maps
                .AsNoTracking() // tránh tracked-stale
                .FirstOrDefaultAsync(m => m.MapName == mapName);
        }

        // 🔧 Cập nhật đầy đủ field và ép EF ghi đè BLOB khi có ảnh mới
        public async Task<Map?> UpdateAsync(ulong id, Map map)
        {
            var existing = await _context.Maps.FirstOrDefaultAsync(m => m.Id == id);
            if (existing == null) return null;

            // Metadata
            existing.MapName        = map.MapName;
            existing.NameMapFE      = map.NameMapFE;
            existing.Mode           = map.Mode;
            existing.Width          = map.Width;
            existing.Height         = map.Height;
            existing.Resolution     = map.Resolution;
            existing.OriginX        = map.OriginX;
            existing.OriginY        = map.OriginY;
            existing.OriginZ        = map.OriginZ;
            existing.OccupiedThresh = map.OccupiedThresh;
            existing.FreeThresh     = map.FreeThresh;
            existing.Negate         = map.Negate;

            // Ảnh: chỉ ghi đè khi client có gửi ảnh mới
            if (map.ImageData != null && map.ImageData.Length > 0)
            {
                existing.ImageData = map.ImageData;
                existing.ImageName = map.ImageName;

                _context.Entry(existing).Property(e => e.ImageData).IsModified = true;
                _context.Entry(existing).Property(e => e.ImageName).IsModified = true;
            }

            // (Nếu có cột UpdatedAt)
            // existing.UpdatedAt = DateTime.UtcNow;
            // _context.Entry(existing).Property(e => e.UpdatedAt).IsModified = true;

            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteAsync(ulong id)
        {
            var map = await _context.Maps.FindAsync(id);
            if (map == null) return false;

            _context.Maps.Remove(map);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
