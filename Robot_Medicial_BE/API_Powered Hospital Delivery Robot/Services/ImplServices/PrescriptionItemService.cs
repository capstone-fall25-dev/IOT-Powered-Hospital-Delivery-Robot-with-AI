using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class PrescriptionItemService : IPrescriptionItemService
    {
        private readonly IPrescriptionItemRepository _repo;
        private readonly IMedicineRepository _medicineRepo;
        private readonly IPrescriptionRepository _presRepo;
        private readonly IMapper _mapper;

        public PrescriptionItemService(
            IPrescriptionItemRepository repo,
            IMedicineRepository medicineRepo,
            IPrescriptionRepository presRepo,
            IMapper mapper)
        {
            _repo = repo;
            _medicineRepo = medicineRepo;
            _presRepo = presRepo;
            _mapper = mapper;
        }

        // CREATE
        public async Task<PrescriptionItemResponseDto> CreateAsync(PrescriptionItemCreateDto dto)
        {
            var pres = await _presRepo.GetByIdAsync(dto.PrescriptionId);
            if (pres == null)
                throw new InvalidOperationException("Đơn thuốc không tồn tại.");

            var med = await _medicineRepo.GetByIdAsync(dto.MedicineId)
                ?? throw new InvalidOperationException("Thuốc không tồn tại.");

            var item = new PrescriptionItem
            {
                PrescriptionId = dto.PrescriptionId,
                MedicineId = dto.MedicineId,
                Quantity = dto.Quantity,
                Dosage = dto.Dosage,
                Instructions = dto.Instructions
            };

            var created = await _repo.CreateAsync(item);
            return _mapper.Map<PrescriptionItemResponseDto>(created);
        }

        // UPDATE
        public async Task<PrescriptionItemResponseDto?> UpdateAsync(ulong id, PrescriptionItemUpdateDto dto)
        {
            var exist = await _repo.GetByIdAsync(id);
            if (exist == null)
                return null;

            exist.MedicineId = dto.MedicineId;
            exist.Quantity = dto.Quantity;
            exist.Dosage = dto.Dosage;
            exist.Instructions = dto.Instructions;

            var updated = await _repo.UpdateAsync(exist);
            return _mapper.Map<PrescriptionItemResponseDto>(updated);
        }

        // DELETE
        public async Task<bool> DeleteAsync(ulong id)
        {
            return await _repo.DeleteAsync(id);
        }
    }
}