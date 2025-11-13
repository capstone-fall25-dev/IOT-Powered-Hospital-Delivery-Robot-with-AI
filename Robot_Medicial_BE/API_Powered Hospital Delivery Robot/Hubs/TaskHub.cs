using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class TaskHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"📡 [TaskHub] Client connected: {Context.ConnectionId}");
            await Clients.Caller.SendAsync("ConnectedToTaskHub", new { message = "Connected to TaskHub successfully" });
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            Console.WriteLine($"⚡ [TaskHub] Client disconnected: {Context.ConnectionId}, Reason: {ex?.Message}");
            await base.OnDisconnectedAsync(ex);
        }

        // Cho phép client tham gia nhóm theo robotId (mỗi robot 1 group)
        public async Task JoinRobotGroup(string robotCode)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, robotCode);
            Console.WriteLine($"👥 Client {Context.ConnectionId} joined group {robotCode}");
        }

        public async Task LeaveRobotGroup(string robotCode)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, robotCode);
            Console.WriteLine($"👋 Client {Context.ConnectionId} left group {robotCode}");
        }
    }
}