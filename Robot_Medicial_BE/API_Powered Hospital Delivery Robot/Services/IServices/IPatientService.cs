using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPatientService
    {
        // Lấy danh sách tất cả bệnh nhân
        Task<IEnumerable<PatientResponseDto>> GetAllAsync();

        // Lọc bệnh nhân theo nhiều tiêu chí (phòng, trạng thái, tên...)
        Task<IEnumerable<PatientResponseDto>> FilterAsync(PatientFilterDto filter);

        // Lấy thông tin chi tiết bệnh nhân theo ID
        Task<PatientResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới bệnh nhân (nhập viện)
        Task<PatientResponseDto> CreateAsync(PatientCreateDto dto);

        // Cập nhật thông tin bệnh nhân
        Task<PatientResponseDto?> UpdateAsync(ulong id, PatientUpdateDto dto);

        // Cho bệnh nhân xuất viện
        Task<PatientResponseDto?> DischargeAsync(ulong id, string? reason);

        // Lấy lịch sử nhận thuốc của bệnh nhân
        Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id);

        // Lấy báo cáo tổng hợp về bệnh nhân (thuốc đã giao, task, trạng thái...)
        Task<PatientReportDto> GetReportAsync(ulong id);

        // Lấy danh sách bệnh nhân có đơn thuốc đã được duyệt
        Task<IEnumerable<PatientResponseDto>> GetPatientsWithApprovedPrescriptionAsync();
    }
}