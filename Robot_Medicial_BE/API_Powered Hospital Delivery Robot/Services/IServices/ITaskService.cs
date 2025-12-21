using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskService
    {
        // Lấy danh sách task (dạng nhẹ cho danh sách)
        // Chỉ hiển thị nhiệm vụ của user hiện tại, trừ admin có thể xem tất cả
        Task<IEnumerable<TaskListItemDto>> GetAllAsync(TaskFilterDto? filter, ulong currentUserId, string currentUserRole);

        // Lấy chi tiết một task theo ID
        // Chỉ user tạo task hoặc admin mới có quyền xem
        Task<TaskDetailDto?> GetByIdAsync(ulong id, ulong currentUserId, string currentUserRole);

        // Tạo mới task giao thuốc/thực phẩm
        Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, ulong currentUserId);

        // Lấy dữ liệu để chỉnh sửa task (dùng cho form edit)
        // Chỉ user tạo task hoặc admin mới có quyền xem/sửa
        Task<TaskEditDto?> GetEditDataAsync(ulong id, ulong currentUserId, string currentUserRole);

        // Cập nhật thông tin task
        Task<TaskResponseDto?> UpdateAsync(ulong id, UpdateTaskDto dto);

        // Xóa task (chỉ khi chưa bắt đầu)
        Task<bool> DeleteAsync(ulong id);

        // Lấy thông tin để robot thực hiện task (tọa độ, stops, ngăn chứa...)
        Task<RunTaskInfoDto?> GetRunInfoAsync(ulong taskId, ulong currentUserId, string currentUserRole);

        // Cập nhật trạng thái một điểm dừng (đã đến, đang giao, hoàn thành...)
        Task<bool> UpdateStopStatusAsync(ulong taskId, ulong stopId, string newStatus);

        // Hoàn thành toàn bộ task (robot báo xong, xác nhận giao thành công)
        Task<StopUpdateResultDto> CompleteTaskAsync(ulong taskId);

        // Bắt đầu nhiệm vụ
        Task<TaskResponseDto?> StartTaskAsync(ulong taskId, ulong currentUserId, string currentUserRole);
        
        // Tự động hủy các nhiệm vụ quá hạn chưa bắt đầu
        Task CancelOverduePendingTasksAsync();

        // Hủy nhiệm vụ (giải phóng compartments, đưa robot về trạm, lưu vào DB)
        Task<TaskResponseDto?> CancelTaskAsync(ulong taskId, string? reason = null);

        // Kiểm tra robot có task pending không
        Task<bool> HasRobotPendingTaskAsync(ulong robotId);
    }
}