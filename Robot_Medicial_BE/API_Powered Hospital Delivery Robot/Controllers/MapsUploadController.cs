using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Formats.Png;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MapsUploadController : ControllerBase
    {
        private readonly IMapUploadService _uploadService;
        private readonly IMapService _mapService;

        public MapsUploadController(IMapUploadService uploadService, IMapService mapService)
        {
            _uploadService = uploadService;
            _mapService = mapService;
        }

        // ============================================================
        // POST: /api/MapsUpload
        // Upload map mới (từ ROS2 hoặc client)
        // ============================================================
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

        // ============================================================
        // POST: /api/MapsUpload/json
        // Upload map từ ROS2 (JSON + base64 image)
        // ============================================================
        [HttpPost("json")]
        public async Task<ActionResult<MapResponseDto>> UploadJson([FromBody] MapUploadJsonDto mapJsonDto)
        {
            try
            {
                IFormFile? imageFile = null;

                // Nếu có ảnh base64 thì chuyển về IFormFile
                if (!string.IsNullOrEmpty(mapJsonDto.ImageBase64))
                {
                    var bytes = Convert.FromBase64String(mapJsonDto.ImageBase64);
                    var stream = new MemoryStream(bytes);
                    imageFile = new FormFile(stream, 0, bytes.Length, "imageFile", mapJsonDto.ImageName ?? "map.png");
                }

                // Dùng DTO cũ để upload
                var dto = new MapUploadDto
                {
                    MapName = mapJsonDto.MapName,
                    Mode = mapJsonDto.Mode,
                    Resolution = mapJsonDto.Resolution,
                    OriginX = mapJsonDto.OriginX,
                    OriginY = mapJsonDto.OriginY,
                    OriginZ = mapJsonDto.OriginZ,
                    OccupiedThresh = mapJsonDto.OccupiedThresh,
                    FreeThresh = mapJsonDto.FreeThresh,
                    Negate = mapJsonDto.Negate
                };

                var created = await _uploadService.UploadAsync(dto, imageFile);
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

        // ============================================================
        // GET: /api/MapsUpload/{id}
        // Lấy thông tin map theo ID
        // ============================================================
        [HttpGet("{id}")]
        public async Task<ActionResult<MapResponseDto>> GetById(ulong id)
        {
            var map = await _mapService.GetByIdAsync(id);
            if (map == null)
                return NotFound($"Map with ID {id} not found.");

            return Ok(map);
        }

        // ============================================================
        // GET: /api/MapsUpload/{id}/image
        // Trả về ảnh map (tự động convert .pgm → .png)
        // ============================================================
        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetImage(ulong id)
        {
            var map = await _mapService.GetByIdAsync(id);
            if (map == null || map.ImageData == null)
                return NotFound("Map image not found.");

            var imageName = map.ImageName ?? "map.png";

            try
            {
                // ✅ Nếu là file .pgm → chuyển sang PNG
                if (imageName.EndsWith(".pgm", StringComparison.OrdinalIgnoreCase))
                {
                    using var ms = new MemoryStream(map.ImageData);
                    using var reader = new StreamReader(ms);

                    // --- Đọc header PGM ---
                    var magic = reader.ReadLine(); // thường là "P5"
                    if (magic != "P5")
                        throw new InvalidDataException("Invalid PGM format");

                    // --- Bỏ qua dòng comment nếu có ---
                    string line;
                    do
                    {
                        line = reader.ReadLine();
                    } while (line.StartsWith("#"));

                    // --- Kích thước ảnh ---
                    var sizeParts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    int width = int.Parse(sizeParts[0]);
                    int height = int.Parse(sizeParts[1]);
                    var maxVal = int.Parse(reader.ReadLine() ?? "255");

                    // --- Đọc pixel data ---
                    var pixelData = new byte[width * height];
                    ms.Read(pixelData, 0, pixelData.Length);

                    // --- Tạo ảnh grayscale ---
                    using var image = new Image<L8>(width, height);
                    for (int y = 0; y < height; y++)
                    {
                        for (int x = 0; x < width; x++)
                        {
                            // ROS map gốc bị đảo trục Y → lật ngược lại
                            var val = pixelData[(height - y - 1) * width + x];
                            image[x, y] = new L8(val);
                        }
                    }

                    // --- Xuất PNG ---
                    using var outStream = new MemoryStream();
                    await image.SaveAsync(outStream, new PngEncoder());
                    outStream.Position = 0;

                    return File(outStream.ToArray(), "image/png", imageName.Replace(".pgm", ".png"));
                }

                // ✅ Nếu là PNG thì trả trực tiếp
                return File(map.ImageData, "image/png", imageName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to process image: {ex.Message}");
            }
        }
    }
}
