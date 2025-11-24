using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRobotCompartmentRepository
    {
        // Lấy thông tin một ngăn chứa theo ID
        Task<RobotCompartment?> GetByIdAsync(ulong id);

        // Tạo nhiều ngăn chứa cùng lúc (thường khi tạo robot mới)
        System.Threading.Tasks.Task CreateManyAsync(IEnumerable<RobotCompartment> compartments);

        // Cập nhật trạng thái của ngăn chứa (ví dụ: Locked, Available...)
        Task<RobotCompartment?> UpdateStatusAsync(ulong id, string status);

        // Lấy các ngăn chứa theo danh mục và robot
        Task<IEnumerable<RobotCompartment>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId);

        // Lấy tất cả ngăn chứa của một robot
        Task<IEnumerable<RobotCompartment>> GetByRobotAsync(ulong robotId);

        // Gán bệnh nhân vào ngăn chứa
        System.Threading.Tasks.Task AssignPatientToCompartment(ulong compartmentId, ulong patientId);

        // Gán danh mục (category) cho ngăn chứa
        Task<bool> AssignCategoryToCompartment(ulong compId, ulong categoryId);

        // Lấy ngăn chứa của robot, có thể lọc theo category
        Task<IEnumerable<RobotCompartment>> GetFilteredByRobotAsync(ulong robotId, ulong? categoryId);

        // Giải phóng ngăn chứa (xóa bệnh nhân, reset trạng thái)
        System.Threading.Tasks.Task ReleaseCompartmentAsync(ulong compartmentId);

        // Xóa tất cả ngăn chứa của một robot (khi xóa robot)
        System.Threading.Tasks.Task DeleteByRobotIdAsync(ulong robotId);
    }
}