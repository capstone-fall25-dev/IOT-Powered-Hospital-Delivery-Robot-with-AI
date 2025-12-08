using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý Text-to-Speech (chuyển văn bản thành giọng nói)
    /// </summary>
    public class TTSHub : Hub
    {
        /// <summary>
        /// Gửi văn bản để robot phát thành giọng nói (server hoặc client tuỳ ý gọi)
        /// Event client-side: "ReceiveTTS"
        /// </summary>
        public async Task SendTextToSpeech(string text)
        {
            await Clients.All.SendAsync("ReceiveTTS", text);
        }

        /// <summary>
        /// (SERVER gọi) Phát sự kiện đổi giọng xuống tất cả robot
        /// Event client-side: "SetVoice" | payload: { voice, robotCode? }
        /// </summary>
        public async Task BroadcastSetVoice(int voice, string robotCode = null)
        {
            await Clients.All.SendAsync("SetVoice", new { voice, robotCode });
        }

        /// <summary>
        /// (ROBOT client gọi) ACK sau khi đổi giọng
        /// → Server bắn "VoiceStatus" để FE cập nhật UI.
        /// </summary>
        public async Task AckVoice(string robotCode, int voice, bool ok, string message = null)
        {
            await Clients.All.SendAsync("VoiceStatus", new { robotCode, voice, ok, message });
        }
    }
}
