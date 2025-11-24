using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRoomService
    {
        // Lấy danh sách tất cả các phòng
        Task<IEnumerable<RoomResponseDto>> GetAllAsync();

        // Lấy thông tin một phòng theo ID
        Task<RoomResponseDto?> GetByIdAsync(ulong id);

        // Tạo mới một phòng
        Task<RoomResponseDto> CreateAsync(RoomDto roomDto);

        // Cập nhật thông tin phòng (tên, tầng, khoa...)
        Task<RoomResponseDto?> UpdateAsync(ulong id, RoomDto roomDto);

        // Xóa phòng (kiểm tra còn bệnh nhân không)
        Task<bool> DeleteAsync(ulong id);

        // Chuyển bệnh nhân sang phòng mới
        Task<PatientResponseDto> MoveRoomAsync(ulong patientId, ulong newRoomId);
    }
}