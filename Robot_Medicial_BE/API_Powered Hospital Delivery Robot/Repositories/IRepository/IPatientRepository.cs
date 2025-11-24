using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPatientRepository
    {
        // Lấy toàn bộ danh sách bệnh nhân
        Task<IEnumerable<Patient>> GetAllAsync();

        // Lọc bệnh nhân theo nhiều tiêu chí
        Task<IEnumerable<Patient>> FilterAsync(PatientFilterDto filter);

        // Lấy bệnh nhân theo ID, có thể include phòng và đơn thuốc
        Task<Patient?> GetByIdAsync(ulong id, bool includeRoom = false, bool includePrescriptions = false);

        // Lấy bệnh nhân theo mã bệnh nhân (code)
        Task<Patient?> GetByCodeAsync(string code);

        // Kiểm tra phòng có tồn tại không (dùng khi nhập viện)
        Task<bool> ExistsRoomAsync(ulong roomId);

        // Tạo mới bệnh nhân
        Task<Patient> CreateAsync(Patient patient);

        // Cập nhật thông tin bệnh nhân theo ID
        Task<Patient?> UpdateAsync(ulong id, Patient patient);

        // Cho bệnh nhân xuất viện (có lý do)
        Task<Patient?> DischargeAsync(ulong id, string? reason);

        // Lấy lịch sử nhận thuốc của bệnh nhân
        Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id);
    }
}