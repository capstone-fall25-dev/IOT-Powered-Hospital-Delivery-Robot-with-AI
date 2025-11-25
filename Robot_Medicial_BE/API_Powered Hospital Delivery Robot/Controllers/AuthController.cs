using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

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

        // Đăng xuất (xóa session token)
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value
                        ?? User.FindFirst("unique_name")?.Value;

            var result = await _userService.LogoutAsync(HttpContext, username);
            return Ok(new { message = result });
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

        // Kiểm tra trạng thái đăng nhập (chống login nhiều nơi)
        [HttpGet("check-login-status")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckLoginStatus()
        {
            var authHeader = Request.Headers.Authorization.FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Thiếu hoặc sai định dạng token." });

            var token = authHeader["Bearer ".Length..].Trim();

            JwtSecurityToken jwtToken;
            try
            {
                jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
            }
            catch
            {
                return Unauthorized(new { message = "Token không hợp lệ." });
            }

            var email = jwtToken.Claims.FirstOrDefault(c =>
                c.Type == ClaimTypes.Email ||
                c.Type == "email" ||
                c.Type == "unique_name" ||
                c.Type == "sub")?.Value;

            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Token không chứa thông tin người dùng." });

            // Kiểm tra session hiện tại
            var sessionToken = HttpContext.Session.GetString($"UserToken_{email}");
            if (sessionToken == null)
                return Unauthorized(new { message = "Phiên đăng nhập đã hết hạn." });

            if (sessionToken != token)
                return Unauthorized(new { message = "Bạn đã bị đăng xuất do đăng nhập ở nơi khác." });

            var user = await _userService.GetByEmailAsync(email);
            if (user == null)
                return Unauthorized(new { message = "Tài khoản không tồn tại." });

            return Ok(new
            {
                message = "Đăng nhập hợp lệ.",
                email = email,
                fullName = user.FullName,
                role = user.Role,
                token
            });
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