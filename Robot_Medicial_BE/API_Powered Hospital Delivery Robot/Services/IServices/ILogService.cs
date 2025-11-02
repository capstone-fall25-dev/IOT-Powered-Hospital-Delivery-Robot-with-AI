using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ILogService
    {
        Task<IEnumerable<LogResponseDto>> GetAllAsync(ulong? robotId = null, ulong? taskId = null, string? logType = null);
        Task<LogResponseDto?> GetByIdAsync(ulong id);
        Task<LogResponseDto> CreateAsync(LogDto logDto);
    }
}
