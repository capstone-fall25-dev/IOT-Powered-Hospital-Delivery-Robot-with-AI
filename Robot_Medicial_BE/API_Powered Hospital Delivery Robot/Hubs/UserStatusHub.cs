using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý trạng thái online/offline của nhân viên
    /// </summary>
    public class UserStatusHub : Hub
    {
        /// <summary>
        /// Lấy userId từ claims
        /// </summary>
        private string? GetUserId()
        {
            var userIdClaim = Context.User?.FindFirst(claim =>
                claim.Type == ClaimTypes.NameIdentifier ||
                claim.Type == "userId" ||
                claim.Type == "sub" ||
                claim.Type == "id");

            return userIdClaim?.Value;
        }

        /// <summary>
        /// Khi nhân viên kết nối
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (!string.IsNullOrEmpty(userId))
                await Clients.All.SendAsync("UserOnline", userId);
        }

        /// <summary>
        /// Khi nhân viên ngắt kết nối
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            if (!string.IsNullOrEmpty(userId))
                await Clients.All.SendAsync("UserOffline", userId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
