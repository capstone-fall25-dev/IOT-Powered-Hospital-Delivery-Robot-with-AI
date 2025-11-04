using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPatientRepository
    {
        Task<IEnumerable<Patient>> GetAllAsync();
        Task<Patient?> GetByIdAsync(ulong id, bool includeRoom = false, bool includePrescriptions = false);
        Task<Patient?> GetByCodeAsync(string patientCode);
        Task<Patient> CreateAsync(Patient patient);
        Task<Patient?> UpdateAsync(ulong id, Patient patient);
        Task<Patient?> DischargeAsync(ulong id);
        Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong patientId);
    }
}
