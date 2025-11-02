using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRobotService
    {
        Task<IEnumerable<RobotResponseDto>> GetAllAsync(string? status = null);
        Task<RobotResponseDto?> GetByIdAsync(ulong id);
        Task<RobotResponseDto> CreateAsync(RobotDto robotDto);
        Task<RobotResponseDto?> UpdateStatusAsync(ulong id, UpdateStatusDto statusDto);
        Task<AssignMapResponseDto> AssignMapAsync(ulong robotId, ulong mapId);
        Task<RobotResponseDto?> UpdatePositionAsync(ulong id, UpdatePositionDto positionDto);
    }
}
