using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý cảnh báo real-time
    /// </summary>
    public class AlertHub : Hub
    {
        /// <summary>
        /// Gửi cảnh báo đến tất cả client
        /// </summary>
        public async Task SendAlert(object alert)
        {
            await Clients.All.SendAsync("ReceiveAlert", alert);
        }
    }
}
