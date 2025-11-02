using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class RoomRepository : IRoomRepository
    {
        private readonly RobotManagerContext _context;

        public RoomRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<Room> CreateAsync(Room room)
        {
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();
            return room;
        }

        public async Task<IEnumerable<Room>> GetAllAsync()
        {
            return await _context.Rooms.ToListAsync();
        }

        public async Task<Room?> GetByIdAsync(ulong id)
        {
            return await _context.Rooms.FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<Room?> UpdateAsync(ulong id, Room room)
        {
            var existing = await _context.Rooms.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.RoomName = room.RoomName;
            existing.Longitude = room.Longitude;
            existing.Latitude = room.Latitude;
            existing.MapId = room.MapId;

            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
