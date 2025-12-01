using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRobotService
    {
        // Lấy danh sách robot, có thể lọc theo trạng thái (Idle, Busy, Charging...)
        Task<IEnumerable<RobotResponseDto>> GetAllAsync(string? status = null);

        // Lấy thông tin chi tiết một robot theo ID
        Task<RobotResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới robot (kèm cấu hình ngăn chứa)
        Task<RobotResponseDto> CreateAsync(RobotDto robotDto);

        // Cập nhật trạng thái robot theo ID (dùng từ web/app)
        Task<RobotResponseDto?> UpdateStatusAsync(ulong id, UpdateStatusDto statusDto);

        // Gán bản đồ cho robot
        Task<AssignMapResponseDto> AssignMapAsync(ulong robotId, ulong mapId);

        // Cập nhật vị trí hiện tại của robot (từ ROS hoặc GPS)
        Task<RobotResponseDto?> UpdatePositionAsync(ulong id, UpdatePositionDto positionDto);

        // Cập nhật thông tin chung của robot (tên, code, pin, v.v.)
        Task<RobotResponseDto> UpdateAsync(ulong robotId, UpdateRobotDto updateDto);

        // Cập nhật trạng thái robot từ ROS (gửi theo Code thay vì ID)
        Task<RobotResponseDto?> UpdateStatusAsync(RobotStatusUpdateDto dto);

        Task<IEnumerable<RobotResponseDto>> GetByMapAsync(ulong mapId);
    }
}