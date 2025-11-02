using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotRepository
    {
        Task<IEnumerable<Robot>> GetAllAsync(string? status = null); 
        Task<Robot?> GetByIdAsync(ulong id);
        Task<Robot?> GetByCodeAsync(string code); 
        Task<Robot> CreateAsync(Robot robot);
        Task<Robot?> UpdateStatusAsync(ulong id, string status);
        Task<Robot?> UpdateAsync(ulong id, Robot robot);
    }
}
