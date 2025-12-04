using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    /// <summary>
    /// Hub quản lý kết nối robot
    /// </summary>
    public class RobotHub : Hub
    {
        private readonly ILogger<RobotHub> _logger;

        public RobotHub(ILogger<RobotHub> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Khi robot kết nối
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("[RobotHub] Thiết bị kết nối thành công | ID: {ConnectionId}", Context.ConnectionId);

            // Gửi thông báo trạng thái nguồn về robot vừa kết nối
            await Clients.Caller.SendAsync("RobotPowerStatus", new
            {
                power = false,
                message = "Đã kết nối tới server thành công"
            });
            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Khi robot ngắt kết nối
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            _logger.LogWarning("⚡ [HUB] Máy khách đã ngắt kết nối: {ConnId}, Lỗi: {Error}", Context.ConnectionId, ex?.Message);
            await base.OnDisconnectedAsync(ex);
        }
    }
}
