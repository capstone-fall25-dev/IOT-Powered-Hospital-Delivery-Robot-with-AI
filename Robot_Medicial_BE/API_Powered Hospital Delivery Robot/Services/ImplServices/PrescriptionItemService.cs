using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class PrescriptionItemService : IPrescriptionItemService
    {
        private readonly IPrescriptionItemRepository _repository;
        private readonly IMapper _mapper;
        private readonly IAlertService _alertService;

        public PrescriptionItemService(IPrescriptionItemRepository repository, IMapper mapper, IAlertService alertService)
        {
            _repository = repository;
            _mapper = mapper;
            _alertService = alertService;
        }

        public async Task<PrescriptionItemResponseDto> CreateAsync(PrescriptionItemDto itemDto)
        {
            var item = _mapper.Map<PrescriptionItem>(itemDto);
            var created = await _repository.CreateAsync(item);
            return _mapper.Map<PrescriptionItemResponseDto>(created);
        }

        public async Task<IEnumerable<PrescriptionItemResponseDto>> GetAllAsync(ulong? prescriptionId = null, ulong? medicineId = null)
        {
            var items = await _repository.GetAllAsync(prescriptionId, medicineId);
            return _mapper.Map<IEnumerable<PrescriptionItemResponseDto>>(items);
        }

        public async Task<PrescriptionItemResponseDto?> GetByIdAsync(ulong id)
        {
            var item = await _repository.GetByIdAsync(id);
            return item != null ? _mapper.Map<PrescriptionItemResponseDto>(item) : null;
        }

        public async Task<ReportDamagedMedicineResponseDto> ReportDamagedAsync(ulong id, ReportDamagedMedicineDto damagedDto)
        {
            var success = await _repository.ReportDamagedAsync(id, damagedDto.Reason, damagedDto.Description);
            if (!success)
            {
                throw new InvalidOperationException("Prescription item not found");
            }
            // Tự động tạo alert với medicine-specific details (uses existing enums: high/manual)
            var alertResponse = await _alertService.CreateMedicineAlertAsync(id, damagedDto.Reason, damagedDto.Description, damagedDto.TaskId);
            // Manually construct custom response to avoid mapping issues
            var damagedResponse = new ReportDamagedMedicineResponseDto
            {
                AlertId = alertResponse.Id,
                PrescriptionItemId = id,
                Reason = damagedDto.Reason,
                Description = damagedDto.Description ?? "",
                TaskId = damagedDto.TaskId,
                CreatedAt = alertResponse.CreatedAt,
                Message = "Alert created successfully for damaged medicine"
            };
            return damagedResponse;
        }

        public async Task<PrescriptionItemResponseDto?> UpdateAsync(ulong id, PrescriptionItemDto itemDto)
        {
            var item = _mapper.Map<PrescriptionItem>(itemDto);
            var updated = await _repository.UpdateAsync(id, item);
            return updated != null ? _mapper.Map<PrescriptionItemResponseDto>(updated) : null;
        }
    }
}