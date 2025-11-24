using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRobotMaintenanceLogService
    {
        // Lấy danh sách nhật ký bảo trì, có thể lọc theo robot
        Task<IEnumerable<RobotMaintenanceLogResponseDto>> GetAllAsync(ulong? robotId = null);

        // Lấy một bản ghi bảo trì theo ID
        Task<RobotMaintenanceLogResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới bản ghi bảo trì (sửa chữa, thay pin, vệ sinh...)
        Task<RobotMaintenanceLogResponseDto> CreateAsync(RobotMaintenanceLogDto logDto);
    }
}