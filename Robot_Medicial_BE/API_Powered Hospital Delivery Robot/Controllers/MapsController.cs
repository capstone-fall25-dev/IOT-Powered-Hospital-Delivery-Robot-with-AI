using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý bản đồ bệnh viện (map) và điểm đến
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class MapsController : ControllerBase
    {
        private readonly IMapService _service;

        public MapsController(IMapService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy danh sách bản đồ
        /// </summary>
        [HttpGet]
        //   [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<IEnumerable<MapResponseDto>>> GetAll()
        {
            var maps = await _service.GetAllAsync();
            return Ok(maps);
        }

        /// <summary>
        /// Lấy chi tiết bản đồ (bao gồm danh sách robot)
        /// </summary>
        [HttpGet("{id}")]
      //  [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<MapResponseDto>> GetById(ulong id)
        {
            var map = await _service.GetByIdAsync(id);
            if (map == null) return NotFound();
            return Ok(map);
        }

        /// <summary>
        /// Lấy hình ảnh bản đồ
        /// </summary>
        [HttpGet("{id}/image")]
        //[Authorize(Roles = "admin, doctor")]
        public async Task<IActionResult> GetImage(ulong id)
        {
            var map = await _service.GetByIdAsync(id);
            if (map == null || map.ImageData == null) return NotFound();

            var imageName = map.ImageName ?? "map.png";
            return File(map.ImageData, "image/png", imageName);
        }

        /// <summary>
        /// Tạo bản đồ mới (upload hình ảnh, validate threshold)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<MapResponseDto>> Create([FromForm] MapDto mapDto, IFormFile? imageFile)
        {
            if (mapDto == null)
                return BadRequest("Dữ liệu bản đồ không hợp lệ.");

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { Message = "Validation failed", Errors = errors });
            }

            try
            {
                if (imageFile != null && imageFile.Length > 10 * 1024 * 1024)
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

        /// <summary>
        /// Cập nhật thông tin bản đồ (chỉ sửa các trường cho phép, không thay đổi hình ảnh)
        /// </summary>
        [HttpPut("{id}")]
        // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<MapResponseDto>> Update(ulong id, [FromBody] MapDto mapDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, mapDto);
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

        /// <summary>
        /// Báo lỗi bản đồ
        /// </summary>
        //[Authorize]
        [HttpPost("{mapId}/report-error")]
        public async Task<IActionResult> ReportMapError(ulong mapId, [FromBody] MapErrorDto dto)
        {
            dto.MapId = mapId;

            // Lấy thông tin người báo lỗi từ token
            var email = User.FindFirst(ClaimTypes.Email)?.Value
                        ?? User.FindFirst("email")?.Value;
            var fullName = User.FindFirst("FullName")?.Value ?? User.Identity?.Name;

            // Format thông tin người báo lỗi
            dto.ReporterEmail = (string.IsNullOrWhiteSpace(fullName) && string.IsNullOrWhiteSpace(email)) ? "unknown" : $"{fullName} ({email})";

            var result = await _service.ReportMapErrorAsync(dto);
            return Ok(result);
        }
    }
}
