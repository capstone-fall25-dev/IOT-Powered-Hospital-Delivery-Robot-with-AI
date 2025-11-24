using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IAlertRepository
    {
        // Lấy danh sách cảnh báo, có thể lọc theo robot, trạng thái, mức độ nghiêm trọng, hoặc đơn thuốc
        Task<IEnumerable<Alert>> GetAllAsync(
            ulong? robotId = null,
            string? status = null,
            string? severity = null,
            ulong? prescriptionItemId = null);

        // Lấy một cảnh báo theo ID
        Task<Alert?> GetByIdAsync(ulong id);

        // Tạo mới một cảnh báo
        Task<Alert> CreateAsync(Alert alert);

        // Cập nhật cảnh báo (ví dụ: đánh dấu đã xử lý - resolved)
        Task<Alert?> UpdateAsync(ulong id, Alert alert);
    }
}