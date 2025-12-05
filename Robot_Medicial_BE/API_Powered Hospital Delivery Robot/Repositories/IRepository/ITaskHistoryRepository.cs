using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ITaskHistoryRepository
    {
        // Thêm mới bản ghi lịch sử task
        System.Threading.Tasks.Task AddAsync(TaskHistory history);

        // Lấy danh sách lịch sử task theo bộ lọc
        Task<List<TaskHistory>> GetHistoryAsync(TaskHistoryFilterDto filter);

        // Đếm số lượng bản ghi lịch sử theo bộ lọc
        Task<int> GetHistoryCountAsync(TaskHistoryFilterDto filter);

        // Lấy lịch sử task theo ID task
        Task<TaskHistory?> GetByTaskIdAsync(ulong taskId);

        // Lấy bản ghi lịch sử cuối cùng của task
        Task<TaskHistory?> GetLastHistoryAsync(ulong taskId);

        // Lấy bản ghi lịch sử theo ID
        Task<TaskHistory?> GetByIdAsync(ulong id);
    }
}
