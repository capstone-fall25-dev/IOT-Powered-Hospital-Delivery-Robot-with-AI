using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class RobotAudioHub : Hub
    {
        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"[RobotAudioHub] Client connected: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[RobotAudioHub] Client disconnected: {Context.ConnectionId}");
            return base.OnDisconnectedAsync(exception);
        }

        // ============================================================
        // 🚀 ROS2 (Python) gửi lên qua SignalR:
        // self.hub.send("StreamAudioFromRobot", [packet])
        // ============================================================
        public async Task StreamAudioFromRobot(AudioChunkDto chunk)
        {
            // Gửi cho tất cả client khác (FE) để FE nghe Robot Mic
            await Clients.Others.SendAsync("ReceiveRobotMicChunk", chunk);
        }
    }
}
