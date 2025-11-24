using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using System.Text;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class MapsUploadController : ControllerBase
    {
        private readonly IMapUploadService _uploadService;
        private readonly IMapService _mapService;

        public MapsUploadController(
            IMapUploadService uploadService, 
            IMapService mapService)
        {
            _uploadService = uploadService;
            _mapService = mapService;
        }

        // ROS2 gửi map (yaml + pgm base64)
        [HttpPost("json")]
        public async Task<ActionResult<MapResponseDto>> UploadJson([FromBody] MapUploadJsonDto mapJsonDto)
        {
            try
            {
                IFormFile? imageFile = null;
                if (!string.IsNullOrEmpty(mapJsonDto.ImageBase64))
                {
                    var bytes = Convert.FromBase64String(mapJsonDto.ImageBase64);
                    imageFile = new FormFile(new MemoryStream(bytes), 0, bytes.Length, "image", mapJsonDto.ImageName);
                }

                var dto = new MapUploadDto
                {
                    MapName = mapJsonDto.MapName,
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi nhận map từ robot.", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MapResponseDto>> GetById(ulong id)
        {
            var map = await _mapService.GetByIdAsync(id);
            return map == null
                ? NotFound("Không tìm thấy bản đồ.")
                : Ok(map);
        }

        // Convert PGM → PNG
        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetImage(ulong id)
        {
            var map = await _mapService.GetByIdAsync(id);
            if (map == null || map.ImageData == null)
                return NotFound("Không tìm thấy hình ảnh bản đồ.");

            var name = map.ImageName ?? "map.png";

            try
            {
                // Nếu đã là PNG rồi → trả luôn, không cần convert
                if (!name.EndsWith(".pgm", StringComparison.OrdinalIgnoreCase))
                    return File(map.ImageData, "image/png", name);

                // === Xử lý file PGM ===
                using var ms = new MemoryStream(map.ImageData);
                using var br = new BinaryReader(ms, Encoding.ASCII);

                string magic = ReadLine(br);
                if (magic != "P5")
                    throw new Exception("File không phải định dạng PGM hợp lệ (P5).");

                string line;
                do { line = ReadLine(br); }
                while (line.StartsWith("#"));

                var parts = line.Split(" ", StringSplitOptions.RemoveEmptyEntries);
                int width = int.Parse(parts[0]);
                int height = int.Parse(parts[1]);

                int maxVal = int.Parse(ReadLine(br)); // không dùng nhưng phải đọc

                var raw = br.ReadBytes(width * height);

                using var img = new Image<L8>(width, height);

                // ❗ KHÔNG flip Y nữa – giữ nguyên như PGM gốc
                for (int y = 0; y < height; y++)
                {
                    for (int x = 0; x < width; x++)
                    {
                        img[x, y] = new L8(raw[y * width + x]);
                    }
                }

                using var output = new MemoryStream();
                img.Save(output, new PngEncoder());
                var pngName = name.Replace(".pgm", ".png");
                return File(output.ToArray(), "image/png", pngName);
            }
            catch (Exception e)
            {
                return StatusCode(500, e.Message);
            }
        }

        private static string ReadLine(BinaryReader br)
        {
            List<byte> bytes = new();
            byte b;
            while (br.BaseStream.Position < br.BaseStream.Length && (b = br.ReadByte()) != '\n')
                bytes.Add(b);
            return Encoding.ASCII.GetString(bytes.ToArray()).Trim();
        }
    }
}
