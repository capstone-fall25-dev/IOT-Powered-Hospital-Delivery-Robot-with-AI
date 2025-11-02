using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRobotMaintenanceLogService
    {
        Task<IEnumerable<RobotMaintenanceLogResponseDto>> GetAllAsync(ulong? robotId = null);
        Task<RobotMaintenanceLogResponseDto?> GetByIdAsync(ulong id);
        Task<RobotMaintenanceLogResponseDto> CreateAsync(RobotMaintenanceLogDto logDto);
    }
}
