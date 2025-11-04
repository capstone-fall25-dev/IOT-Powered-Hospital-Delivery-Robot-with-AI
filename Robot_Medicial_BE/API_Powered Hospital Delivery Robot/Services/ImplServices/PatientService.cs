using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class PatientService : IPatientService
    {
        private readonly IPatientRepository _repository;
        private readonly IMapper _mapper;
        private readonly ILogService _logService;

        public PatientService(IPatientRepository repository, IMapper mapper, ILogService logService)
        {
            _repository = repository;
            _mapper = mapper;
            _logService = logService;
        }

        public async Task<PatientResponseDto> CreateAsync(PatientDto patientDto)
        {
            var existing = await _repository.GetByCodeAsync(patientDto.PatientCode);
            if (existing != null)
            {
                throw new InvalidOperationException("Patient code already exists");
            }

            var patient = _mapper.Map<Patient>(patientDto);
            patient.CreatedAt = DateTime.UtcNow;

            var created = await _repository.CreateAsync(patient);
            return _mapper.Map<PatientResponseDto>(created);
        }

        public async Task<PatientResponseDto?> DischargeAsync(ulong id)
        {
            var updated = await _repository.DischargeAsync(id);
            if (updated == null) return null;
            return _mapper.Map<PatientResponseDto>(updated);
        }

        public async Task<IEnumerable<PatientResponseDto>> GetAllAsync()
        {
            var patients = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<PatientResponseDto>>(patients);
        }

        public async Task<PatientResponseDto?> GetByIdAsync(ulong id)
        {
            var patient = await _repository.GetByIdAsync(id, includeRoom: true, includePrescriptions: true);
            return patient != null ? _mapper.Map<PatientResponseDto>(patient) : null;
        }

        public async Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id)
        {
            return await _repository.GetMedicineHistoryAsync(id); // From prescriptions/items
        }

        public async Task<PatientReportDto> GetReportAsync(ulong id)
        {
            var patient = await _repository.GetByIdAsync(id, includePrescriptions: true);
            if (patient == null) throw new InvalidOperationException("Patient not found");
            var report = _mapper.Map<PatientReportDto>(patient);
            // TotalVisits only from prescriptions (no visits table)
            report.TotalVisits = patient.Prescriptions.Count;
            return report;
        }

        public async Task<PatientResponseDto?> UpdateAsync(ulong id, PatientDto patientDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Patient not found");
            }

            if (patientDto.PatientCode != existing.PatientCode)
            {
                var codeExisting = await _repository.GetByCodeAsync(patientDto.PatientCode);
                if (codeExisting != null)
                {
                    throw new InvalidOperationException("Patient code already exists");
                }
            }

            var patient = _mapper.Map<Patient>(patientDto);
            patient.Id = id;

            var updated = await _repository.UpdateAsync(id, patient);
            return updated != null ? _mapper.Map<PatientResponseDto>(updated) : null;
        }
    }
}
