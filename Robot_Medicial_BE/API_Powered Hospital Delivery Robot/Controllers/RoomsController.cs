using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : ControllerBase
    {
        private readonly IRoomService _service;

        public RoomsController(IRoomService service)
        {
            _service = service;
        }

        // Lấy danh sách phòng (include map)
        [HttpGet]
       // // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<IEnumerable<RoomResponseDto>>> GetAll()
        {
            var rooms = await _service.GetAllAsync();
            return Ok(rooms);
        }

        // Lấy chi tiết phòng 
        [HttpGet("{id}")]
       // // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<RoomResponseDto>> GetById(ulong id)
        {
            var room = await _service.GetByIdAsync(id);
            if (room == null) return NotFound();
            return Ok(room);
        }

        // Tạo phòng mới 
        [HttpPost]
        // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<RoomResponseDto>> Create(RoomDto roomDto)
        {
            try
            {
                var created = await _service.CreateAsync(roomDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật phòng (location/map) - UC 25: Update Location Information (Map Management)
        [HttpPut("{id}")]
        // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<RoomResponseDto>> Update(ulong id, RoomDto roomDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, roomDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(ulong id)
        {
            try
            {
                await _service.DeleteAsync(id);
                return Ok(new { message = "Xóa phòng thành công!" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPatch("{id}/move-room")]
        public async Task<IActionResult> MoveRoom(ulong id, [FromBody] PatientMoveRoomDto dto)
        {
            try
            {
                var updated = await _service.MoveRoomAsync(id, dto.NewRoomId);
                return Ok(new
                {
                    message = "Chuyển phòng thành công!",
                    patient = updated
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
