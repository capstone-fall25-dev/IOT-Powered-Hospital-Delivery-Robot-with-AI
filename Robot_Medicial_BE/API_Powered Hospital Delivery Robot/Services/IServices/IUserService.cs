using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Identity.Data;
using Task = System.Threading.Tasks.Task;
namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDto>> GetAllAsync(bool? isActive = null);
        Task<UserResponseDto?> GetByIdAsync(ulong id);
        Task<UserResponseDto> CreateAsync(UserDto userDto);
        Task<UserResponseDto?> UpdateAsync(ulong id, UserDto userDto);
        Task<bool> ToggleActiveAsync(ulong id, bool isActive);


        // interface login, logout, verifil user
        string HashPassword(string password);
       
        Task AddUserAsync(User user);
        Task<User?> GetByUsernameAsync(string username);
        Task UpdateUserAsync(User user);


        Task<string> RegisterAsync(Models.DTOs.RegisterRequest request);
        Task<string> VerifyOtpAsync(VerifyOtpRequest request);
        Task<(string Token, string Message)> LoginAsync(LoginDto request, HttpContext context);
        Task<string> LogoutAsync(HttpContext context, string username);
        Task<string> RequestForgotPasswordAsync(Models.DTOs.ForgotPasswordRequest request);


        Task<string> VerifyForgotPasswordAsync(VerifyForgotPasswordRequest request);
    }
}
