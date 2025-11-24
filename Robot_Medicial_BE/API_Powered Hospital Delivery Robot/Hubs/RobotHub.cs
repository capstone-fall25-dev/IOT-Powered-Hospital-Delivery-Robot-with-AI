using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class RobotHub : Hub
    {
        private readonly ILogger<RobotHub> _logger;

        public RobotHub(ILogger<RobotHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("[RobotHub] Thiết bị kết nối thành công | ID: {ConnectionId}", Context.ConnectionId);

            // Gửi thông báo trạng thái nguồn về client vừa kết nối (thường là robot cần biết mình đã online)
            await Clients.Caller.SendAsync("RobotPowerStatus", new
            {
                power = false,
                message = "Đã kết nối tới server thành công"
            });
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            _logger.LogWarning("⚡ [HUB] Máy khách đã ngắt kết nối: {ConnId}, Lỗi: {Error}", Context.ConnectionId, ex?.Message);
            await base.OnDisconnectedAsync(ex);
        }
    }
}
