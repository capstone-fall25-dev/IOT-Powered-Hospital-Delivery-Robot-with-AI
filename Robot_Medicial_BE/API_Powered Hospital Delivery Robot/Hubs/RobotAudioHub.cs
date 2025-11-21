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
