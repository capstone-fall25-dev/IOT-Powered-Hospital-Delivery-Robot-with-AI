using API_Powered_Hospital_Delivery_Robot.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Xử lý Text-to-Speech (chuyển văn bản thành giọng nói) cho robot
    /// </summary>
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

        /// <summary>
        /// Gửi lệnh đọc văn bản xuống robot qua SignalR
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Speak([FromBody] TTSRequest request)
        {
            if (string.IsNullOrEmpty(request.Text))
                return BadRequest("Văn bản là bắt buộc");

            // Gửi tín hiệu xuống tất cả robot đang kết nối
            await _hubContext.Clients.All.SendAsync("ReceiveTTS", request.Text);

            return Ok(new { message = "Đã gửi lệnh đọc xuống Robot", text = request.Text });
        }
    }
}