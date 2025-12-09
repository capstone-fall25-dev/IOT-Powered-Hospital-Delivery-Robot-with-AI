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
            public string Text { get; set; } = string.Empty;
        }

        public class VoiceRequest
        {
            public int Voice { get; set; } = 1; // 1=VITS (nam), 2=Piper (nữ)
            public string RobotCode { get; set; } // optional: khoanh đúng robot
        }

        [HttpPost]
        public async Task<IActionResult> Speak([FromBody] TTSRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest("Văn bản là bắt buộc");

            await _hubContext.Clients.All.SendAsync("ReceiveTTS", request.Text);
            return Ok(new { message = "Đã gửi lệnh đọc xuống Robot", text = request.Text });
        }

        /// <summary>
        /// Đổi giọng (FE gọi). FE sẽ chờ "VoiceStatus" từ robot để cập nhật UI.
        /// </summary>
        [HttpPost("voice")]
        public async Task<IActionResult> SetVoice([FromBody] VoiceRequest req)
        {
            if (req.Voice != 1 && req.Voice != 2)
                return BadRequest(new { error = "Voice phải là 1 (VITS) hoặc 2 (Piper)" });

            await _hubContext.Clients.All.SendAsync("SetVoice", new { voice = req.Voice, robotCode = req.RobotCode });
            return Ok(new { message = "Đã phát sự kiện đổi giọng", voice = req.Voice, robotCode = req.RobotCode });
        }
    }
}
