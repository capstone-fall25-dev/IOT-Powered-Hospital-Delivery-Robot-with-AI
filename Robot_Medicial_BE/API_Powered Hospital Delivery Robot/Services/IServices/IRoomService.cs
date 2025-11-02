using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRoomService
    {
        Task<IEnumerable<RoomResponseDto>> GetAllAsync();
        Task<RoomResponseDto?> GetByIdAsync(ulong id);
        Task<RoomResponseDto> CreateAsync(RoomDto roomDto);
        Task<RoomResponseDto?> UpdateAsync(ulong id, RoomDto roomDto);
    }
}
