using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class MedicineService : IMedicineService
    {
        private readonly IMedicineRepository _repository;
        private readonly IMapper _mapper;

        public MedicineService(IMedicineRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<MedicineResponseDto> CreateAsync(MedicineDto medicineDto)
        {
            var existing = await _repository.GetByCodeAsync(medicineDto.MedicineCode);
            if (existing != null)
            {
                throw new InvalidOperationException("Medicine code already exists");
            }

            var medicine = _mapper.Map<Medicine>(medicineDto);
            medicine.CreatedAt = DateTime.UtcNow;

            var created = await _repository.CreateAsync(medicine);
            return _mapper.Map<MedicineResponseDto>(created);
        }

        public async Task<IEnumerable<MedicineResponseDto>> GetAllAsync(ulong? categoryId = null, MedicineStatus? status = null)
        {
            var medicines = await _repository.GetAllAsync(categoryId, status);
            return _mapper.Map<IEnumerable<MedicineResponseDto>>(medicines);
        }

        public async Task<MedicineResponseDto?> GetByIdAsync(ulong id)
        {
            var medicine = await _repository.GetByIdAsync(id);
            return medicine != null ? _mapper.Map<MedicineResponseDto>(medicine) : null;
        }

        public async Task<ScanExpiredResponseDto> ScanExpiredAsync(bool flagOnly = true)
        {
            var response = await _repository.ScanAndFlagExpiredAsync(flagOnly);
            return response;
        }

        public async Task<int> RemoveExpiredAsync()
        {
            return await _repository.RemoveExpiredAsync();
        }

        public async Task<MedicineResponseDto?> UpdateAsync(ulong id, MedicineDto medicineDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Medicine not found");
            }

            if (medicineDto.MedicineCode != existing.MedicineCode)
            {
                var codeExisting = await _repository.GetByCodeAsync(medicineDto.MedicineCode);
                if (codeExisting != null)
                {
                    throw new InvalidOperationException("Medicine code already exists");
                }
            }

            var medicine = _mapper.Map<Medicine>(medicineDto);
            medicine.Id = id;

            var updated = await _repository.UpdateAsync(id, medicine);
            return updated != null ? _mapper.Map<MedicineResponseDto>(updated) : null;
        }

        public async Task<IEnumerable<MedicineStockReportDto>> GetStockReportAsync(int threshold = 10)
        {
            return await _repository.GetStockReportAsync(threshold);
        }
    }
}
