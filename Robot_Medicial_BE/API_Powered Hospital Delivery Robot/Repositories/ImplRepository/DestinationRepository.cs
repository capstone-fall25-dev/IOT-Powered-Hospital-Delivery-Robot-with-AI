using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class DestinationRepository : IDestinationRepository
    {
        private readonly RobotmanagerContext _context;

        public DestinationRepository(RobotmanagerContext context)
        {
            _context = context;
        }

        public async Task<Destination> CreateAsync(Destination destination)
        {
            _context.Destinations.Add(destination);
            await _context.SaveChangesAsync();
            return destination;
        }

        public async Task<IEnumerable<Destination>> GetAllAsync()
        {
            return await _context.Destinations.ToListAsync();
        }

        public async Task<Destination?> GetByIdAsync(ulong id)
        {
            return await _context.Destinations.FindAsync(id);
        }

        public async Task<Destination?> GetByNameAsync(string name)
        {
            return await _context.Destinations.FirstOrDefaultAsync(d => d.Name == name);
        }

        public async Task<Destination?> UpdateAsync(ulong id, Destination destination)
        {
            var existing = await _context.Destinations.FindAsync(id);
            if (existing == null)
            {
                return null;
            }

            existing.Name = destination.Name;
            existing.Area = destination.Area;
            existing.Floor = destination.Floor;
            //existing.UpdatedAt = DateTime.UtcNow; // Thêm UpdatedAt nếu model có (hiện không có, nhưng có thể extend)
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
