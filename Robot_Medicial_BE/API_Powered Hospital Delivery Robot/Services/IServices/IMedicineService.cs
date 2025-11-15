using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IMedicineService
    {
        // CATEGORY
        Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync();
        Task<CategoryResponseDto?> GetCategoryByIdAsync(ulong id);
        Task<CategoryResponseDto> CreateCategoryAsync(CategoryCreateDto dto);
        Task<CategoryResponseDto?> UpdateCategoryAsync(ulong id, CategoryUpdateDto dto);
        Task<bool> DeleteCategoryAsync(ulong id);

        // MEDICINE
        Task<IEnumerable<MedicineResponseDto>> GetAllMedicinesAsync();
        Task<MedicineResponseDto?> GetMedicineByIdAsync(ulong id);
        Task<MedicineResponseDto> CreateMedicineAsync(MedicineCreateDto dto);
        Task<MedicineResponseDto?> UpdateMedicineAsync(ulong id, MedicineUpdateDto dto);
        Task<bool> DeleteMedicineAsync(ulong id);
    }
}
