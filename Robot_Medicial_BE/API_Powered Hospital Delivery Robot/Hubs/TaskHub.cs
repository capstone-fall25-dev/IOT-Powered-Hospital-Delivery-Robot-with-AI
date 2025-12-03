// Hubs/TaskHub.cs
using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class TaskHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"[TaskHub] Thiết bị kết nối: {Context.ConnectionId}");
            await Clients.Caller.SendAsync("ConnectedToTaskHub", new { message = "Kết nối TaskHub thành công" });
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            Console.WriteLine($"[TaskHub] Ngắt kết nối: {Context.ConnectionId} | Lỗi: {ex?.Message}");
            await base.OnDisconnectedAsync(ex);
        }

        public async Task JoinRobotGroup(string robotCode)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Robot_{robotCode}");
            await Groups.AddToGroupAsync(Context.ConnectionId, "AllTasks"); // Nhóm chung
            Console.WriteLine($"Client {Context.ConnectionId} tham gia nhóm Robot_{robotCode} và AllTasks");
        }

        public async Task LeaveRobotGroup(string robotCode)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Robot_{robotCode}");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "AllTasks");
        }
    }
}