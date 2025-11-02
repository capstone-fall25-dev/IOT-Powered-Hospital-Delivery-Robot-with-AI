using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDto>> GetAllAsync(bool? isActive = null);
        Task<UserResponseDto?> GetByIdAsync(ulong id); // Include Tasks & ActiveSessions
        Task<UserStatusDto> GetUserStatusAsync(ulong id); // Real-time status
        Task<UserResponseDto> CreateAsync(UserDto userDto);
        Task<UserResponseDto?> UpdateAsync(ulong id, UserDto userDto);
        Task<bool> ToggleActiveAsync(ulong id, bool isActive);
    }
}
