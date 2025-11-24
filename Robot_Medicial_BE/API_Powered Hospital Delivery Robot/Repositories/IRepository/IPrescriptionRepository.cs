using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IPrescriptionRepository
    {
        // Lấy danh sách đơn thuốc (có thể lọc theo bệnh nhân và trạng thái)
        Task<IEnumerable<Prescription>> GetAllAsync(ulong? patientId, string? status);

        // Lấy đơn thuốc theo ID, có thể include chi tiết thuốc và bệnh nhân
        Task<Prescription?> GetByIdAsync(ulong id, bool includeItems = false, bool includePatient = false);

        // Lấy đơn thuốc theo mã code
        Task<Prescription?> GetByCodeAsync(string code);

        // Tạo mới đơn thuốc
        Task<Prescription> CreateAsync(Prescription pres);

        // Cập nhật đơn thuốc
        Task<Prescription?> UpdateAsync(Prescription pres);

        // Xóa mềm đơn thuốc (đánh dấu IsDeleted = true)
        Task<bool> SoftDeleteAsync(ulong id);

        // Khôi phục đơn thuốc đã xóa mềm
        Task<bool> RestoreAsync(ulong id);
    }
}