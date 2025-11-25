using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IUserService _userService;

        public ProfileController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Lấy thông tin profile của user hiện tại
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ProfileResponseDto>> GetMyProfile()
        {
            var email = GetCurrentUserEmail();
            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Không thể xác định người dùng." });

            var profile = await _userService.GetProfileByEmailAsync(email);
            if (profile == null)
                return NotFound(new { message = "Không tìm thấy thông tin người dùng." });

            return Ok(profile);
        }

        /// <summary>
        /// Cập nhật thông tin profile của user hiện tại
        /// </summary>
        [HttpPut]
        public async Task<ActionResult<ProfileResponseDto>> UpdateMyProfile([FromBody] UpdateProfileDto dto)
        {
            var email = GetCurrentUserEmail();
            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Không thể xác định người dùng." });

            try
            {
                var updated = await _userService.UpdateProfileAsync(email, dto);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Đổi mật khẩu của user hiện tại
        /// </summary>
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var email = GetCurrentUserEmail();
            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Không thể xác định người dùng." });

            try
            {
                var result = await _userService.ChangePasswordAsync(email, dto);

                if (result.Contains("không đúng") || result.Contains("phải khác"))
                    return BadRequest(new { message = result });

                return Ok(new { message = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Helper method để lấy email của user hiện tại từ JWT
        /// </summary>
        private string? GetCurrentUserEmail()
        {
            return User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value
                ?? User.FindFirst("email")?.Value;
        }
    }
}
