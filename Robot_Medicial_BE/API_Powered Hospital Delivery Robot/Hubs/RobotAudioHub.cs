using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class RobotAudioHub : Hub
    {
        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"[RobotAudioHub] Client đã kết nối: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[RobotAudioHub] Client bị ngắt kết nối: {Context.ConnectionId}");
            return base.OnDisconnectedAsync(exception);
        }

        // 🧭 Tuỳ bạn: có thể cho robot gọi RegisterRobot, web gọi RegisterWeb
        // và lưu ConnectionId vào static dictionary.
        // Ở đây demo đơn giản: broadcast cho Others.

        /// <summary>
        /// Web gửi OFFER (SDP) lên → chuyển cho Robot
        /// </summary>
        public async Task SendOfferToRobot(string sdp)
        {
            // Robot sẽ lắng "ReceiveOffer"
            await Clients.Others.SendAsync("ReceiveOffer", sdp);
        }

        /// <summary>
        /// Robot gửi ANSWER (SDP) lên → chuyển cho Web
        /// </summary>
        public async Task SendAnswerToWeb(string sdp)
        {
            // Web sẽ lắng "ReceiveAnswer"
            await Clients.Others.SendAsync("ReceiveAnswer", sdp);
        }

        /// <summary>
        /// Hai bên gửi ICE Candidate → chuyển chéo
        /// </summary>
        public async Task SendIceCandidate(string candidateJson)
        {
            await Clients.Others.SendAsync("ReceiveIceCandidate", candidateJson);
        }
    }
}