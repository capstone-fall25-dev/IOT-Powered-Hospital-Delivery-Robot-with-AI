using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IDestinationService
    {
        Task<IEnumerable<DestinationResponseDto>> GetAllAsync(string? area = null, string? floor = null);
        Task<DestinationResponseDto?> GetByIdAsync(ulong id);
        Task<DestinationResponseDto> CreateAsync(DestinationDto dto);
        Task<DestinationResponseDto?> UpdateAsync(ulong id, DestinationDto dto);
    }
}
