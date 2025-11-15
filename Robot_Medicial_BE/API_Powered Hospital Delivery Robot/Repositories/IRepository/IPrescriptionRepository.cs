using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPrescriptionRepository
    {
        Task<IEnumerable<Prescription>> GetAllAsync(ulong? patientId, string? status);
        Task<Prescription?> GetByIdAsync(ulong id, bool includeItems = false, bool includePatient = false);
        Task<Prescription?> GetByCodeAsync(string code);
        Task<Prescription> CreateAsync(Prescription pres);
        Task<Prescription?> UpdateAsync(Prescription pres);
        Task<bool> SoftDeleteAsync(ulong id);
        Task<bool> RestoreAsync(ulong id);
    }
}
