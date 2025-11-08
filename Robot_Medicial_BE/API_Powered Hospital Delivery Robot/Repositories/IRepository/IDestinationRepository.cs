using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IDestinationRepository
    {
        Task<IEnumerable<Destination>> GetAllAsync(string? area = null, string? floor = null);
        Task<Destination?> GetByIdAsync(ulong id);
        Task<Destination?> GetByNameAsync(string name);
        Task<Destination> CreateAsync(Destination destination);
        Task<Destination?> UpdateAsync(ulong id, Destination destination);

           Task<DestinationPositionDto?> GetPositionByIdAsync(ulong destinationId);
    }
}
