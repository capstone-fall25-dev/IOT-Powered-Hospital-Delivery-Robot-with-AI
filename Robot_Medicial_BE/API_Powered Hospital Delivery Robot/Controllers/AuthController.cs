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




        //[HttpGet("check-login-status")]
        //[Authorize]
        //public IActionResult CheckLoginStatus()
        //{
        //    var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        //    if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        //        return Unauthorized(new { Message = "Missing or invalid Authorization header." });

        //    var token = authHeader.Substring("Bearer ".Length).Trim();

        //    // Đọc token để lấy username
        //    var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
        //    var username = jwtToken.Claims.FirstOrDefault(c =>
        //                    c.Type == "unique_name" ||
        //                    c.Type == ClaimTypes.Name ||
        //                    c.Type == "sub" ||
        //                    c.Type == ClaimTypes.Email ||
        //                    c.Type == "email" ||
        //                    c.Type == ClaimTypes.NameIdentifier)?.Value;


        //    if (string.IsNullOrEmpty(username))
        //        return Unauthorized(new { Message = "Invalid token — username not found." });

        //    // Kiểm tra session
        //    var sessionToken = HttpContext.Session.GetString($"UserToken_{username}");
        //    if (sessionToken == null)
        //        return Unauthorized(new { Message = "Session expired or user not logged in." });

        //    if (sessionToken != token)
        //        return Unauthorized(new { Message = "Token mismatch — user logged in elsewhere." });

        //    return Ok(new
        //    {
        //        Message = "User is logged in and token is valid.",
        //        Username = username,
        //        Token = token
        //    });
        //}
        [HttpGet("check-login-status")]
        [Authorize]
        public async Task<IActionResult> CheckLoginStatus()
        {
            // 1️⃣ Lấy token từ header
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { Message = "Missing or invalid Authorization header." });

            var token = authHeader.Substring("Bearer ".Length).Trim();

            // 2️⃣ Đọc token để lấy email (dùng email làm key session)
            JwtSecurityToken jwtToken;
            try
            {
                jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
            }
            catch
            {
                return Unauthorized(new { Message = "Invalid token format." });
            }

            var email = jwtToken.Claims.FirstOrDefault(c =>
                            c.Type == ClaimTypes.Email ||
                            c.Type == "email" ||
                            c.Type == "unique_name" ||
                            c.Type == "sub" ||
                            c.Type == ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { Message = "Invalid token — email not found." });

            // 3️⃣ Kiểm tra session theo email
            var sessionToken = HttpContext.Session.GetString($"UserToken_{email}");
            if (sessionToken == null)
                return Unauthorized(new { Message = "Session expired or user not logged in." });

            if (sessionToken != token)
                return Unauthorized(new { Message = "Token mismatch — user logged in elsewhere." });

            // 4️⃣ Lấy thông tin user từ DB (tùy chọn)
            var user = await _userService.GetByUsernameAsync(email);
            if (user == null)
                return Unauthorized(new { Message = "User not found." });

            // 5️⃣ Thành công
            return Ok(new
            {
                Message = "User is logged in and token is valid.",
                Email = email,
                Username = user.FullName,
                Token = token
            });
        }



        [HttpPost("admin-reset-password")]
        //[Authorize(Roles = "admin")]
        public async Task<IActionResult> AdminResetPassword([FromQuery] string email)
        {
            var result = await _userService.AdminResetPasswordAsync(email);
            return Ok(new { message = result });
        }



    }

}
