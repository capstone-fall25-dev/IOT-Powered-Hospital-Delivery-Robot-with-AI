using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _service;

        public UsersController(IUserService service)
        {
            _service = service;
        }

        // Lấy danh sách tất cả user (lọc theo isActive) - UC 8: View User List (User Management)
        [HttpGet]
        // [Authorize(Roles = "admin")]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll([FromQuery] bool? isActive = null)
        {
            var users = await _service.GetAllAsync(isActive);
            return Ok(users);
        }

        // Lấy thông tin chi tiết user
        [HttpGet("{id}")]
        // [Authorize]
        public async Task<ActionResult<UserResponseDto>> GetById(ulong id)
        {
            var user = await _service.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user); // Include Tasks và ActiveSessions
        }

        // Xem trạng thái real-time của user
        [HttpGet("{id}/status")]
        // [Authorize]
        public async Task<ActionResult<UserStatusDto>> GetStatus(ulong id)
        {
            try
            {
                var status = await _service.GetUserStatusAsync(id);
                return Ok(status); // IsOnline, ActiveSessions, LastActivity
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // Tạo user mới - UC 5: Provide an account (User Management)
        [HttpPost]
        // [Authorize(Roles = "admin")]
        public async Task<ActionResult<UserResponseDto>> Create(UserDto userDto)
        {
            try
            {
                var created = await _service.CreateAsync(userDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật thông tin user (email/fullname/role/password) - UC 6: Update user (User Management)
        [HttpPut("{id}")]
        // [Authorize]
        public async Task<ActionResult<UserResponseDto>> Update(ulong id, UserDto userDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, userDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Kích hoạt user (set isActive=true) - UC 7: Activate/Deactivate User Account (User Management)
        [HttpPatch("{id}/activate")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> Activate(ulong id)
        {
            try
            {
                var success = await _service.ToggleActiveAsync(id, true);
                if (!success) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Vô hiệu hóa user (set isActive=false, protect admin) - UC7
        [HttpPatch("{id}/deactivate")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> Deactivate(ulong id)
        {
            try
            {
                var success = await _service.ToggleActiveAsync(id, false);
                if (!success) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
