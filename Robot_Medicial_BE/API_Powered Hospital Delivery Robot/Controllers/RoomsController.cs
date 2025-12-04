using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý thông tin phòng bệnh
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize] 
    public class RoomsController : ControllerBase
    {
        private readonly IRoomService _service;

        public RoomsController(IRoomService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy danh sách tất cả các phòng
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RoomResponseDto>>> GetAll()
        {
            var rooms = await _service.GetAllAsync();
            return Ok(rooms);
        }

        /// <summary>
        /// Lấy thông tin chi tiết một phòng theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<RoomResponseDto>> GetById(ulong id)
        {
            var room = await _service.GetByIdAsync(id);
            return room == null
                ? NotFound("Không tìm thấy phòng.")
                : Ok(room);
        }

        /// <summary>
        /// Tạo phòng mới
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<RoomResponseDto>> Create([FromBody] RoomDto roomDto)
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

        /// <summary>
        /// Cập nhật thông tin phòng (số phòng, loại phòng, trạng thái)
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<RoomResponseDto>> Update(ulong id, [FromBody] RoomDto roomDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, roomDto);
                return updated == null
                    ? NotFound("Không tìm thấy phòng để cập nhật.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Xóa phòng (chỉ xóa khi không có bệnh nhân hoặc không có nhiệm vụ liên quan)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(ulong id)
        {
            try
            {
                await _service.DeleteAsync(id);
                return Ok(new { message = "Đã xóa phòng thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Chuyển bệnh nhân từ phòng hiện tại sang phòng mới
        /// </summary>
        [HttpPatch("{id}/move-room")]
        public async Task<IActionResult> MoveRoom(ulong id, [FromBody] PatientMoveRoomDto dto)
        {
            try
            {
                var updatedPatient = await _service.MoveRoomAsync(id, dto.NewRoomId);
                return Ok(new
                {
                    message = "Chuyển phòng thành công!",
                    patient = updatedPatient
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}