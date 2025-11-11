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
            _logger.LogInformation("🤖 [HUB] Client connected: {ConnId}", Context.ConnectionId);
            await Clients.Caller.SendAsync("RobotPowerStatus", new { power = false, message = "Connected" });
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            _logger.LogWarning("⚡ [HUB] Client disconnected: {ConnId}, Error: {Error}", Context.ConnectionId, ex?.Message);
            await base.OnDisconnectedAsync(ex);
        }
    }
}
