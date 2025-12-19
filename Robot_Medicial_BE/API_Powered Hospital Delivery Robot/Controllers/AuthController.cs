using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Xử lý xác thực và đăng nhập cho nhân viên bệnh viện
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;

        public AuthController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Tạo tài khoản mới và gửi OTP qua email
        /// </summary>
        [HttpPost("provide-account")]
        [AllowAnonymous]
        public async Task<IActionResult> ProvideAccount([FromBody] RegisterRequest request)
        {
            var result = await _userService.RegisterAsync(request);
            return Ok(new { message = result });
        }

        /// <summary>
        /// Xác thực OTP để kích hoạt tài khoản
        /// </summary>
        [HttpPatch("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            var result = await _userService.VerifyOtpAsync(request);
            return Ok(new { message = result });
        }

        /// <summary>
        /// Đăng nhập hệ thống
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var (token, message) = await _userService.LoginAsync(request, HttpContext);

            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { message });

            return Ok(new { token, message });
        }

        /// <summary>
        /// Yêu cầu quên mật khẩu (gửi OTP đặt lại)
        /// </summary>
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            // Validate model state
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Dữ liệu gửi lên không hợp lệ.", errors = ModelState });
            }

            try
            {
                var result = await _userService.RequestForgotPasswordAsync(request);

                // Nếu result chứa thông báo lỗi (không tìm thấy user hoặc lỗi gửi mail)
                if (result.Contains("Không tìm thấy") || result.Contains("lỗi"))
                {
                    return BadRequest(new { message = result });
                }

                // Thành công
                return Ok(new { message = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                // Log exception ở đây nếu có logger
                return BadRequest(new { message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Xác nhận OTP và đặt lại mật khẩu
        /// </summary>
        [HttpPost("verify-otp-forgotPassword")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyForgotPasswordOtpRequest request)
        {
            var (success, message, token) = await _userService.VerifyForgotPasswordOtpAsync(request);

            if (success)
            {
                return Ok(new { message, token });
            }

            return BadRequest(new { message });
        }

        [HttpPost("reset-password-byForgot")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var (success, message) = await _userService.ResetPasswordAsync(request);

            if (success)
            {
                return Ok(new { message });
            }

            return BadRequest(new { message });
        }

        /// <summary>
        /// Đăng xuất hệ thống
        /// </summary>
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

        /// <summary>
        /// Kiểm tra trạng thái đăng nhập
        /// </summary>
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

            // Kiểm tra session còn hợp lệ không
            string tokenHash = HashToken(token);
            bool isValidSession = user.Sessions?.Any(s =>
                s.SessionToken == tokenHash && s.ExpiresAt > DateTimeHelper.Now()) == true;

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

        /// <summary>
        /// Mã hóa token bằng SHA256
        /// </summary>
        private string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        /// <summary>
        /// Admin đặt lại mật khẩu cho nhân viên
        /// </summary>
        [HttpPost("admin-reset-password")]
        [Authorize]
        public async Task<IActionResult> AdminResetPassword([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email không được để trống." });

            var result = await _userService.AdminResetPasswordAsync(email);
            return Ok(new { message = result });
        }

        /// <summary>
        /// Lấy ID nhân viên hiện tại từ JWT token
        /// </summary>
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
