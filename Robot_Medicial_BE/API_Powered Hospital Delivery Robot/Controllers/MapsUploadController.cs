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
        private readonly IMapUploadService _uploadService;
        private readonly IMapService _mapService; // Dùng để lấy map ra lại

        public MapsUploadController(IMapUploadService uploadService, IMapService mapService)
        {
            _uploadService = uploadService;
            _mapService = mapService;
        }

        // -------------------------------
        // POST: /api/MapsUpload
        // Upload map mới (từ ROS2 hoặc client)
        // -------------------------------
        [HttpPost]
        public async Task<ActionResult<MapResponseDto>> Upload([FromForm] MapUploadDto mapDto, IFormFile? imageFile)
        {
            try
            {
                if (imageFile != null && imageFile.Length > 10 * 1024 * 1024)
                    return BadRequest("Image file too large (max 10MB)");

                var created = await _uploadService.UploadAsync(mapDto, imageFile);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // -------------------------------
        // GET: /api/MapsUpload/{id}
        // Lấy thông tin map theo ID
        // -------------------------------
        [HttpGet("{id}")]
        public async Task<ActionResult<MapResponseDto>> GetById(ulong id)
        {
            var map = await _mapService.GetByIdAsync(id);
            if (map == null)
                return NotFound($"Map with ID {id} not found.");

            return Ok(map);
        }

        // -------------------------------
        // GET: /api/MapsUpload/{id}/image
        // Lấy ảnh map (trả về file PNG)
        // -------------------------------
        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetImage(ulong id)
        {
            var map = await _mapService.GetByIdAsync(id);
            if (map == null || map.ImageData == null)
                return NotFound("Map image not found.");

            var imageName = map.ImageName ?? "map.png";
            return File(map.ImageData, "image/png", imageName);
        }
    }
}
