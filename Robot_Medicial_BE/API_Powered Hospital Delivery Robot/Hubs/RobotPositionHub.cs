using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// 🧠 Hub trung tâm giao tiếp thời gian thực giữa Robot - Backend - Giao diện người dùng
    /// </summary>
    public class RobotPositionHub : Hub
    {
        // Khi client (JS / ROS2 / App) kết nối
        public override async Task OnConnectedAsync()
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"✅ [SignalR] Thiết bị đã kết nối: {Context.ConnectionId}");
            Console.ResetColor();
            await base.OnConnectedAsync();
        }

        // Khi client ngắt kết nối
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"⚠️ [SignalR] Thiết bị ngắt kết nối: {Context.ConnectionId}");
            if (exception != null)
                Console.WriteLine($" → Lý do: {exception.Message}");
            Console.ResetColor();
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// 📡 Gửi dữ liệu vị trí robot (x, y, theta) đến tất cả client
        /// </summary>
        public async Task BroadcastPosition(object position)
        {
            try
            {
                await Clients.All.SendAsync("ReceivePosition", position);
                Console.WriteLine($"📍 [Broadcast] Vị trí robot: {System.Text.Json.JsonSerializer.Serialize(position)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastPosition] Lỗi: {ex.Message}");
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
                Console.WriteLine($"📦 [Broadcast] Tín hiệu ngăn thuốc: {System.Text.Json.JsonSerializer.Serialize(signal)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastCompartmentSignal] Lỗi: {ex.Message}");
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
                Console.WriteLine($"🧩 [Broadcast] Lệnh robot: {System.Text.Json.JsonSerializer.Serialize(command)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastRobotCommand] Lỗi: {ex.Message}");
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
                Console.WriteLine($"🕹️ [Broadcast] Lệnh động cơ: {System.Text.Json.JsonSerializer.Serialize(command)}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastMotorCommand] Lỗi: {ex.Message}");
                Console.ResetColor();
            }
        }

        // Gửi danh sách điểm đến (lộ trình giao thuốc) xuống robot
        public async Task BroadcastDestinationRoute(object route)
        {
            try
            {
                await Clients.All.SendAsync("ReceiveDestinationRoute", route);
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine($"🧭 [Broadcast] Lộ trình điểm đến: {System.Text.Json.JsonSerializer.Serialize(route)}");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ [BroadcastDestinationRoute] Lỗi: {ex.Message}");
                Console.ResetColor();
            }
        }

        /// <summary>
        /// 👥 Tham gia vào một nhóm (ví dụ: nhóm theo mã robot hoặc phòng bệnh)
        /// </summary>
        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            Console.WriteLine($"👥 Client {Context.ConnectionId} đã tham gia nhóm '{groupName}'");
        }

        /// <summary>
        /// 🚪 Rời nhóm
        /// </summary>
        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            Console.WriteLine($"🚪 Client {Context.ConnectionId} đã rời nhóm '{groupName}'");
        }
    }
}
