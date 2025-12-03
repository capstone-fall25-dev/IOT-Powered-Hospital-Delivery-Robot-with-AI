using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class PatientService : IPatientService
    {
        private readonly IPatientRepository _repo;
        private readonly IMapper _mapper;
        private readonly ILogService _log;

        public PatientService(IPatientRepository repo, IMapper mapper, ILogService log)
        {
            _repo = repo;
            _mapper = mapper;
            _log = log;
        }

        public async Task<IEnumerable<PatientResponseDto>> GetAllAsync()
        {
            var list = await _repo.GetAllAsync();
            return _mapper.Map<IEnumerable<PatientResponseDto>>(list);
        }

        public async Task<IEnumerable<PatientResponseDto>> FilterAsync(PatientFilterDto filter)
        {
            var list = await _repo.FilterAsync(filter);
            return _mapper.Map<IEnumerable<PatientResponseDto>>(list);
        }

        public async Task<PatientResponseDto?> GetByIdAsync(ulong id)
        {
            var p = await _repo.GetByIdAsync(id, includeRoom: true, includePrescriptions: true);
            return p == null ? null : _mapper.Map<PatientResponseDto>(p);
        }

        public async Task<PatientResponseDto> CreateAsync(PatientCreateDto dto)
        {
            var exists = await _repo.GetByCodeAsync(dto.PatientCode);
            if (exists != null)
                throw new InvalidOperationException("Patient code already exists");

            if (dto.RoomId.HasValue && !await _repo.ExistsRoomAsync(dto.RoomId.Value))
                throw new InvalidOperationException("Room does not exist");

            var patient = _mapper.Map<Patient>(dto);
            patient.CreatedAt = DateTime.Now;

            var created = await _repo.CreateAsync(patient);
            return _mapper.Map<PatientResponseDto>(created);
        }

        public async Task<PatientResponseDto?> UpdateAsync(ulong id, PatientUpdateDto dto)
        {
            var p = await _repo.GetByIdAsync(id);
            if (p == null) return null;

            if (!string.IsNullOrEmpty(dto.PatientCode) && dto.PatientCode != p.PatientCode)
            {
                var exists = await _repo.GetByCodeAsync(dto.PatientCode);
                if (exists != null)
                    throw new InvalidOperationException("Patient code already exists");
            }

            if (dto.RoomId.HasValue && !await _repo.ExistsRoomAsync(dto.RoomId.Value))
                throw new InvalidOperationException("Room does not exist");

            var updated = _mapper.Map(dto, p);
            await _repo.UpdateAsync(id, updated);

            return _mapper.Map<PatientResponseDto>(updated);
        }

        public async Task<PatientResponseDto?> DischargeAsync(ulong id, string? reason)
        {
            var updated = await _repo.DischargeAsync(id, reason);
            if (updated == null) return null;

            return _mapper.Map<PatientResponseDto>(updated);
        }

        public async Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id)
        {
            return await _repo.GetMedicineHistoryAsync(id);
        }

        public async Task<PatientReportDto> GetReportAsync(ulong id)
        {
            var p = await _repo.GetByIdAsync(id, includePrescriptions: true);
            if (p == null) throw new InvalidOperationException("Patient not found");

            return _mapper.Map<PatientReportDto>(p);
        }

        public async Task<IEnumerable<PatientResponseDto>> GetPatientsWithApprovedPrescriptionAsync()
        {
            var patients = await _repo.GetAllAsync(); // Lấy từ repo → có include Prescriptions

            var validPatients = patients
                .Where(p => p.Prescriptions != null &&
                            p.Prescriptions.Any(pr =>
                                pr.Status?.Equals("approved", StringComparison.OrdinalIgnoreCase) == true))
                .ToList();

            return _mapper.Map<IEnumerable<PatientResponseDto>>(validPatients);
        }
    }
}
