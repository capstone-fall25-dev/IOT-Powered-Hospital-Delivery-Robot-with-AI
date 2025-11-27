using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class TTSHub : Hub
    {
        // Robot (Python) sẽ lắng nghe sự kiện "ReceiveTTS" này
        public async Task SendTextToSpeech(string text)
        {
            await Clients.All.SendAsync("ReceiveTTS", text);
        }
    }
}