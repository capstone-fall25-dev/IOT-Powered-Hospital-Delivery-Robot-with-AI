using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Task = System.Threading.Tasks.Task;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IUserService
    {
        // Lấy danh sách người dùng (có thể lọc theo trạng thái hoạt động)
        Task<IEnumerable<UserResponseDto>> GetAllAsync(bool? isActive = null);

        // Lấy thông tin chi tiết người dùng theo ID (có thể include Tasks & Sessions)
        Task<UserResponseDto?> GetByIdAsync(ulong id);

        // Lấy trạng thái thực tế của user (đang online/offline, session hiện tại...)
        Task<UserStatusDto> GetUserStatusAsync(ulong id);

        // Tạo mới người dùng (admin tạo hoặc đăng ký)
        Task<UserResponseDto> CreateAsync(UserDto userDto);

        // Cập nhật thông tin người dùng
        Task<UserResponseDto?> UpdateAsync(ulong id, UserDto userDto);

        // Kích hoạt / vô hiệu hóa tài khoản
        Task<bool> ToggleActiveAsync(ulong id, bool isActive);

        // Băm mật khẩu (dùng cho register và reset password)
        string HashPassword(string password);

        // Thêm user trực tiếp vào DB (dùng trong register)
        Task AddUserAsync(User user);

        // Lấy user theo email (dùng trong login, forgot password)
        Task<User?> GetByEmailAsync(string email);

        // Cập nhật entity user (sau khi thay đổi)
        Task UpdateUserAsync(User user);

        // Đăng ký tài khoản mới (gửi OTP)
        Task<string> RegisterAsync(RegisterRequest request);

        // Xác thực OTP khi đăng ký
        Task<string> VerifyOtpAsync(VerifyOtpRequest request);

        // Đăng nhập (trả về JWT token)
        Task<(string Token, string Message)> LoginAsync(LoginDto request, HttpContext context);

        // Đăng xuất (xóa refresh token, session)
        Task<string> LogoutAsync(HttpContext context, string username);

        // Yêu cầu quên mật khẩu (gửi OTP qua email)
        Task<string> RequestForgotPasswordAsync(ForgotPasswordRequest request);

        // Xác thực OTP quên mật khẩu

        // Xác thực OTP quên mật khẩu (bước 1: verify OTP → trả về reset token nếu hợp lệ)
        Task<(bool Success, string Message, string? Token)> VerifyForgotPasswordOtpAsync(VerifyForgotPasswordOtpRequest request);

        // Đặt lại mật khẩu bằng token tạm thời (bước 2: dùng token để đổi mật khẩu mới)
        Task<(bool Success, string Message)> ResetPasswordAsync(ResetPasswordRequest request);
        // Admin reset mật khẩu người dùng (gửi mật khẩu mới qua email)
        Task<string> AdminResetPasswordAsync(string email);

        // Lấy profile của user theo email
        Task<ProfileResponseDto?> GetProfileByEmailAsync(string email);

        // Update profile (không cho đổi email, role)
        Task<ProfileResponseDto?> UpdateProfileAsync(string email, UpdateProfileDto dto);

        // Đổi mật khẩu
        Task<string> ChangePasswordAsync(string email, ChangePasswordDto dto);

        // Đăng xuất (hủy session theo token)
        Task LogoutAsync(string token);
        
        // Buộc đăng xuất tất cả session của nhân viên
        Task<object> ForceLogoutAllSessionsAsync(ulong userId);
    }
}
