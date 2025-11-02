using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
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

        // Lấy danh sách phòng (include map) - UC 67: Patient Admission Management (Patient Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RoomResponseDto>>> GetAll()
        {
            var rooms = await _service.GetAllAsync();
            return Ok(rooms);
        }

        // Lấy chi tiết phòng - UC 67: Patient Admission Management (Patient Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<RoomResponseDto>> GetById(ulong id)
        {
            var room = await _service.GetByIdAsync(id);
            if (room == null) return NotFound();
            return Ok(room);
        }

        // Tạo phòng mới (assign map) - UC 52: Update Location Information (Map Management)
        [HttpPost]
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

        // Cập nhật phòng (location/map) - UC 52: Update Location Information (Map Management)
        [HttpPut("{id}")]
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
    }
}
