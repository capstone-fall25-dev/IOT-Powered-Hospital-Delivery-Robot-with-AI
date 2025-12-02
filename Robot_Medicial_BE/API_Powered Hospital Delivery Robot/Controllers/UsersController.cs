using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using DocumentFormat.OpenXml.InkML;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _service;

        public UsersController(IUserService service)
        {
            _service = service;
        }

        // Lấy danh sách người dùng (có thể lọc theo trạng thái hoạt động)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll([FromQuery] bool? isActive = null)
        {
            var users = await _service.GetAllAsync(isActive);
            return Ok(users);
        }

        // Lấy thông tin chi tiết một người dùng theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetById(ulong id)
        {
            var user = await _service.GetByIdAsync(id);
            return user == null
                ? NotFound("Không tìm thấy người dùng.")
                : Ok(user);
        }

        // Lấy trạng thái online/offline hoặc thông tin hoạt động của người dùng
        [HttpGet("{id}/status")]
        public async Task<ActionResult<UserStatusDto>> GetStatus(ulong id)
        {
            try
            {
                var status = await _service.GetUserStatusAsync(id);
                return Ok(status);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // Tạo người dùng mới
        [HttpPost]
        public async Task<ActionResult<UserResponseDto>> Create([FromBody] UserDto userDto)
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

        // Cập nhật thông tin người dùng
        [HttpPut("{id}")]
        public async Task<ActionResult<UserResponseDto>> Update(ulong id, [FromBody] UserDto userDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, userDto);
                return updated == null
                    ? NotFound("Không tìm thấy người dùng để cập nhật.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Kích hoạt tài khoản người dùng
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> Activate(ulong id)
        {
            try
            {
                var success = await _service.ToggleActiveAsync(id, true);
                return success
                    ? NoContent()
                    : NotFound("Không tìm thấy người dùng để kích hoạt.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Vô hiệu hóa tài khoản người dùng
        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> Deactivate(ulong id)
        {
            try
            {
                var success = await _service.ToggleActiveAsync(id, false);
                return success
                    ? NoContent()
                    : NotFound("Không tìm thấy người dùng để vô hiệu hóa.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Controllers/UsersController.cs — SỬA 2 METHOD NÀY

        // GET: api/users/{id}/sessions
        [HttpGet("{id}/sessions")]
        //[Authorize(Roles = "admin")]
        public async Task<ActionResult> GetUserSessions(ulong id)
        {
            var user = await _service.GetByIdAsync(id); // ĐÃ CÓ includeSessions trong service rồi!
            if (user == null) return NotFound();

            var sessions = (user.ActiveSessions ?? Enumerable.Empty<SessionResponseDto>())
    .Select(s => new
    {
        s.Id,
        s.IpAddress,
        s.UserAgent,
        LoginAt = s.CreatedAt.ToString("dd/MM HH:mm"),
        ExpiresAt = s.ExpiresAt.ToString("dd/MM HH:mm"),
        IsCurrent = Request.Headers.Authorization.ToString().Contains(s.SessionToken ?? "")
    })
    .ToList();

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                fullName = user.FullName,
                totalSessions = sessions.Count(),
                sessions
            });
        }

        // POST: api/users/{id}/kick-all
        [HttpPost("{id}/kick-all")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> KickAllSessions(ulong id)
        {
            var result = await _service.ForceLogoutAllSessionsAsync(id);
            return Ok(result);
        }
    }
}