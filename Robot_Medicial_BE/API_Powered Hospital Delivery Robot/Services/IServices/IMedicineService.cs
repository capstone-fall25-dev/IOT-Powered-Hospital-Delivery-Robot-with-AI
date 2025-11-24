using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IMedicineService
    {
        // Lấy danh sách tất cả danh mục thuốc
        Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync();

        // Lấy một danh mục thuốc theo ID
        Task<CategoryResponseDto?> GetCategoryByIdAsync(ulong id);

        // Tạo mới danh mục thuốc
        Task<CategoryResponseDto> CreateCategoryAsync(CategoryCreateDto dto);

        // Cập nhật danh mục thuốc
        Task<CategoryResponseDto?> UpdateCategoryAsync(ulong id, CategoryUpdateDto dto);

        // Xóa danh mục thuốc (kiểm tra có thuốc đang dùng không)
        Task<bool> DeleteCategoryAsync(ulong id);

        // Lấy danh sách tất cả các loại thuốc
        Task<IEnumerable<MedicineResponseDto>> GetAllMedicinesAsync();

        // Lấy thông tin thuốc theo ID
        Task<MedicineResponseDto?> GetMedicineByIdAsync(ulong id);

        // Tạo mới một loại thuốc
        Task<MedicineResponseDto> CreateMedicineAsync(MedicineCreateDto dto);

        // Cập nhật thông tin thuốc
        Task<MedicineResponseDto?> UpdateMedicineAsync(ulong id, MedicineUpdateDto dto);

        // Xóa thuốc (có thể soft delete)
        Task<bool> DeleteMedicineAsync(ulong id);
    }
}