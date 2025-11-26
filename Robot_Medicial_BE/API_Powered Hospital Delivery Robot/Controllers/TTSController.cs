using API_Powered_Hospital_Delivery_Robot.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TTSController : ControllerBase
    {
        private readonly IHubContext<TTSHub> _hubContext;

        public TTSController(IHubContext<TTSHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public class TTSRequest
        {
            public string Text { get; set; }
        }

        // POST: api/TTS
        // Body: { "text": "Xin chào, mời bạn nhận thuốc" }
        [HttpPost]
        public async Task<IActionResult> Speak([FromBody] TTSRequest request)
        {
            if (string.IsNullOrEmpty(request.Text))
                return BadRequest("Text is required");

            // Gửi tín hiệu xuống tất cả Robot đang kết nối vào Hub
            // Sự kiện tên là: "ReceiveTTS"
            await _hubContext.Clients.All.SendAsync("ReceiveTTS", request.Text);

            return Ok(new { message = "Đã gửi lệnh đọc xuống Robot", text = request.Text });
        }
    }
}