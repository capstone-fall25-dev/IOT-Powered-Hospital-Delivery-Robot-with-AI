using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
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

        // Lấy danh sách điểm đến (lọc area/floor) - UC 53: Route Optimization (Map Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DestinationResponseDto>>> GetAll([FromQuery] string? area = null, [FromQuery] string? floor = null)
        {
            var dests = await _service.GetAllAsync(area, floor);
            return Ok(dests);
        }

        // Lấy chi tiết điểm đến (include TaskCount) - UC 53: Route Optimization (Map Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<DestinationResponseDto>> GetById(ulong id)
        {
            var dest = await _service.GetByIdAsync(id);
            if (dest == null) return NotFound();
            return Ok(dest);
        }

        // Tạo điểm đến mới (validate unique name) - UC 53: Route Optimization (Map Management)
        [HttpPost]
        public async Task<ActionResult<DestinationResponseDto>> Create(DestinationDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật điểm đến (validate unique name) - UC 52: Update Location Information (Map Management)
        [HttpPut("{id}")]
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