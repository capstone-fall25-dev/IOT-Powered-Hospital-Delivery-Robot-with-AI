using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý giao tiếp audio real-time giữa robot và web (WebRTC)
    /// </summary>
    public class RobotAudioHub : Hub
    {
        /// <summary>
        /// Khi client kết nối
        /// </summary>
        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"[RobotAudioHub] Client đã kết nối: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }

        /// <summary>
        /// Khi client ngắt kết nối
        /// </summary>
        public override Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[RobotAudioHub] Client bị ngắt kết nối: {Context.ConnectionId}");
            return base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Web gửi OFFER (SDP) lên → chuyển cho robot
        /// </summary>
        public async Task SendOfferToRobot(string sdp)
        {
            await Clients.Others.SendAsync("ReceiveOffer", sdp);
        }

        /// <summary>
        /// Robot gửi ANSWER (SDP) lên → chuyển cho web
        /// </summary>
        public async Task SendAnswerToWeb(string sdp)
        {
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