using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class RobotAudioHub : Hub
    {
        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"[RobotAudioHub] Thiết bị kết nối: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[RobotAudioHub] Thiết bị ngắt kết nối: {Context.ConnectionId}");
            if (exception != null)
            {
                Console.WriteLine($"Lý do ngắt: {exception.Message}");
            }
            return base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// 🔊 Robot gửi audio lên (ROS2 mic) → broadcast cho các client khác (Web)
        /// </summary>
        public async Task StreamAudioFromRobot(AudioChunkDto chunk)
        {
            var msg = new
            {
                type = "robot_mic_chunk",
                stream_id = chunk.StreamId ?? "robot_mic",
                audio_b64 = chunk.Audio_b64,
                SampleRate = chunk.SampleRate,
                Channels = chunk.Channels,
                Timestamp = chunk.Timestamp
            };

            // Web đang nghe event "ReceiveRobotMicChunk"
            await Clients.Others.SendAsync("ReceiveRobotMicChunk", msg);
        }

        /// <summary>
        /// 🎤 Web gửi audio lên (mic web) → broadcast cho các client khác (ROS2)
        /// </summary>
        public async Task StreamAudioFromWeb(AudioChunkDto chunk)
        {
            var msg = new
            {
                type = "web_mic_chunk",
                stream_id = chunk.StreamId ?? "mic_main",
                audio_b64 = chunk.Audio_b64,
                SampleRate = chunk.SampleRate,
                Channels = chunk.Channels,
                Timestamp = chunk.Timestamp
            };

            // Python đang nghe event "ReceiveAudioChunk"
            await Clients.Others.SendAsync("ReceiveAudioChunk", msg);
        }
    }
}
