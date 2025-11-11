using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DestinationsController : ControllerBase
    {
        private readonly IDestinationService _service;
        public DestinationsController(IDestinationService service)
        {
            _service = service;
        }

        [HttpGet]
     //   [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<IEnumerable<DestinationResponseDto>>> GetAll([FromQuery] string? area = null, [FromQuery] string? floor = null)
        {
            var dests = await _service.GetAllAsync(area, floor);
            return Ok(dests);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<DestinationResponseDto>> GetById(ulong id)
        {
            var dest = await _service.GetByIdAsync(id);
            if (dest == null) return NotFound();
            return Ok(dest);
        }

        // ✅ NEW: Lấy vị trí (x, y)
        [HttpGet("{id}/position")]
     //   [Authorize(Roles = "admin, doctor, nurse")]
        public async Task<ActionResult<DestinationPositionDto>> GetPosition(ulong id)
        {
            try
            {
                var result = await _service.GetPositionByIdAsync(id);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<DestinationResponseDto>> Create([FromBody] DestinationDto dto)
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                try
                {
                    // ⚙️ Ghi log để dễ kiểm tra dữ liệu từ FE
                    Console.WriteLine($"[POST /api/Destinations] " +
                                    $"Name={dto.Name}, MapId={dto.MapId}, X={dto.X}, Y={dto.Y}, Floor={dto.Floor}");

                    // ✅ Gọi service xử lý logic tạo mới
                    var created = await _service.CreateAsync(dto);

                    // 🧩 Trả về kết quả chuẩn REST: 201 Created + location header
                    return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ERROR] {ex.Message}");
                    return StatusCode(500, new { message = "Lỗi khi tạo địa điểm.", error = ex.Message });
                }
            }
        [HttpPut("{id}")]
  //      [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<DestinationResponseDto>> Update(ulong id, DestinationDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
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
