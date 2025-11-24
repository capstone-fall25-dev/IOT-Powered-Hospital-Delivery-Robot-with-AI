using API_Powered_Hospital_Delivery_Robot.Models.Entities;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface IRoomRepository
    {
        // Lấy danh sách tất cả các phòng
        Task<IEnumerable<Room>> GetAllAsync();

        // Lấy thông tin phòng theo ID
        Task<Room?> GetByIdAsync(ulong id);

        // Tạo phòng mới
        Task<Room> CreateAsync(Room room);

        // Cập nhật thông tin phòng theo ID
        Task<Room?> UpdateAsync(ulong id, Room room);

        // Xóa phòng theo ID
        Task<bool> DeleteAsync(ulong id);
    }
}