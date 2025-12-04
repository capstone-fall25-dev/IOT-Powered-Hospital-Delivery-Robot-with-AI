using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý nhiệm vụ real-time
    /// </summary>
    public class TaskHub : Hub
    {
        /// <summary>
        /// Khi client kết nối
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"[TaskHub] Thiết bị kết nối: {Context.ConnectionId}");
            await Clients.Caller.SendAsync("ConnectedToTaskHub", new { message = "Kết nối TaskHub thành công" });
            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Khi client ngắt kết nối
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            Console.WriteLine($"[TaskHub] Ngắt kết nối: {Context.ConnectionId} | Lỗi: {ex?.Message}");
            await base.OnDisconnectedAsync(ex);
        }

        /// <summary>
        /// Tham gia nhóm robot và nhóm tất cả nhiệm vụ
        /// </summary>
        public async Task JoinRobotGroup(string robotCode)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Robot_{robotCode}");
            await Groups.AddToGroupAsync(Context.ConnectionId, "AllTasks");
            Console.WriteLine($"Client {Context.ConnectionId} tham gia nhóm Robot_{robotCode} và AllTasks");
        }

        /// <summary>
        /// Rời khỏi nhóm robot và nhóm tất cả nhiệm vụ
        /// </summary>
        public async Task LeaveRobotGroup(string robotCode)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Robot_{robotCode}");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "AllTasks");
        }
    }
}