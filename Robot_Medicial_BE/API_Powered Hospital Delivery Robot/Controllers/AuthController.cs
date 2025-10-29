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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
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
            var (token, message) = await _userService.LoginAsync(request);
            if (string.IsNullOrEmpty(token))
                return Unauthorized(message);

            HttpContext.Session.SetString("AuthToken", token);
            return Ok(new { Token = token, Message = message });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var result = await _userService.LogoutAsync(HttpContext);
            return Ok(result);
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

    }

}
