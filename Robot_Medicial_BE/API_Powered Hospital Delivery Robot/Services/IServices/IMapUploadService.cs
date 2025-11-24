using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    // Chuyên xử lý upload bản đồ
    public interface IMapUploadService
    {
        // Upload bản đồ mới từ ROS2 hoặc client (hỗ trợ file ảnh)
        Task<MapResponseDto> UploadAsync(MapUploadDto dto, IFormFile? imageFile = null);
    }
}