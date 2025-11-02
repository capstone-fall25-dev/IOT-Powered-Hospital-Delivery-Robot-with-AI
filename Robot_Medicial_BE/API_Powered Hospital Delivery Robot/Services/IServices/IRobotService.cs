using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRobotService
    {
        Task<IEnumerable<RobotResponseDto>> GetAllAsync(string? status = null);
        Task<RobotResponseDto> GetByIdAsync(ulong id);
        Task<RobotResponseDto> CreateAsync(RobotDto robotDto);
        Task<RobotResponseDto> UpdateStatusAsync(ulong id, UpdateStatusDto statusDto);
        Task<RobotResponseDto> UpdateLocationAsync(ulong id, UpdateLocationDto locationDto); 
    }
}
