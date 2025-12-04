using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý thuốc và danh mục thuốc
    /// </summary>
    public class MedicineService : IMedicineService
    {
        private readonly IMedicineRepository _medRepo;
        private readonly IDrugCategoryRepository _catRepo;
        private readonly IMapper _mapper;

        public MedicineService(IMedicineRepository m, IDrugCategoryRepository c, IMapper mapper)
        {
            _medRepo = m;
            _catRepo = c;
            _mapper = mapper;
        }

        /// <summary>
        /// Lấy danh sách tất cả danh mục thuốc
        /// </summary>
        public async Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync()
        {
            var list = await _catRepo.GetAllAsync();
            return _mapper.Map<IEnumerable<CategoryResponseDto>>(list);
        }

        /// <summary>
        /// Lấy chi tiết danh mục thuốc theo ID
        /// </summary>
        public async Task<CategoryResponseDto?> GetCategoryByIdAsync(ulong id)
        {
            var c = await _catRepo.GetByIdAsync(id);
            return c == null ? null : _mapper.Map<CategoryResponseDto>(c);
        }

        /// <summary>
        /// Tạo danh mục thuốc mới
        /// </summary>
        public async Task<CategoryResponseDto> CreateCategoryAsync(CategoryCreateDto dto)
        {
            var exists = await _catRepo.GetByNameAsync(dto.Name);
            if (exists != null)
                throw new InvalidOperationException("Tên danh mục thuốc đã tồn tại.");

            var created = await _catRepo.CreateAsync(_mapper.Map<DrugCategory>(dto));
            return _mapper.Map<CategoryResponseDto>(created);
        }

        /// <summary>
        /// Cập nhật danh mục thuốc
        /// </summary>
        public async Task<CategoryResponseDto?> UpdateCategoryAsync(ulong id, CategoryUpdateDto dto)
        {
            var existing = await _catRepo.GetByIdAsync(id)
                ?? throw new InvalidOperationException("Không tìm thấy danh mục thuốc.");

            if (!string.IsNullOrWhiteSpace(dto.Name))
            {
                var dup = await _catRepo.GetByNameAsync(dto.Name);
                if (dup != null && dup.Id != id)
                    throw new InvalidOperationException("Tên danh mục thuốc đã được sử dụng.");

                existing.Name = dto.Name;
            }

            await _catRepo.UpdateAsync(id, existing);
            return _mapper.Map<CategoryResponseDto>(existing);
        }

        /// <summary>
        /// Xóa danh mục thuốc
        /// </summary>
        public async Task<bool> DeleteCategoryAsync(ulong id)
            => await _catRepo.DeleteAsync(id);

        /// <summary>
        /// Lấy danh sách tất cả thuốc
        /// </summary>
        public async Task<IEnumerable<MedicineResponseDto>> GetAllMedicinesAsync()
        {
            var list = await _medRepo.GetAllAsync();
            return _mapper.Map<IEnumerable<MedicineResponseDto>>(list);
        }

        /// <summary>
        /// Lấy chi tiết thuốc theo ID
        /// </summary>
        public async Task<MedicineResponseDto?> GetMedicineByIdAsync(ulong id)
        {
            var m = await _medRepo.GetByIdAsync(id);
            return m == null ? null : _mapper.Map<MedicineResponseDto>(m);
        }

        /// <summary>
        /// Tạo thuốc mới
        /// </summary>
        public async Task<MedicineResponseDto> CreateMedicineAsync(MedicineCreateDto dto)
        {
            var exists = await _medRepo.GetByCodeAsync(dto.MedicineCode);
            if (exists != null)
                throw new InvalidOperationException("Mã thuốc đã tồn tại.");

            var created = await _medRepo.CreateAsync(_mapper.Map<Medicine>(dto));
            return _mapper.Map<MedicineResponseDto>(created);
        }

        /// <summary>
        /// Cập nhật thông tin thuốc
        /// </summary>
        public async Task<MedicineResponseDto?> UpdateMedicineAsync(ulong id, MedicineUpdateDto dto)
        {
            var m = await _medRepo.GetByIdAsync(id)
                ?? throw new InvalidOperationException("Không tìm thấy thuốc.");

            if (!string.IsNullOrWhiteSpace(dto.MedicineCode))
            {
                var dup = await _medRepo.GetByCodeAsync(dto.MedicineCode);
                if (dup != null && dup.Id != id)
                    throw new InvalidOperationException("Mã thuốc đã được sử dụng.");
            }

            _mapper.Map(dto, m);
            var updated = await _medRepo.UpdateAsync(id, m);

            return updated == null ? null : _mapper.Map<MedicineResponseDto>(updated);
        }

        /// <summary>
        /// Xóa thuốc
        /// </summary>
        public Task<bool> DeleteMedicineAsync(ulong id)
            => _medRepo.DeleteAsync(id);
    }
}
