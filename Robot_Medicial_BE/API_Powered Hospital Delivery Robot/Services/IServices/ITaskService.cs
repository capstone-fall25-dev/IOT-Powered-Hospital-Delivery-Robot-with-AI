using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskService
    {
        // Lấy danh sách task (dạng nhẹ cho danh sách)
        Task<IEnumerable<TaskListItemDto>> GetAllAsync(TaskFilterDto? filter);

        // Lấy chi tiết một task theo ID
        Task<TaskDetailDto?> GetByIdAsync(ulong id);

        // Tạo mới task giao thuốc/thực phẩm
        Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, ulong currentUserId);

        // Lấy dữ liệu để chỉnh sửa task (dùng cho form edit)
        Task<TaskEditDto?> GetEditDataAsync(ulong id);

        // Cập nhật thông tin task
        Task<TaskResponseDto?> UpdateAsync(ulong id, UpdateTaskDto dto);

        // Xóa task (chỉ khi chưa bắt đầu)
        Task<bool> DeleteAsync(ulong id);

        // Lấy thông tin để robot thực hiện task (tọa độ, stops, ngăn chứa...)
        Task<RunTaskInfoDto?> GetRunInfoAsync(ulong taskId);

        // Cập nhật trạng thái một điểm dừng (đã đến, đang giao, hoàn thành...)
        Task<bool> UpdateStopStatusAsync(ulong taskId, ulong stopId, string newStatus);

        // Hoàn thành toàn bộ task (robot báo xong, xác nhận giao thành công)
        Task<StopUpdateResultDto> CompleteTaskAsync(ulong taskId);
    }
}