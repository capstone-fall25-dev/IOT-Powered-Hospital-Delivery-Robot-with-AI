using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// 🧠 Hub trung tâm giao tiếp thời gian thực giữa Robot - Backend - Client UI
    /// </summary>
    public class RobotPositionHub : Hub
    {
        // Khi client (JS / ROS2 / App) kết nối
        public override async Task OnConnectedAsync()
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"✅ [SignalR] Client connected: {Context.ConnectionId}");
            Console.ResetColor();
            await base.OnConnectedAsync();
        }

        // Khi client ngắt kết nối
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"⚠️ [SignalR] Client disconnected: {Context.ConnectionId}");
            if (exception != null)
                Console.WriteLine($"   → Reason: {exception.Message}");
            Console.ResetColor();
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// 📡 Gửi dữ liệu vị trí robot (x, y, theta)
        /// </summary>
        public async Task BroadcastPosition(object position)
        {
            try
            {
                await Clients.All.SendAsync("ReceivePosition", position);
                Console.WriteLine($"📍 [Broadcast] Position: {System.Text.Json.JsonSerializer.Serialize(position)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastPosition] Error: {ex.Message}");
                Console.ResetColor();
            }
        }

        /// <summary>
        /// 📦 Gửi tín hiệu mở/đóng ngăn thuốc
        /// </summary>
        public async Task BroadcastCompartmentSignal(object signal)
        {
            try
            {
                await Clients.All.SendAsync("ReceiveCompartmentSignal", signal);
                Console.WriteLine($"📦 [Broadcast] Compartment Signal: {System.Text.Json.JsonSerializer.Serialize(signal)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastCompartmentSignal] Error: {ex.Message}");
                Console.ResetColor();
            }
        }

        /// <summary>
        /// 🤖 Gửi lệnh điều khiển chế độ robot (mapping / run_map / save_map / ...)
        /// </summary>
        public async Task BroadcastRobotCommand(object command)
        {
            try
            {
                await Clients.All.SendAsync("ReceiveRobotCommand", command);
                Console.WriteLine($"🧩 [Broadcast] Robot Command: {System.Text.Json.JsonSerializer.Serialize(command)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastRobotCommand] Error: {ex.Message}");
                Console.ResetColor();
            }
        }

        /// <summary>
        /// 🕹️ Gửi lệnh điều khiển động cơ (A/W/S/D/X)
        /// </summary>
        public async Task BroadcastMotorCommand(object command)
        {
            try
            {
                await Clients.All.SendAsync("ReceiveMotorCommand", command);
                Console.WriteLine($"🕹️ [Broadcast] Motor Command: {System.Text.Json.JsonSerializer.Serialize(command)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastMotorCommand] Error: {ex.Message}");
                Console.ResetColor();
            }
        }

        // ✅ Bổ sung mới: gửi list điểm đến xuống robot
        public async Task BroadcastDestinationRoute(object route)
        {
            try
            {
                await Clients.All.SendAsync("ReceiveDestinationRoute", route);
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine($"🧭 [Broadcast] Destination Route: {System.Text.Json.JsonSerializer.Serialize(route)}");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastDestinationRoute] Error: {ex.Message}");
                Console.ResetColor();
            }
        }

        /// <summary>
        /// 👥 Tham gia nhóm (ví dụ robot theo id)
        /// </summary>
        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            Console.WriteLine($"👥 Client {Context.ConnectionId} joined group '{groupName}'");
        }

        /// <summary>
        /// 🚪 Rời nhóm
        /// </summary>
        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            Console.WriteLine($"🚪 Client {Context.ConnectionId} left group '{groupName}'");
        }
    }
}
