using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý Text-to-Speech
    /// </summary>
    public class TTSHub : Hub
    {
        /// <summary>
        /// Server/Client phát text để robot nói
        /// </summary>
        public async Task SendTextToSpeech(string text)
        {
            await Clients.All.SendAsync("ReceiveTTS", text);
        }

        /// <summary>
        /// Server phát lệnh đổi giọng
        /// </summary>
        public async Task BroadcastSetVoice(int voice, string robotCode = null)
        {
            await Clients.All.SendAsync("SetVoice", new { voice, robotCode });
        }

        /// <summary>
        /// Robot ACK đổi giọng → Server phát cho FE
        /// </summary>
        public async Task AckVoice(string robotCode, int voice, bool ok, string message = null)
        {
            await Clients.All.SendAsync("VoiceStatus", new { robotCode, voice, ok, message });
        }
    }
}
