using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// 🎥 Hub chuyên nhận & phát video từ Robot
    /// </summary>
    public class RobotCameraHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"✅ [CameraHub] Client connected: {Context.ConnectionId}");
            Console.ResetColor();
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"⚠️ [CameraHub] Client disconnected: {Context.ConnectionId}");
            Console.ResetColor();
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// 📡 Phát frame ảnh (Base64) đến tất cả client
        /// </summary>
        public async Task BroadcastCameraFrame(object frame)
        {
            await Clients.All.SendAsync("ReceiveCameraFrame", frame);
            Console.WriteLine($"🎞️ [Broadcast] Camera frame sent at {DateTime.UtcNow}");
        }
    }
}
