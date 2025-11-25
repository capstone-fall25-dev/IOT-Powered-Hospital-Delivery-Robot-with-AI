using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;

        public AuthController(IUserService userService)
        {
            _userService = userService;
        }

        // Tạo tài khoản mới (gửi OTP qua email/sms)
        [HttpPost("provide-account")]
        [AllowAnonymous]
        public async Task<IActionResult> ProvideAccount([FromBody] RegisterRequest request)
        {
            var result = await _userService.RegisterAsync(request);
            return Ok(new { message = result });
        }

        // Xác thực OTP để kích hoạt tài khoản
        [HttpPatch("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            var result = await _userService.VerifyOtpAsync(request);
            return Ok(new { message = result });
        }

        // Đăng nhập hệ thống
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var (token, message) = await _userService.LoginAsync(request, HttpContext);

            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { message });

            return Ok(new { token, message });
        }
       

        // Yêu cầu quên mật khẩu (gửi OTP đặt lại)
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var result = await _userService.RequestForgotPasswordAsync(request);
            return Ok(new { message = result });
        }

        // Xác nhận OTP và đặt lại mật khẩu
        [HttpPost("verify-forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyForgotPassword([FromBody] VerifyForgotPasswordRequest request)
        {
            var result = await _userService.VerifyForgotPasswordAsync(request);
            return Ok(new { message = result });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var authHeader = Request.Headers.Authorization.FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return BadRequest(new { message = "Thiếu token." });

            var token = authHeader["Bearer ".Length..].Trim();
            await _userService.LogoutAsync(token);

            return Ok(new { message = "Đăng xuất thành công!" });
        }

        [HttpGet("check-login-status")]
        [Authorize]
        public async Task<IActionResult> CheckLoginStatus()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value
                        ?? User.FindFirst("email")?.Value;

            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Token không hợp lệ." });

            var token = Request.Headers.Authorization.ToString()["Bearer ".Length..].Trim();
            var user = await _userService.GetByEmailAsync(email);
            if (user == null)
                return Unauthorized(new { message = "Tài khoản không tồn tại." });

            string tokenHash = HashToken(token);
            bool isValidSession = user.Sessions?.Any(s =>
                s.SessionToken == tokenHash && s.ExpiresAt > DateTime.UtcNow) == true;

            if (!isValidSession)
                return Unauthorized(new { message = "Bạn đã bị đăng xuất do đăng nhập ở thiết bị khác." });

            return Ok(new
            {
                message = "Đăng nhập hợp lệ.",
                email = user.Email,
                fullName = user.FullName,
                role = user.Role
            });
        }

        private string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        // Admin reset mật khẩu người dùng (chỉ admin mới được dùng)
        [HttpPost("admin-reset-password")]
        [Authorize]
        public async Task<IActionResult> AdminResetPassword([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email không được để trống." });

            var result = await _userService.AdminResetPasswordAsync(email);
            return Ok(new { message = result });
        }

        // Lấy UserId hiện tại từ JWT (dùng chung toàn dự án)
        private ulong GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(claim =>
                claim.Type == ClaimTypes.NameIdentifier ||
                claim.Type == "userId" ||
                claim.Type == "sub" ||
                claim.Type == "id");

            if (userIdClaim == null || !ulong.TryParse(userIdClaim.Value, out ulong userId))
                return 1;

            return userId;
        }
    }
}