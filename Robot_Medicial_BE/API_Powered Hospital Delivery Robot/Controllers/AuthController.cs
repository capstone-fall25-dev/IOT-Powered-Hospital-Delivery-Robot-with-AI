using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

        [HttpPost("provide-account")]
        public async Task<IActionResult> ProvideAccount([FromBody] RegisterRequest request)
        {
            var result = await _userService.RegisterAsync(request);
            return Ok(result);
        }

        [HttpPatch("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            var result = await _userService.VerifyOtpAsync(request);
            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var (token, message) = await _userService.LoginAsync(request, HttpContext);
            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { message });

            return Ok(new { token, message });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromQuery] string username)
        {
            var result = await _userService.LogoutAsync(HttpContext, username);
            return Ok(new { message = result });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var result = await _userService.RequestForgotPasswordAsync(request);
            return Ok(new { message = result });
        }

        [HttpPost("verify-forgot-password")]
        public async Task<IActionResult> VerifyForgotPassword([FromBody] VerifyForgotPasswordRequest request)
        {
            var result = await _userService.VerifyForgotPasswordAsync(request);
            return Ok(new { message = result });
        }

        [HttpGet("check-login-status")]
        [Authorize]
        public async Task<IActionResult> CheckLoginStatus()
        {
            // 1️. Lấy token từ header
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { Message = "Thiếu hoặc sai định dạng Authorization header." });

            var token = authHeader.Substring("Bearer ".Length).Trim();

            // 2️. Đọc token để lấy email (dùng email làm key session)
            JwtSecurityToken jwtToken;
            try
            {
                jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
            }
            catch
            {
                return Unauthorized(new { Message = "Token không hợp lệ." });
            }

            var email = jwtToken.Claims.FirstOrDefault(c =>
                                 c.Type == ClaimTypes.Email ||
                                 c.Type == "email" ||
                                 c.Type == "unique_name" ||
                                 c.Type == "sub" ||
                                 c.Type == ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { Message = "Token không hợp lệ — không tìm thấy email." });

            // 3️. Kiểm tra session theo email
            var sessionToken = HttpContext.Session.GetString($"UserToken_{email}");
            if (sessionToken == null)
                return Unauthorized(new { Message = "Phiên đăng nhập đã hết hạn hoặc người dùng chưa đăng nhập." });

            if (sessionToken != token)
                return Unauthorized(new { Message = "Token không khớp — người dùng đã đăng nhập ở nơi khác." });

            // 4️. Lấy thông tin user từ DB (tùy chọn)
            var user = await _userService.GetByEmailAsync(email);
            if (user == null)
                return Unauthorized(new { Message = "Không tìm thấy người dùng." });

            // 5️. Thành công
            return Ok(new
            {
                Message = "Người dùng đã đăng nhập và token hợp lệ.",
                Email = email,
                Username = user.FullName,
                Token = token
            });
        }

        [HttpPost("admin-reset-password")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> AdminResetPassword([FromQuery] string email)
        {
            var result = await _userService.AdminResetPasswordAsync(email);
            return Ok(new { message = result });
        }
    }
}
