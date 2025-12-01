using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotRepository
    {
        // Lấy danh sách robot (có thể lọc theo trạng thái)
        Task<IEnumerable<Robot>> GetAllAsync(string? status = null);

        Task<IEnumerable<Robot>> GetAllByMapWithCompartmentsAsync(ulong mapId);

        // Lấy robot theo ID, có thể include các quan hệ
        Task<Robot?> GetByIdAsync(
            ulong id,
            bool includeCompartments = false,
            bool includeTasks = false,
            bool includeTaskStops = false);

        // Lấy robot theo mã code (dùng cho ROS hoặc thiết bị)
        Task<Robot?> GetByCodeAsync(string code);

        // Tạo robot mới
        Task<Robot> CreateAsync(Robot robot);

        // Cập nhật trạng thái robot theo ID
        Task<Robot?> UpdateStatusAsync(ulong id, string status);

        // Cập nhật trạng thái robot theo code (dùng cho ROS)
        Task<Robot?> UpdateStatusAsync(string code, string status);

        // Cập nhật toàn bộ thông tin robot theo ID
        Task<Robot?> UpdateAsync(ulong id, Robot robot);

        // Gán bản đồ cho robot
        Task<Robot?> AssignMapAsync(ulong robotId, ulong mapId);

        // Cập nhật vị trí hiện tại của robot
        Task<Robot?> UpdatePositionAsync(ulong id, decimal lat, decimal lng);

        // Gán map cho robot (tên khác của AssignMapAsync)
        Task<Robot?> AssignMapToRobotAsync(ulong robotId, ulong mapId);

        // Cập nhật robot (truyền trực tiếp entity)
        Task<Robot> UpdateAsync(Robot robot);
    }
}