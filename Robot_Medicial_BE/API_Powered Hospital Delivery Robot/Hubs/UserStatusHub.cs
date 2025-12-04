using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý trạng thái online/offline của nhân viên
    /// </summary>
    public class UserStatusHub : Hub
    {
        /// <summary>
        /// Khi nhân viên kết nối
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("UserOnline", Context.User?.FindFirst("userId")?.Value);
        }

        /// <summary>
        /// Khi nhân viên ngắt kết nối
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("userId")?.Value;
            if (!string.IsNullOrEmpty(userId))
                await Clients.All.SendAsync("UserOffline", userId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
