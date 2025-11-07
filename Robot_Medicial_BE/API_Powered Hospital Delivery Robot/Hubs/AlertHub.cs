using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class AlertHub : Hub
    {
        public async Task SendAlert(object alert)
        {
            await Clients.All.SendAsync("ReceiveAlert", alert);
        }
    }
}
