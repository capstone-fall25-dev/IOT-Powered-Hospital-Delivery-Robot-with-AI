using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ICompartmentAssignmentService
    {
        // Lấy danh sách phân bổ ngăn chứa, có thể lọc theo task hoặc trạng thái
        Task<IEnumerable<CompartmentAssignmentResponseDto>> GetAllAsync(ulong? taskId = null, string? status = null);

        // Lấy một bản ghi phân bổ theo ID
        Task<CompartmentAssignmentResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới một phân bổ ngăn chứa
        Task<CompartmentAssignmentResponseDto> CreateAsync(CompartmentAssignmentDto assignmentDto);

        // Cập nhật thông tin phân bổ ngăn chứa
        Task<CompartmentAssignmentResponseDto?> UpdateAsync(ulong id, CompartmentAssignmentDto assignmentDto);

        // Xác nhận đã nạp hàng vào ngăn chứa (load thuốc/thực phẩm)
        Task<CompartmentAssignmentResponseDto?> LoadAsync(ulong id, LoadCompartmentDto loadDto);

        // Nạp hàng hàng loạt cho nhiều ngăn chứa của một task
        Task<IEnumerable<CompartmentAssignmentResponseDto>> BulkLoadForTaskAsync(
            ulong taskId,
            List<LoadCompartmentDto> loadDtos);
    }
}