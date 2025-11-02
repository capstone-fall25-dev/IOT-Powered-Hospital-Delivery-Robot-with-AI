using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRoomRepository
    {
        Task<IEnumerable<Room>> GetAllAsync();
        Task<Room?> GetByIdAsync(ulong id);
        Task<Room> CreateAsync(Room room);
        Task<Room?> UpdateAsync(ulong id, Room room);
    }
}
