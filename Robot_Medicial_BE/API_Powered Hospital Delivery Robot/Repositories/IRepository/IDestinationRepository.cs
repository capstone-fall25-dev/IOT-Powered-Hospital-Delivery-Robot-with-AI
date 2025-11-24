using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IDestinationRepository
    {
        // Lấy danh sách điểm đến, có thể lọc theo khu vực hoặc tầng
        Task<IEnumerable<Destination>> GetAllAsync(string? area = null, string? floor = null);

        // Lấy điểm đến theo ID
        Task<Destination?> GetByIdAsync(ulong id);

        // Lấy điểm đến theo tên (phòng, quầy, khoa...)
        Task<Destination?> GetByNameAsync(string name);

        // Tạo mới một điểm đến
        Task<Destination> CreateAsync(Destination destination);

        // Cập nhật thông tin điểm đến theo ID
        Task<Destination?> UpdateAsync(ulong id, Destination destination);

        // Lấy tọa độ vị trí của điểm đến (dùng cho robot di chuyển)
        Task<DestinationPositionDto?> GetPositionByIdAsync(ulong destinationId);
    }
}