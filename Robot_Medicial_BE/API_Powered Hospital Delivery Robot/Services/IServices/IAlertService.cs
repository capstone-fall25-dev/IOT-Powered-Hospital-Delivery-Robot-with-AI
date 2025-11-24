using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IAlertService
    {
        // Lấy danh sách cảnh báo, hỗ trợ nhiều bộ lọc
        Task<IEnumerable<AlertResponseDto>> GetAllAsync(
            ulong? robotId = null,
            string? status = null,
            string? severity = null,
            ulong? prescriptionItemId = null);

        // Lấy một cảnh báo theo ID
        Task<AlertResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới cảnh báo từ DTO
        Task<AlertResponseDto> CreateAsync(AlertDto alertDto);

        // Cập nhật cảnh báo (ví dụ: resolve, cập nhật mô tả...)
        Task<AlertResponseDto?> UpdateAsync(ulong id, AlertDto alertDto);

        // Tạo cảnh báo đặc biệt khi thuốc bị hỏng, quá hạn, nhiệt độ không đảm bảo...
        Task<AlertResponseDto> CreateMedicineAlertAsync(
            ulong prescriptionItemId,
            string reason,
            string description,
            ulong? taskId = null);
    }
}