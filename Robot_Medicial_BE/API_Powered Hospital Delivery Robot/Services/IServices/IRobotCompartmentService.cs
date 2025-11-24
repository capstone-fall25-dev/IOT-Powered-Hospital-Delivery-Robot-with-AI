using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRobotCompartmentService
    {
        // Mở ngăn chứa (gọi ROS hoặc hardware để mở khóa)
        Task<RobotCompartmentResponseDto?> OpenCompartmentAsync(ulong id);

        // Đóng ngăn chứa (sau khi lấy thuốc xong)
        Task<RobotCompartmentResponseDto?> CloseCompartmentAsync(ulong id);

        // Lấy các ngăn chứa theo danh mục và robot (ví dụ: thuốc lạnh, thuốc thường)
        Task<IEnumerable<RobotCompartmentResponseDto>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId);

        // Lấy tất cả ngăn chứa của một robot
        Task<IEnumerable<RobotCompartmentResponseDto>> GetByRobotAsync(ulong robotId);

        // Lấy ngăn chứa của robot, có thể lọc theo danh mục
        Task<IEnumerable<RobotCompartmentResponseDto>> GetFilteredByRobotAsync(ulong robotId, ulong? categoryId);
    }
}