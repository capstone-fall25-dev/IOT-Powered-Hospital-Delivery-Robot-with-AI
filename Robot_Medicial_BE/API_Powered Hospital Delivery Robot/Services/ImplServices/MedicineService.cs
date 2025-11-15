using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
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

        // CATEGORY ================================
        public async Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync()
        {
            var list = await _catRepo.GetAllAsync();
            return _mapper.Map<IEnumerable<CategoryResponseDto>>(list);
        }

        public async Task<CategoryResponseDto?> GetCategoryByIdAsync(ulong id)
        {
            var c = await _catRepo.GetByIdAsync(id);
            return c == null ? null : _mapper.Map<CategoryResponseDto>(c);
        }

        public async Task<CategoryResponseDto> CreateCategoryAsync(CategoryCreateDto dto)
        {
            var exists = await _catRepo.GetByNameAsync(dto.Name);
            if (exists != null)
                throw new InvalidOperationException("Category name already exists.");

            var created = await _catRepo.CreateAsync(_mapper.Map<DrugCategory>(dto));
            return _mapper.Map<CategoryResponseDto>(created);
        }

        public async Task<CategoryResponseDto?> UpdateCategoryAsync(ulong id, CategoryUpdateDto dto)
        {
            var existing = await _catRepo.GetByIdAsync(id)
                ?? throw new InvalidOperationException("Category not found.");

            if (!string.IsNullOrWhiteSpace(dto.Name))
            {
                var dup = await _catRepo.GetByNameAsync(dto.Name);
                if (dup != null && dup.Id != id)
                    throw new InvalidOperationException("Category name already used.");

                existing.Name = dto.Name;
            }

            await _catRepo.UpdateAsync(id, existing);
            return _mapper.Map<CategoryResponseDto>(existing);
        }

        public async Task<bool> DeleteCategoryAsync(ulong id)
            => await _catRepo.DeleteAsync(id);

        // MEDICINE ====================================
        public async Task<IEnumerable<MedicineResponseDto>> GetAllMedicinesAsync()
        {
            var list = await _medRepo.GetAllAsync();
            return _mapper.Map<IEnumerable<MedicineResponseDto>>(list);
        }

        public async Task<MedicineResponseDto?> GetMedicineByIdAsync(ulong id)
        {
            var m = await _medRepo.GetByIdAsync(id);
            return m == null ? null : _mapper.Map<MedicineResponseDto>(m);
        }

        public async Task<MedicineResponseDto> CreateMedicineAsync(MedicineCreateDto dto)
        {
            var exists = await _medRepo.GetByCodeAsync(dto.MedicineCode);
            if (exists != null)
                throw new InvalidOperationException("Medicine code already exists.");

            var created = await _medRepo.CreateAsync(_mapper.Map<Medicine>(dto));
            return _mapper.Map<MedicineResponseDto>(created);
        }

        public async Task<MedicineResponseDto?> UpdateMedicineAsync(ulong id, MedicineUpdateDto dto)
        {
            var m = await _medRepo.GetByIdAsync(id)
                ?? throw new InvalidOperationException("Medicine not found.");

            if (!string.IsNullOrWhiteSpace(dto.MedicineCode))
            {
                var dup = await _medRepo.GetByCodeAsync(dto.MedicineCode);
                if (dup != null && dup.Id != id)
                    throw new InvalidOperationException("Medicine code already used.");
            }

            _mapper.Map(dto, m);
            var updated = await _medRepo.UpdateAsync(id, m);

            return updated == null ? null : _mapper.Map<MedicineResponseDto>(updated);
        }

        public Task<bool> DeleteMedicineAsync(ulong id)
            => _medRepo.DeleteAsync(id);
    }
}
