using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.EntityFrameworkCore.Storage;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ITaskRepository
    {
        // Lấy danh sách task (dạng nhẹ, có thể lọc)
        Task<IEnumerable<Models.Entities.Task>> GetListAsync(TaskFilterDto? filter);

        // Lấy chi tiết một task theo ID
        Task<Models.Entities.Task?> GetByIdAsync(ulong id);

        // Lấy task theo ID cho trang edit (không load prescription data để tối ưu performance)
        Task<Models.Entities.Task?> GetByIdForEditAsync(ulong id);

        // Tạo task mới
        Task<Models.Entities.Task> CreateAsync(Models.Entities.Task task);

        // Cập nhật task theo ID
        Task<Models.Entities.Task?> UpdateAsync(ulong id, Models.Entities.Task task);

        // Xóa task theo ID
        Task<bool> DeleteAsync(ulong id);

        // Tạo mới một điểm dừng của task
        Task<TaskStop> CreateStopAsync(TaskStop stop);

        // Xóa một điểm dừng của task
        Task<bool> DeleteStopAsync(ulong stopId);

        // Tạo phân bổ ngăn chứa cho task
        Task<CompartmentAssignment> CreateAssignmentAsync(CompartmentAssignment assignment);

        // Lấy thông tin robot theo ID
        Task<Robot?> GetRobotAsync(ulong id);

        // Lấy thông tin bản đồ theo ID
        Task<Map?> GetMapAsync(ulong id);

        // Lấy thông tin ngăn chứa của robot
        Task<RobotCompartment?> GetCompartmentAsync(ulong id);

        // Kiểm tra ngăn chứa đang được dùng chưa
        Task<bool> IsCompartmentBusyAsync(ulong id);

        // Kiểm tra robot đã có task pending chưa
        Task<bool> HasRobotPendingTaskAsync(ulong robotId);

        // Lấy đơn thuốc mới nhất của bệnh nhân
        Task<Prescription?> GetLatestApprovedPrescriptionForPatientAsync(ulong patientId);

        // Lấy đơn thuốc theo mã code
        Task<Prescription?> GetPrescriptionByCodeAsync(string code);

        // Cập nhật trạng thái robot
        System.Threading.Tasks.Task UpdateRobotStatusAsync(ulong robotId, string status);

        // Bắt đầu transaction
        Task<IDbContextTransaction> BeginTransactionAsync();

        // Lưu thay đổi vào database
        Task<int> SaveChangesAsync();

        // Lấy task kèm danh sách các điểm dừng
        Task<Models.Entities.Task?> GetTaskWithStopsAsync(ulong taskId);

        // Lấy bản đồ liên quan đến task
        Task<Map?> GetMapByTaskIdAsync(ulong taskId);
    }
}