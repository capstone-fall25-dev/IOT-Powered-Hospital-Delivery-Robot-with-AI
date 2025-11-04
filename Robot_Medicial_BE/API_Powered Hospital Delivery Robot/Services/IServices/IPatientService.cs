using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPatientService
    {
        Task<IEnumerable<PatientResponseDto>> GetAllAsync();
        Task<PatientResponseDto?> GetByIdAsync(ulong id);
        Task<PatientResponseDto> CreateAsync(PatientDto patientDto);
        Task<PatientResponseDto?> UpdateAsync(ulong id, PatientDto patientDto);
        Task<PatientResponseDto?> DischargeAsync(ulong id);
        Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id);
        Task<PatientReportDto> GetReportAsync(ulong id);
    }
}
