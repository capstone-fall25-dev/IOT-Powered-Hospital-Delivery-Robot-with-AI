using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IDrugCategoryService
    {
        Task<IEnumerable<DrugCategoryResponseDto>> GetAllAsync();
        Task<DrugCategoryResponseDto?> GetByIdAsync(ulong id);
        Task<DrugCategoryResponseDto> CreateAsync(DrugCategoryDto categoryDto);
        Task<DrugCategoryResponseDto?> UpdateAsync(ulong id, DrugCategoryDto categoryDto);
    }
}
