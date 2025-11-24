using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// 🎥 Hub chuyên nhận & phát video/frame hình ảnh từ Robot lên các client web
    /// </summary>
    public class RobotCameraHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[RobotCameraHub] Thiết bị kết nối: {Context.ConnectionId}");
            Console.ResetColor();
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[RobotCameraHub] Thiết bị ngắt kết nối: {Context.ConnectionId}");
            if (exception != null)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Lý do ngắt kết nối: {exception.Message}");
                Console.ResetColor();
            }
            Console.ResetColor();
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// 📡 Phát frame ảnh (Base64) đến tất cả client
        /// </summary>
        public async Task BroadcastCameraFrame(object frame)
        {
            await Clients.All.SendAsync("ReceiveCameraFrame", frame);
            Console.WriteLine($"🎞️ [Broadcast] Đã phát 1 frame camera → {Clients.All} lúc {DateTime.Now:HH:mm:ss.fff}");
        }
    }
}
