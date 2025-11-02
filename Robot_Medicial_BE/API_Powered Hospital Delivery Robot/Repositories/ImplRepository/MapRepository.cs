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

        public async Task<Map> CreateAsync(Map map)
        {
            _context.Maps.Add(map);
            await _context.SaveChangesAsync();
            return map;
        }

        public async Task<IEnumerable<Map>> GetAllAsync()
        {
            return await _context.Maps.ToListAsync();
        }

        public async Task<Map?> GetByIdAsync(ulong id, bool includeRobots = false)
        {
            var query = _context.Maps.AsQueryable();
            if (includeRobots)
            {
                query = query.Include(m => m.Robots);
            }

            return await query.FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<Map?> GetByNameAsync(string mapName)
        {
            return await _context.Maps.FirstOrDefaultAsync(m => m.MapName == mapName);
        }

        public async Task<Map?> UpdateAsync(ulong id, Map map)
        {
            var existing = await _context.Maps.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

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
            existing.ImageData = map.ImageData; // Update nếu upload mới

            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
