using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    /// <summary>
    /// Repository quản lý dữ liệu robot
    /// </summary>
    public class RobotRepository : IRobotRepository
    {
        private readonly RobotManagerContext _context;

        /// <summary>
        /// Khởi tạo repository với database context
        /// </summary>
        public RobotRepository(RobotManagerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Gán bản đồ cho robot
        /// </summary>
        public async Task<Robot?> AssignMapAsync(ulong robotId, ulong mapId)
        {
            var robot = await _context.Robots.FindAsync(robotId);
            if (robot == null) return null;

            var map = await _context.Maps.FindAsync(mapId);
            if (map == null) return null;

            robot.MapId = mapId;
            robot.UpdatedAt = DateTimeHelper.Now();
            await _context.SaveChangesAsync();
            return robot;
        }

        /// <summary>
        /// Tạo robot mới
        /// </summary>
        public async Task<Robot> CreateAsync(Robot robot)
        {
            _context.Robots.Add(robot);
            await _context.SaveChangesAsync();
            return robot;
        }

        /// <summary>
        /// Lấy danh sách robot (có thể lọc theo trạng thái)
        /// </summary>
        public async Task<IEnumerable<Robot>> GetAllAsync(string? status = null)
        {
            var query = _context.Robots.AsQueryable();
            if (!string.IsNullOrEmpty(status))
                query = query.Where(r => r.Status == status);
            return await query.ToListAsync();
        }

        /// <summary>
        /// Lấy danh sách robot theo map ID kèm thông tin ngăn chứa
        /// </summary>
        public async Task<IEnumerable<Robot>> GetAllByMapWithCompartmentsAsync(ulong mapId)
        {
            return await _context.Robots
                .Include(r => r.RobotCompartments)
                .Where(r => r.MapId == mapId)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy robot theo mã code
        /// </summary>
        public async Task<Robot?> GetByCodeAsync(string code)
        {
            return await _context.Robots.FirstOrDefaultAsync(r => r.Code == code);
        }

        /// <summary>
        /// Lấy robot theo ID, có thể include các quan hệ
        /// </summary>
        public async Task<Robot?> GetByIdAsync(
            ulong id,
            bool includeCompartments = false,
            bool includeTasks = false,
            bool includeTaskStops = false)
        {
            var query = _context.Robots.AsQueryable();

            // Include Compartments
            if (includeCompartments)
                query = query.Include(r => r.RobotCompartments);

            // Include Tasks
            if (includeTasks)
            {
                query = query.Include(r => r.Tasks);

                // Include TaskStops nếu cần
                if (includeTaskStops)
                {
                    query = query.Include(r => r.Tasks)
                                 .ThenInclude(t => t.TaskStops);

                }
            }

            return await query.FirstOrDefaultAsync(r => r.Id == id);
        }

        /// <summary>
        /// Cập nhật toàn bộ thông tin robot theo ID
        /// </summary>
        public async Task<Robot?> UpdateAsync(ulong id, Robot robot)
        {
            var existing = await _context.Robots.FindAsync(id);
            if (existing == null) return null;

            existing.Code = robot.Code;
            existing.Name = robot.Name;
            existing.BatteryPercent = robot.BatteryPercent;
            existing.Latitude = robot.Latitude;
            existing.Longitude = robot.Longitude;
            existing.ProgressOverallPct = robot.ProgressOverallPct;
            existing.ProgressLegPct = robot.ProgressLegPct;
            existing.IsMicOn = robot.IsMicOn;
            existing.EtaDeliveryAt = robot.EtaDeliveryAt;
            existing.EtaReturnAt = robot.EtaReturnAt;
            existing.ErrorCountSession = robot.ErrorCountSession;
            existing.MapId = robot.MapId;
            existing.UpdatedAt = DateTimeHelper.Now();

            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Cập nhật vị trí hiện tại của robot
        /// </summary>
        public async Task<Robot?> UpdatePositionAsync(ulong id, decimal lat, decimal lng)
        {
            var robot = await _context.Robots.FindAsync(id);
            if (robot == null) return null;

            robot.Latitude = lat;
            robot.Longitude = lng;
            robot.LastHeartbeatAt = DateTimeHelper.Now();
            robot.UpdatedAt = DateTimeHelper.Now();
            await _context.SaveChangesAsync();
            return robot;
        }

        /// <summary>
        /// Cập nhật trạng thái robot theo code
        /// </summary>
        public async Task<Robot?> UpdateStatusAsync(string code, string status)
        {
            var robot = await _context.Robots.FirstOrDefaultAsync(r => r.Code == code);
            if (robot == null) return null;

            robot.Status = status;
            robot.UpdatedAt = DateTimeHelper.Now();
            await _context.SaveChangesAsync();
            return robot;
        }

        /// <summary>
        /// Cập nhật trạng thái robot theo ID
        /// </summary>
        public async Task<Robot?> UpdateStatusAsync(ulong id, string status)
        {
            var robot = await _context.Robots.FindAsync(id);
            if (robot == null) return null;

            robot.Status = status;
            robot.LastHeartbeatAt = DateTimeHelper.Now(); // ➕ ghi nhận heartbeat khi có report
            robot.UpdatedAt = DateTimeHelper.Now();
            await _context.SaveChangesAsync();
            return robot;
        }

        /// <summary>
        /// Gán map cho robot (tên khác của AssignMapAsync)
        /// </summary>
        public async Task<Robot?> AssignMapToRobotAsync(ulong robotId, ulong mapId)
        {
            var robot = await _context.Robots.FindAsync(robotId);
            if (robot == null) return null;

            var map = await _context.Maps.FindAsync(mapId);
            if (map == null) return null;

            robot.MapId = mapId;
            robot.UpdatedAt = DateTimeHelper.Now();

            await _context.SaveChangesAsync();
            return robot;
        }

        /// <summary>
        /// Cập nhật robot (truyền trực tiếp entity)
        /// </summary>
        public async Task<Robot> UpdateAsync(Robot robot)
        {
            _context.Robots.Update(robot);
            await _context.SaveChangesAsync();
            return robot;
        }
    }
}
