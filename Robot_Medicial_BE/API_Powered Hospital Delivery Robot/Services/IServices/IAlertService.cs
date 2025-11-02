using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IAlertService
    {
        Task<IEnumerable<AlertResponseDto>> GetAllAsync(ulong? robotId = null, string? status = null, string? severity = null, ulong? prescriptionItemId = null);
        Task<AlertResponseDto?> GetByIdAsync(ulong id);
        Task<AlertResponseDto> CreateAsync(AlertDto alertDto);
        Task<AlertResponseDto?> UpdateAsync(ulong id, AlertDto alertDto);
        Task<AlertResponseDto> CreateMedicineAlertAsync(ulong prescriptionItemId, string reason, string description, ulong? taskId = null); // Tạo alert cho medicine hỏng
    }
}
