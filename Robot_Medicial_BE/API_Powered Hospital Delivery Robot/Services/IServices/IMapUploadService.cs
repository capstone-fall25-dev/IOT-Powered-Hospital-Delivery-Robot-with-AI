using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    // Chuyên xử lý upload bản đồ
    public interface IMapUploadService
    {
         /// <summary>
        /// Upload bản đồ mới từ ROS2 hoặc client (hỗ trợ upload file ảnh).  
        /// Nếu trùng tên → update metadata và ảnh (nếu có).
        /// </summary>
        Task<MapResponseDto> UploadAsync(MapUploadDto dto, IFormFile? imageFile = null);

        /// <summary>
        /// Upload bản đồ ở dạng JSON (base64 ảnh).  
        /// Trùng tên → update toàn bộ; không gửi ảnh → giữ ảnh cũ.
        /// </summary>
        Task<MapResponseDto> UploadJsonAsync(MapUploadJsonDto dto);
    }
}