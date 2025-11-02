using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IMapService
    {
        Task<IEnumerable<MapResponseDto>> GetAllAsync();
        Task<MapResponseDto?> GetByIdAsync(ulong id);
        Task<MapResponseDto> CreateAsync(MapDto mapDto, IFormFile? imageFile = null); // Hỗ trợ upload
        Task<MapResponseDto?> UpdateAsync(ulong id, MapDto mapDto, IFormFile? imageFile = null);
    }
}
