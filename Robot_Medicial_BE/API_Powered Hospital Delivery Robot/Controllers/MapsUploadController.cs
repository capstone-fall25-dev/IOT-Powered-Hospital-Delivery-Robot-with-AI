using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MapsUploadController : ControllerBase
    {
        private readonly IMapUploadService _service;

        public MapsUploadController(IMapUploadService service)
        {
            _service = service;
        }

        // Tạo map mới (upload image, validate thresh)
        [HttpPost]
        public async Task<ActionResult<MapResponseDto>> Upload([FromForm] MapUploadDto mapDto, IFormFile? imageFile)
        {
            try
            {
                // Validate file nếu có
                if (imageFile != null && imageFile.Length > 10 * 1024 * 1024) // 10MB limit
                    return BadRequest("Image file too large (max 10MB)");

                var created = await _service.UploadAsync(mapDto, imageFile);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Lấy map theo Id
        [HttpGet("{id}")]
        public async Task<ActionResult<MapResponseDto>> GetById(ulong id, [FromServices] IMapUploadService service)
        {
            // Vì MapUploadService chỉ có UploadAsync, bạn có thể dùng repository trực tiếp nếu cần
            var map = await service.UploadAsync(new MapUploadDto { MapName = "" }, null); // Placeholder, cần thay bằng repository call thực tế
            if (map == null) return NotFound();
            return Ok(map);
        }

        // Lấy image map (serve file)
        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetImage(ulong id, [FromServices] IMapUploadService service)
        {
            // Vì MapUploadService chưa có GetById, có thể dùng repository trực tiếp
            // Đây là ví dụ placeholder, cần inject IMapRepository hoặc IMapService nếu muốn
            return NotFound();
        }
    }
}
