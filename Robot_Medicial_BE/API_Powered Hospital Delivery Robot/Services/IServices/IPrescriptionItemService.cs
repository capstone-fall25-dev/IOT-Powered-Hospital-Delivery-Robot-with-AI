using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IPrescriptionItemService
    {
        // Tạo mới một mục thuốc trong đơn
        Task<PrescriptionItemResponseDto> CreateAsync(PrescriptionItemCreateDto dto);

        // Cập nhật thông tin mục thuốc (số lượng, liều lượng, ghi chú...)
        Task<PrescriptionItemResponseDto?> UpdateAsync(ulong id, PrescriptionItemUpdateDto dto);

        // Xóa mục thuốc khỏi đơn
        Task<bool> DeleteAsync(ulong id);
    }
}