using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Http;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IMapUploadService
    {
        Task<MapResponseDto> UploadAsync(MapUploadDto dto, IFormFile? imageFile = null);
    }
}
