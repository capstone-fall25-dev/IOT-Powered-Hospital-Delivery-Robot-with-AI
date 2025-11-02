using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPrescriptionRepository
    {
        Task<IEnumerable<Prescription>> GetAllAsync(ulong? patientId = null, string? status = null);
        Task<Prescription?> GetByIdAsync(ulong id, bool includeItems = false, bool includePatient = false);
        Task<Prescription?> GetByCodeAsync(string prescriptionCode);
        Task<Prescription> CreateAsync(Prescription prescription);
        Task<Prescription?> UpdateAsync(ulong id, Prescription prescription);
        Task<PrescriptionItem> AddItemToPrescriptionAsync(ulong prescriptionId, PrescriptionItem item);
        Task<bool> AssignPrescriptionToTaskAsync(ulong prescriptionId, ulong taskId); // Gán vào TaskPatientAssignment
    }
}
