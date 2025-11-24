using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IDestinationService
    {
        // Lấy danh sách điểm đến, có thể lọc theo khu vực hoặc tầng
        Task<IEnumerable<DestinationResponseDto>> GetAllAsync(string? area = null, string? floor = null);

        // Lấy thông tin một điểm đến theo ID
        Task<DestinationResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới điểm đến (phòng, quầy, khoa, trạm sạc...)
        Task<DestinationResponseDto> CreateAsync(DestinationDto dto);

        // Cập nhật thông tin điểm đến
        Task<DestinationResponseDto?> UpdateAsync(ulong id, DestinationDto dto);

        // Lấy tọa độ vị trí của điểm đến (dùng để robot di chuyển)
        Task<DestinationPositionDto?> GetPositionByIdAsync(ulong destinationId);
    }
}