using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class PrescriptionService : IPrescriptionService
    {
        private readonly IPrescriptionRepository _repo;
        private readonly IPrescriptionItemRepository _itemRepo;
        private readonly IPatientRepository _patientRepo;
        private readonly IMedicineRepository _medicineRepo;
        private readonly IMapper _mapper;

        public PrescriptionService(
            IPrescriptionRepository repo,
            IPrescriptionItemRepository itemRepo,
            IPatientRepository patientRepo,
            IMedicineRepository medicineRepo,
            IMapper mapper)
        {
            _repo = repo;
            _itemRepo = itemRepo;
            _patientRepo = patientRepo;
            _medicineRepo = medicineRepo;
            _mapper = mapper;
        }

        // ---------------- CREATE PRESCRIPTION ------------------
        public async Task<PrescriptionResponseDto> CreateAsync(PrescriptionCreateDto dto)
        {
            if (await _repo.GetByCodeAsync(dto.PrescriptionCode) != null)
                throw new InvalidOperationException("Mã đơn thuốc đã tồn tại.");

            var patient = await _patientRepo.GetByIdAsync(dto.PatientId)
                ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân.");

            var pres = new Prescription
            {
                PrescriptionCode = dto.PrescriptionCode,
                PatientId = dto.PatientId,
                CreatedAt = DateTime.Now,
                Status = "pending"
            };

            var created = await _repo.CreateAsync(pres);

            // ---------- Nếu có items thì tạo luôn ----------
            foreach (var itemDto in dto.Items)
            {
                var medicine = await _medicineRepo.GetByIdAsync(itemDto.MedicineId)
                    ?? throw new InvalidOperationException("Thuốc không tồn tại.");

                var item = new PrescriptionItem
                {
                    PrescriptionId = created.Id,
                    MedicineId = itemDto.MedicineId,
                    Quantity = itemDto.Quantity,
                    Dosage = itemDto.Dosage,
                    Instructions = itemDto.Instructions
                };

                await _itemRepo.CreateAsync(item);
            }

            var full = await _repo.GetByIdAsync(created.Id, includeItems: true);
            return _mapper.Map<PrescriptionResponseDto>(full);
        }

        // ---------------- GET BY ID ------------------
        public async Task<PrescriptionResponseDto?> GetByIdAsync(ulong id)
        {
            var pres = await _repo.GetByIdAsync(id, includeItems: true);
            return pres == null ? null : _mapper.Map<PrescriptionResponseDto>(pres);
        }

        // ---------------- GET ALL ------------------
        public async Task<IEnumerable<PrescriptionResponseDto>> GetAllAsync(ulong? patientId, string? status)
        {
            var list = await _repo.GetAllAsync(patientId, status);
            return _mapper.Map<IEnumerable<PrescriptionResponseDto>>(list);
        }

        // ---------------- UPDATE ------------------
        public async Task<PrescriptionResponseDto> UpdateAsync(ulong id, PrescriptionUpdateDto dto)
        {
            var pres = await _repo.GetByIdAsync(id, includeItems: true)
                ?? throw new InvalidOperationException("Không tìm thấy đơn thuốc.");

            if (!string.IsNullOrWhiteSpace(dto.PrescriptionCode))
            {
                var exist = await _repo.GetByCodeAsync(dto.PrescriptionCode);
                if (exist != null && exist.Id != id)
                    throw new InvalidOperationException("Mã đơn thuốc đã tồn tại.");

                pres.PrescriptionCode = dto.PrescriptionCode!;
            }

            if (dto.PatientId.HasValue)
            {
                var patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value)
                    ?? throw new InvalidOperationException("Bệnh nhân không tồn tại.");

                pres.PatientId = dto.PatientId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Status))
                pres.Status = dto.Status;

            var updated = await _repo.UpdateAsync(pres);
            return _mapper.Map<PrescriptionResponseDto>(updated);
        }

        // ---------------- SOFT DELETE ------------------
        public async Task<bool> SoftDeleteAsync(ulong id)
        {
            return await _repo.SoftDeleteAsync(id);
        }

        // ---------------- RESTORE ------------------
        public async Task<bool> RestoreAsync(ulong id)
        {
            return await _repo.RestoreAsync(id);
        }
    }
}
