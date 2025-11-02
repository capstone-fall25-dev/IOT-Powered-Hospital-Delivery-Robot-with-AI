using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class DrugCategoryService : IDrugCategoryService
    {
        private readonly IDrugCategoryRepository _repository;
        private readonly IMapper _mapper;

        public DrugCategoryService(IDrugCategoryRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<DrugCategoryResponseDto> CreateAsync(DrugCategoryDto categoryDto)
        {
            var existing = await _repository.GetByNameAsync(categoryDto.Name);
            if (existing != null)
            {
                throw new InvalidOperationException("Category name already exists");
            }

            var category = _mapper.Map<DrugCategory>(categoryDto);

            var created = await _repository.CreateAsync(category);
            return _mapper.Map<DrugCategoryResponseDto>(created);
        }

        public async Task<IEnumerable<DrugCategoryResponseDto>> GetAllAsync()
        {
            var categories = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<DrugCategoryResponseDto>>(categories);
        }

        public async Task<DrugCategoryResponseDto?> GetByIdAsync(ulong id)
        {
            var category = await _repository.GetByIdAsync(id);
            return category != null ? _mapper.Map<DrugCategoryResponseDto>(category) : null;
        }

        public async Task<DrugCategoryResponseDto?> UpdateAsync(ulong id, DrugCategoryDto categoryDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Category not found");
            }

            if (categoryDto.Name != existing.Name)
            {
                var nameExisting = await _repository.GetByNameAsync(categoryDto.Name);
                if (nameExisting != null)
                {
                    throw new InvalidOperationException("Category name already exists");
                }
            }

            var category = _mapper.Map<DrugCategory>(categoryDto);
            category.Id = id;

            var updated = await _repository.UpdateAsync(id, category);
            return updated != null ? _mapper.Map<DrugCategoryResponseDto>(updated) : null;
        }
    }
}
