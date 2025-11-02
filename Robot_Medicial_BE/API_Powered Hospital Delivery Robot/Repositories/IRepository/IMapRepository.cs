using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IMapRepository
    {
        Task<IEnumerable<Map>> GetAllAsync();
        Task<Map?> GetByIdAsync(ulong id, bool includeRobots = false);
        Task<Map?> GetByNameAsync(string mapName); // Check unique
        Task<Map> CreateAsync(Map map);
        Task<Map?> UpdateAsync(ulong id, Map map);
    }
}
