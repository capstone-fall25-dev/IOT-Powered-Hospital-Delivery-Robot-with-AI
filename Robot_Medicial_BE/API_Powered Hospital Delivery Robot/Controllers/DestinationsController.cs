using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý điểm đến trên bản đồ và gửi route cho robot
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class DestinationsController : ControllerBase
    {
        private readonly IDestinationService _service;
        private readonly IHubContext<RobotPositionHub> _hubContext;

        public DestinationsController(
            IDestinationService service,
            IHubContext<RobotPositionHub> hubContext)
        {
            _service = service;
            _hubContext = hubContext;
        }

        /// <summary>
        /// Tạo điểm đến mới (lưu vào database)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<DestinationResponseDto>> Create([FromBody] DestinationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                Console.WriteLine($"[POST /api/Destinations] Name={dto.Name}, MapId={dto.MapId}, X={dto.X}, Y={dto.Y}");
                var created = await _service.CreateAsync(dto);
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

        /// <summary>
        /// Gửi danh sách điểm đến xuống robot qua SignalR
        /// </summary>
        [HttpPost("send-route")]
        public async Task<IActionResult> SendRoute([FromBody] DestinationRouteRequest route)
        {
            if (route == null || route.Destinations == null || !route.Destinations.Any())
                return BadRequest(new { message = "Danh sách điểm đến trống." });

            try
            {
                var payload = new
                {
                    type = "destination_route",
                    map_id = route.MapId,
                    timestamp = DateTime.Now,
                    destinations = route.Destinations.Select((d, index) => new
                    {
                        order = index + 1,
                        id = d.Id,
                        name = d.Name,
                        x = d.X,
                        y = d.Y
                    }).ToList()
                };

                await _hubContext.Clients.All.SendAsync("ReceiveDestinationRoute", payload);
                Console.WriteLine($"[SignalR] 📡 Đã gửi route gồm {payload.destinations.Count} điểm đến xuống ROS2");

                return Ok(new { message = "Đã gửi route xuống robot thành công.", payload });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi gửi route.", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách tất cả điểm đến (có thể lọc theo khu vực và tầng)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DestinationResponseDto>>> GetAll([FromQuery] string? area = null, [FromQuery] string? floor = null)
        {
            var dests = await _service.GetAllAsync(area, floor);
            return Ok(dests);
        }

        /// <summary>
        /// Lấy thông tin chi tiết một điểm đến theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<DestinationResponseDto>> GetById(ulong id)
        {
            var dest = await _service.GetByIdAsync(id);
            if (dest == null) return NotFound();
            return Ok(dest);
        }

        /// <summary>
        /// Lấy vị trí của điểm đến theo ID
        /// </summary>
        [HttpGet("{id}/position")]
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

        /// <summary>
        /// Lấy danh sách điểm đến theo bản đồ
        /// </summary>
        [HttpGet("by-map/{mapId}")]
        public async Task<ActionResult<IEnumerable<DestinationResponseDto>>> GetByMap(ulong mapId)
        {
            var destinations = await _service.GetAllAsync();
            var filtered = destinations.Where(d => d.MapId == mapId).OrderBy(d => d.Name);

            return Ok(filtered);
        }

        /// <summary>
        /// Cập nhật điểm đến
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<DestinationResponseDto>> Update(ulong id, [FromBody] DestinationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                Console.WriteLine($"[PUT /api/Destinations/{id}] Updating destination");

                var updated = await _service.UpdateAsync(id, dto);

                if (updated == null)
                    return NotFound(new { message = "Không tìm thấy địa điểm để cập nhật." });

                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi cập nhật địa điểm.", error = ex.Message });
            }
        }

        /// <summary>
        /// Dừng khẩn cấp - hủy nhiệm vụ robot đang chạy
        /// </summary>
        [HttpPost("emergency-stop")]
        public async Task<IActionResult> EmergencyStop()
        {
            try
            {
                var payload = new
                {
                    type = "emergency_stop",
                    timestamp = DateTime.Now,
                    command = "cancel_navigation"
                };

                await _hubContext.Clients.All.SendAsync("ReceiveEmergencyStop", payload);
                Console.WriteLine($"[SignalR] 🛑 Đã gửi lệnh dừng khẩn cấp xuống ROS2");

                return Ok(new { message = "Đã gửi lệnh dừng khẩn cấp thành công.", payload });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi gửi lệnh dừng khẩn cấp.", error = ex.Message });
            }
        }

    }

    // ============================================================
    // 🧾 DTO: Request model cho API send-route
    // ============================================================
    public class DestinationRouteRequest
    {
        public ulong MapId { get; set; }
        public List<DestinationSimpleDto> Destinations { get; set; } = new();
    }

    public class DestinationSimpleDto
    {
        public ulong Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }
    }
}
