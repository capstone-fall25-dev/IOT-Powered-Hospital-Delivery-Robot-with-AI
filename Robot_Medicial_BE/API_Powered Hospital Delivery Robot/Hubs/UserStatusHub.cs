using DocumentFormat.OpenXml.InkML;
using Microsoft.AspNetCore.SignalR;
using MySqlX.XDevAPI;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class UserStatusHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("UserOnline", Context.User?.FindFirst("userId")?.Value);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("userId")?.Value;
            if (!string.IsNullOrEmpty(userId))
                await Clients.All.SendAsync("UserOffline", userId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
