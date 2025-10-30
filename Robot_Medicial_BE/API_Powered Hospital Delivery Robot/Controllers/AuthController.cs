using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Org.BouncyCastle.Asn1.Ocsp;
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

        [HttpPost("ProvideAccount")]
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
        public async Task<IActionResult> Logout([FromQuery] string username)
        {
            var result = await _userService.LogoutAsync(HttpContext, username);
            return Ok(new { message = result });
        }
        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var username = User.Identity?.Name ?? User.FindFirst("sub")?.Value;
            return Ok(new { Message = $"Xin chào {username}, bạn đã xác thực thành công!" });
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
        public IActionResult CheckLoginStatus()
        {
            // Lấy token từ header Authorization
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { Message = "Missing or invalid Authorization header." });

            var token = authHeader.Substring("Bearer ".Length).Trim();

            // Đọc token
            var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
            var username = jwtToken.Claims.FirstOrDefault(c =>
                c.Type == ClaimTypes.Name ||
                c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
            )?.Value;

            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { Message = "Invalid token - no username found." });

            // Kiểm tra token trong session
            var sessionToken = HttpContext.Session.GetString($"UserToken_{username}");
            if (sessionToken == null)
                return Unauthorized(new { Message = "Session expired or user not logged in." });

            if (sessionToken != token)
                return Unauthorized(new { Message = "Token mismatch — user may have logged in from another device." });

            // ✅ Nếu mọi thứ hợp lệ
            return Ok(new
            {
                Message = "User is currently logged in and token is valid.",
                Username = username,
                Token = token
            });
        }

    }

}
