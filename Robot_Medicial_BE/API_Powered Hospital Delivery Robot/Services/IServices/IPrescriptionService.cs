using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPrescriptionService
    {
        // Tạo mới đơn thuốc (kèm danh sách các mục thuốc)
        Task<PrescriptionResponseDto> CreateAsync(PrescriptionCreateDto dto);

        // Lấy chi tiết đơn thuốc theo ID
        Task<PrescriptionResponseDto?> GetByIdAsync(ulong id);

        // Lấy danh sách đơn thuốc, có thể lọc theo bệnh nhân và trạng thái
        Task<IEnumerable<PrescriptionResponseDto>> GetAllAsync(ulong? patientId, string? status);

        // Cập nhật thông tin đơn thuốc (ghi chú, trạng thái, mục thuốc...)
        Task<PrescriptionResponseDto> UpdateAsync(ulong id, PrescriptionUpdateDto dto);

        // Xóa mềm đơn thuốc (ẩn khỏi danh sách, vẫn giữ lịch sử)
        Task<bool> SoftDeleteAsync(ulong id);

        // Khôi phục đơn thuốc đã xóa mềm
        Task<bool> RestoreAsync(ulong id);

        // Xác nhận đơn thuốc theo mã code (dùng khi tạo task)
        // Tự động chuyển status thành "approved" (pending/dispensed/approved → approved)
        Task<PrescriptionResponseDto> ApproveByCodeAsync(string prescriptionCode);
    }
}