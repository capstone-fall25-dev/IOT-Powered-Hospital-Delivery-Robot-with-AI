using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý Text-to-Speech (chuyển văn bản thành giọng nói)
    /// </summary>
    public class TTSHub : Hub
    {
        /// <summary>
        /// Gửi văn bản để robot phát thành giọng nói
        /// </summary>
        public async Task SendTextToSpeech(string text)
        {
            await Clients.All.SendAsync("ReceiveTTS", text);
        }
    }
}