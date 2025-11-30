using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class TaskHistoryRepository : ITaskHistoryRepository
    {
        private readonly RobotManagerContext _context;
        public TaskHistoryRepository(RobotManagerContext context) => _context = context;

        public async System.Threading.Tasks.Task AddAsync(TaskHistory history)
        {
            await _context.TaskHistories.AddAsync(history);
            await _context.SaveChangesAsync();   // <--- THÊM DÒNG NÀY
        }


        public async Task<List<TaskHistory>> GetHistoryAsync(TaskHistoryFilterDto filter)
        {
            var query = _context.TaskHistories
                .Include(h => h.StopHistories)
                .AsQueryable();

            // === ÁP DỤNG FILTER ===
            if (filter.RobotId.HasValue)
                query = query.Where(h => h.RobotId == filter.RobotId);

            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(h => h.FinalStatus == filter.Status);

            if (!string.IsNullOrEmpty(filter.Priority))
                query = query.Where(h => h.Priority == filter.Priority);

            if (filter.FromDate.HasValue)
                query = query.Where(h => h.CompletedAt >= filter.FromDate || h.CreatedAt >= filter.FromDate);

            if (filter.ToDate.HasValue)
                query = query.Where(h => h.CompletedAt <= filter.ToDate || h.CreatedAt <= filter.ToDate);

            if (!string.IsNullOrEmpty(filter.Search))
            {
                var search = filter.Search.ToLower();
                query = query.Where(h =>
                    h.RobotCode.Contains(search) ||
                    h.RobotName!.Contains(search) ||
                    h.AssignedByName.Contains(search) ||
                    h.MapName!.Contains(search) ||
                    h.StopHistories.Any(s =>
                        s.DestinationName.Contains(search) ||
                        s.PatientName!.Contains(search) ||
                        s.ItemDesc!.Contains(search)));
            }

            // === SẮP XẾP + PHÂN TRANG ===
            query = query.OrderByDescending(h => h.CompletedAt ?? h.CreatedAt);

            if (filter.PageSize > 0)
            {
                query = query
                    .Skip((filter.Page - 1) * filter.PageSize)
                    .Take(filter.PageSize);
            }

            return await query.ToListAsync();
        }

        public async Task<int> GetHistoryCountAsync(TaskHistoryFilterDto filter)
        {
            var query = _context.TaskHistories.AsQueryable();

            // Áp dụng cùng filter như trên (copy-paste phần filter)
            if (filter.RobotId.HasValue) query = query.Where(h => h.RobotId == filter.RobotId);
            if (!string.IsNullOrEmpty(filter.Status)) query = query.Where(h => h.FinalStatus == filter.Status);
            if (!string.IsNullOrEmpty(filter.Priority)) query = query.Where(h => h.Priority == filter.Priority);
            if (filter.FromDate.HasValue) query = query.Where(h => h.CompletedAt >= filter.FromDate || h.CreatedAt >= filter.FromDate);
            if (filter.ToDate.HasValue) query = query.Where(h => h.CompletedAt <= filter.ToDate || h.CreatedAt <= filter.ToDate);
            if (!string.IsNullOrEmpty(filter.Search))
            {
                var search = filter.Search.ToLower();
                query = query.Where(h =>
                    h.RobotCode.Contains(search) ||
                    h.RobotName!.Contains(search) ||
                    h.AssignedByName.Contains(search) ||
                    h.MapName!.Contains(search) ||
                    h.StopHistories.Any(s =>
                        s.DestinationName.Contains(search) ||
                        s.PatientName!.Contains(search) ||
                        s.ItemDesc!.Contains(search)));
            }

            return await query.CountAsync();
        }

        public async Task<TaskHistory?> GetLastHistoryAsync(ulong taskId)
        {
            return await _context.TaskHistories
                .Where(h => h.TaskId == taskId)
                .OrderByDescending(h => h.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<TaskHistory?> GetByTaskIdAsync(ulong taskId)
            => await _context.TaskHistories
                .Include(h => h.StopHistories)
                .FirstOrDefaultAsync(h => h.TaskId == taskId);
    }
}
