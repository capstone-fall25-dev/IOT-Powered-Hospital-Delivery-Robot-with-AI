using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IMapRepository
    {
        // Lấy danh sách tất cả các bản đồ
        Task<IEnumerable<Map>> GetAllAsync();

        // Lấy bản đồ theo ID, có thể include danh sách robot đang dùng
        Task<Map?> GetByIdAsync(ulong id, bool includeRobots = false);

        // Lấy bản đồ theo tên (dùng để kiểm tra trùng)
        Task<Map?> GetByNameAsync(string mapName);

        // Tạo mới bản đồ
        Task<Map> CreateAsync(Map map);

        // Cập nhật bản đồ theo ID
        Task<Map?> UpdateAsync(ulong id, Map map);

        // Upload bản đồ mới (từ ROS2 hoặc client)
        Task<Map> UploadAsync(Map map);

        // Xóa bản đồ theo ID
        Task<bool> DeleteAsync(ulong id);

        // Lấy dữ liệu ảnh (image bytes) của bản đồ
        Task<byte[]?> GetImageAsync(ulong id);
    }
}