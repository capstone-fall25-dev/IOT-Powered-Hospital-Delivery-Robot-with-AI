using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MapsController : ControllerBase
    {
        private readonly IMapService _service;

        public MapsController(IMapService service)
        {
            _service = service;
        }

        // Lấy danh sách map
        [HttpGet]
        //   [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<IEnumerable<MapResponseDto>>> GetAll()
        {
            var maps = await _service.GetAllAsync();
            return Ok(maps);
        }

        // Lấy chi tiết map (include Robots) - UC 26: Track Robot Movement on Map (Map Management)
        [HttpGet("{id}")]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<MapResponseDto>> GetById(ulong id)
        {
            var map = await _service.GetByIdAsync(id);
            if (map == null) return NotFound();
            return Ok(map); // Include Robots
        }

        // Lấy image map (serve file) - UC26
        [HttpGet("{id}/image")]
        //[Authorize(Roles = "admin, doctor")]
        public async Task<IActionResult> GetImage(ulong id)
        {
            var map = await _service.GetByIdAsync(id);
            if (map == null || map.ImageData == null) return NotFound();

            var imageName = map.ImageName ?? "map.png";
            return File(map.ImageData, "image/png", imageName);
        }

        // Tạo map mới (upload image, validate thresh) 
        [HttpPost]
        //  [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<MapResponseDto>> Create([FromForm] MapDto mapDto, IFormFile? imageFile)
        {
            try
            {
                // Validate file nếu có
                if (imageFile != null && imageFile.Length > 10 * 1024 * 1024) // 10MB limit
                    return BadRequest("Image file too large (max 10MB)");

                var created = await _service.CreateAsync(mapDto, imageFile);
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

        // Cập nhật map 
        [HttpPut("{id}")]
        // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<MapResponseDto>> Update(ulong id, [FromForm] MapDto mapDto, IFormFile? imageFile)
        {
            try
            {
                if (imageFile != null && imageFile.Length > 10 * 1024 * 1024)
                    return BadRequest("Image file too large (max 10MB)");

                var updated = await _service.UpdateAsync(id, mapDto, imageFile);
                if (updated == null) return NotFound();
                return Ok(updated);
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

        //[Authorize]
        [HttpPost("{mapId}/report-error")]
        public async Task<IActionResult> ReportMapError(ulong mapId, [FromBody] MapErrorDto dto)
        {
            dto.MapId = mapId;

            // Lấy thông tin người báo lỗi từ token
            var email = User.FindFirst(ClaimTypes.Email)?.Value
                        ?? User.FindFirst("email")?.Value;                 // phòng khi issuer dùng key "email"
            var fullName = User.FindFirst("FullName")?.Value ?? User.Identity?.Name;

            // Nếu có đủ cả hai -> format gộp
            dto.ReporterEmail = (string.IsNullOrWhiteSpace(fullName) && string.IsNullOrWhiteSpace(email)) ? "unknown" : $"{fullName} ({email})";

            var result = await _service.ReportMapErrorAsync(dto);
            return Ok(result);
        }
    }
}
