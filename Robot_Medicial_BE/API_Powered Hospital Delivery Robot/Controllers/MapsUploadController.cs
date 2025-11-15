using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Formats.Png;
using System.Text;

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
        // POST /api/MapsUpload/json  → ROS2 gửi map
        // ============================================================
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
                return StatusCode(500, ex.Message);
            }
        }

        // ============================================================
        // GET /api/MapsUpload/{id}
        // ============================================================
        [HttpGet("{id}")]
        public async Task<ActionResult<MapResponseDto>> GetById(ulong id)
        {
            var map = await _mapService.GetByIdAsync(id);
            if (map == null)
                return NotFound();

            return Ok(map);
        }

        // ============================================================
        // GET /api/MapsUpload/{id}/image  → Convert PGM → PNG đúng chuẩn
        // ============================================================
     [HttpGet("{id}/image")]
public async Task<IActionResult> GetImage(ulong id)
{
    var map = await _mapService.GetByIdAsync(id);
    if (map == null || map.ImageData == null)
        return NotFound();

    var name = map.ImageName ?? "map.png";

    try
    {
        // Nếu không phải .pgm thì trả luôn (PNG đã lưu sẵn)
        if (!name.EndsWith(".pgm", StringComparison.OrdinalIgnoreCase))
            return File(map.ImageData, "image/png", name);

        using var ms = new MemoryStream(map.ImageData);
        using var br = new BinaryReader(ms, Encoding.ASCII);

        string magic = ReadLine(br);
        if (magic != "P5")
            throw new Exception("Invalid PGM");

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
