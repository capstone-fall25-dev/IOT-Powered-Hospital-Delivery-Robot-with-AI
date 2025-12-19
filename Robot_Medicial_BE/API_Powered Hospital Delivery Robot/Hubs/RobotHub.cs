using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
// Giải quyết trùng tên:
using Task = System.Threading.Tasks.Task;
// using RobotTaskEntity = API_Powered_Hospital_Delivery_Robot.Models.Entities.Task;

namespace API_Powered_Hospital_Delivery_Robot.Hubs
{
    public class RobotHub : Hub
    {
        private readonly ILogger<RobotHub> _logger;
        private readonly RobotManagerContext _db;
        private readonly IConfiguration _config;

        private const string GroupPrefix = "robot:";
        private string AllowedRobotCode => _config["Robots:AllowedCode"] ?? "RBT001";

        public RobotHub(ILogger<RobotHub> logger, RobotManagerContext db, IConfiguration config)
        {
            _logger = logger;
            _db = db;
            _config = config;
        }

        public override Task OnConnectedAsync()
        {
            _logger.LogInformation("[RobotHub] Connected | ConnId={ConnId}", Context.ConnectionId);
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? ex)
        {
            _logger.LogWarning("[RobotHub] Disconnected | ConnId={ConnId} | Error={Error}", Context.ConnectionId, ex?.Message);
            return base.OnDisconnectedAsync(ex);
        }

        /// <summary>
        /// Robot gọi sau khi kết nối: đăng ký robotCode và join group riêng.
        /// Server phản hồi trạng thái hiện tại từ DB.
        /// </summary>
        public async Task RegisterRobot(string robotCode)
        {
            if (string.IsNullOrWhiteSpace(robotCode))
            {
                await Clients.Caller.SendAsync("RobotRegistrationFailed", new { error = "robotCode is required" });
                Context.Abort();
                return;
            }

            if (!string.Equals(robotCode, AllowedRobotCode, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("[RobotHub] Reject robotCode={RobotCode}", robotCode);
                await Clients.Caller.SendAsync("RobotRegistrationFailed", new { error = "robotCode not allowed" });
                Context.Abort();
                return;
            }

            var group = GroupPrefix + robotCode;
            await Groups.AddToGroupAsync(Context.ConnectionId, group);

            var robot = await _db.Robots.AsNoTracking().FirstOrDefaultAsync(r => r.Code == robotCode);
            var status = robot?.Status ?? "offline";
            var power = string.Equals(status, "at_station", StringComparison.OrdinalIgnoreCase);

            await Clients.Caller.SendAsync("RobotPowerStatus", new
            {
                robotCode,
                power,
                status,
                message = "registered"
            });
        }

        /// <summary>
        /// Heartbeat định kỳ (không đổi status; chỉ lưu thời gian)
        /// </summary>
        public async Task Heartbeat(string robotCode)
        {
            if (!string.Equals(robotCode, AllowedRobotCode, StringComparison.OrdinalIgnoreCase))
                return;

            var robot = await _db.Robots.FirstOrDefaultAsync(r => r.Code == robotCode);
            if (robot == null) return;

            robot.LastHeartbeatAt = DateTime.Now;
            await _db.SaveChangesAsync();
        }
    }
}
