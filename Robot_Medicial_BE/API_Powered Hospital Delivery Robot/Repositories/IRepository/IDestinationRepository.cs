using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IDestinationRepository
    {
        Task<IEnumerable<Destination>> GetAllAsync();
        Task<Destination?> GetByIdAsync(ulong id);
        Task<Destination?> GetByNameAsync(string name); // check unique
        Task<Destination> CreateAsync(Destination destination);
        Task<Destination?> UpdateAsync(ulong id, Destination destination);
    }
}
