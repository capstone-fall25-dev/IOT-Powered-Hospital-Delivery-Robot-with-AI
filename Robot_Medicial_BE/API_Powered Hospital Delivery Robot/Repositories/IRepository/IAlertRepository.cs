using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IAlertRepository
    {
        Task<IEnumerable<Alert>> GetAllAsync(ulong? robotId = null, string? status = null, string? severity = null, ulong? prescriptionItemId = null);
        Task<Alert?> GetByIdAsync(ulong id);
        Task<Alert> CreateAsync(Alert alert);
        Task<Alert?> UpdateAsync(ulong id, Alert alert); // e.g., resolve alert
    }
}
