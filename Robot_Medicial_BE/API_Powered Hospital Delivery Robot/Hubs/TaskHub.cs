using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class TaskHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"📡 [TaskHub] Thiết bị kết nối: {Context.ConnectionId}");
            await Clients.Caller.SendAsync("ConnectedToTaskHub", new { message = "Kết nối tới TaskHub thành công" });
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            Console.WriteLine($"⚡ [TaskHub] Thiết bị ngắt kết nối: {Context.ConnectionId}, Lý do: {ex?.Message}");
            await base.OnDisconnectedAsync(ex);
        }

        // Cho phép client tham gia nhóm theo robotId (mỗi robot 1 group)
        public async Task JoinRobotGroup(string robotCode)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, robotCode);
            Console.WriteLine($"👥 Client {Context.ConnectionId} đã tham gia nhóm {robotCode}");
        }

        public async Task LeaveRobotGroup(string robotCode)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, robotCode);
            Console.WriteLine($"👋 Client {Context.ConnectionId} đã rời nhóm {robotCode}");
        }
    }
}