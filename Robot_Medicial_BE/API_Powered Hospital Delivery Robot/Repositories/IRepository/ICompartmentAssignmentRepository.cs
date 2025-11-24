using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ICompartmentAssignmentRepository
    {
        // Lấy danh sách phân bổ ngăn chứa, có thể lọc theo task hoặc trạng thái
        Task<IEnumerable<CompartmentAssignment>> GetAllAsync(ulong? taskId = null, string? status = null);

        // Lấy một bản ghi phân bổ theo ID
        Task<CompartmentAssignment?> GetByIdAsync(ulong id);

        // Tạo mới phân bổ ngăn chứa cho task
        Task<CompartmentAssignment> CreateAsync(CompartmentAssignment assignment);

        // Cập nhật thông tin phân bổ theo ID
        Task<CompartmentAssignment?> UpdateAsync(ulong id, CompartmentAssignment assignment);

        // Cập nhật trạng thái đã nạp hàng (item đã được đặt vào ngăn)
        Task<CompartmentAssignment?> UpdateLoadStatusAsync(ulong id, string itemDesc);
    }
}