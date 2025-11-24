using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ILogService
    {
        // Lấy danh sách log, hỗ trợ lọc theo robot, task hoặc loại log
        Task<IEnumerable<LogResponseDto>> GetAllAsync(
            ulong? robotId = null,
            ulong? taskId = null,
            string? logType = null);

        // Lấy một bản ghi log theo ID
        Task<LogResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới một bản ghi log từ DTO
        Task<LogResponseDto> CreateAsync(LogDto logDto);
    }
}