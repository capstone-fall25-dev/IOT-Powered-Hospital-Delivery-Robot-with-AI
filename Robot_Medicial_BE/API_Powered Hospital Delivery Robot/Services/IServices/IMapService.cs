using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IMapService
    {
        // Lấy danh sách tất cả các bản đồ
        Task<IEnumerable<MapResponseDto>> GetAllAsync();

        // Lấy danh sách bản đồ có robot
        Task<IEnumerable<MapResponseDto>> GetAllWithRobotsAsync();

        // Lấy thông tin một bản đồ theo ID
        Task<MapResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới bản đồ (hỗ trợ upload file ảnh map)
        Task<MapResponseDto> CreateAsync(MapDto mapDto, IFormFile? imageFile = null);

        // Cập nhật thông tin bản đồ (không thay đổi ảnh)
        Task<MapResponseDto?> UpdateAsync(ulong id, MapDto mapDto);

        // Báo lỗi bản đồ (robot phát hiện sai lệch, chướng ngại vật mới...)
        Task<AlertResponseDto> ReportMapErrorAsync(MapErrorDto dto);
    }
}