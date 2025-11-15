using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPatientService
    {
        Task<IEnumerable<PatientResponseDto>> GetAllAsync();
        Task<IEnumerable<PatientResponseDto>> FilterAsync(PatientFilterDto filter);

        Task<PatientResponseDto?> GetByIdAsync(ulong id);

        Task<PatientResponseDto> CreateAsync(PatientCreateDto dto);
        Task<PatientResponseDto?> UpdateAsync(ulong id, PatientUpdateDto dto);

        Task<PatientResponseDto?> DischargeAsync(ulong id, string? reason);

        Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id);
        Task<PatientReportDto> GetReportAsync(ulong id);
    }
}
