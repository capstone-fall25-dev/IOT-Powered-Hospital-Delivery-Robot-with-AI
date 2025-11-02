using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
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

        // Lấy danh sách tất cả user (lọc theo isActive) - UC 15: View User List (Quản lý Hệ thống - User Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll([FromQuery] bool? isActive = null)
        {
            var users = await _service.GetAllAsync(isActive);
            return Ok(users);
        }

        // Lấy thông tin chi tiết user (include Tasks & ActiveSessions) - UC 7: View User Detail & UC 9: View Login History (Quản lý Hệ thống - User Management & Session Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetById(ulong id)
        {
            var user = await _service.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user); // Include Tasks và ActiveSessions
        }

        // Xem trạng thái real-time của user (IsOnline, ActiveSessions, LastActivity) - UC 5: Maintain Active Session & UC 9: View Login History (Session Management)
        [HttpGet("{id}/status")]
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

        // Tạo user mới (operator) - UC 11: Create User Account (User Management)
        [HttpPost]
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

        // Cập nhật thông tin user (email/fullname/role/password) - UC 12: Modify User Account & UC 16: Update Personal Profile & UC 17: Manage User Roles (User Management)
        [HttpPut("{id}")]
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

        // Kích hoạt user (set isActive=true) - UC 14: Reactivate User Account (User Management)
        [HttpPatch("{id}/activate")]
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

        // Vô hiệu hóa user (set isActive=false, protect admin) - UC 13: Deactivate User Account (User Management)
        [HttpPatch("{id}/deactivate")]
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
