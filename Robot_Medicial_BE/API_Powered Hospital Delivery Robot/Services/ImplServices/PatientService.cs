using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý bệnh nhân
    /// </summary>
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

        /// <summary>
        /// Lấy danh sách tất cả bệnh nhân
        /// </summary>
        public async Task<IEnumerable<PatientResponseDto>> GetAllAsync()
        {
            var list = await _repo.GetAllAsync();
            return _mapper.Map<IEnumerable<PatientResponseDto>>(list);
        }

        /// <summary>
        /// Lọc bệnh nhân theo điều kiện
        /// </summary>
        public async Task<IEnumerable<PatientResponseDto>> FilterAsync(PatientFilterDto filter)
        {
            var list = await _repo.FilterAsync(filter);
            return _mapper.Map<IEnumerable<PatientResponseDto>>(list);
        }

        /// <summary>
        /// Lấy chi tiết bệnh nhân theo ID
        /// </summary>
        public async Task<PatientResponseDto?> GetByIdAsync(ulong id)
        {
            var p = await _repo.GetByIdAsync(id, includeRoom: true, includePrescriptions: true);
            return p == null ? null : _mapper.Map<PatientResponseDto>(p);
        }

        /// <summary>
        /// Tạo bệnh nhân mới
        /// </summary>
        public async Task<PatientResponseDto> CreateAsync(PatientCreateDto dto)
        {
            var exists = await _repo.GetByCodeAsync(dto.PatientCode);
            if (exists != null)
                throw new InvalidOperationException("Mã bệnh nhân đã tồn tại");

            if (dto.RoomId.HasValue && !await _repo.ExistsRoomAsync(dto.RoomId.Value))
                throw new InvalidOperationException("Phòng không tồn tại");

            var patient = _mapper.Map<Patient>(dto);
            patient.CreatedAt = DateTime.Now;

            var created = await _repo.CreateAsync(patient);
            return _mapper.Map<PatientResponseDto>(created);
        }

        /// <summary>
        /// Cập nhật thông tin bệnh nhân
        /// </summary>
        public async Task<PatientResponseDto?> UpdateAsync(ulong id, PatientUpdateDto dto)
        {
            var p = await _repo.GetByIdAsync(id);
            if (p == null) return null;

            if (!string.IsNullOrEmpty(dto.PatientCode) && dto.PatientCode != p.PatientCode)
            {
                var exists = await _repo.GetByCodeAsync(dto.PatientCode);
                if (exists != null)
                    throw new InvalidOperationException("Mã bệnh nhân đã tồn tại");
            }

            if (dto.RoomId.HasValue && !await _repo.ExistsRoomAsync(dto.RoomId.Value))
                throw new InvalidOperationException("Phòng không tồn tại");

            var updated = _mapper.Map(dto, p);
            await _repo.UpdateAsync(id, updated);

            return _mapper.Map<PatientResponseDto>(updated);
        }

        /// <summary>
        /// Xuất viện bệnh nhân
        /// </summary>
        public async Task<PatientResponseDto?> DischargeAsync(ulong id, string? reason)
        {
            var updated = await _repo.DischargeAsync(id, reason);
            if (updated == null) return null;

            return _mapper.Map<PatientResponseDto>(updated);
        }

        /// <summary>
        /// Lấy lịch sử thuốc của bệnh nhân
        /// </summary>
        public async Task<IEnumerable<PatientMedicineHistoryDto>> GetMedicineHistoryAsync(ulong id)
        {
            return await _repo.GetMedicineHistoryAsync(id);
        }

        /// <summary>
        /// Lấy báo cáo bệnh nhân
        /// </summary>
        public async Task<PatientReportDto> GetReportAsync(ulong id)
        {
            var p = await _repo.GetByIdAsync(id, includePrescriptions: true);
            if (p == null) throw new InvalidOperationException("Không tìm thấy bệnh nhân");

            return _mapper.Map<PatientReportDto>(p);
        }

        /// <summary>
        /// Lấy danh sách bệnh nhân có đơn thuốc đã được duyệt
        /// </summary>
        public async Task<IEnumerable<PatientResponseDto>> GetPatientsWithApprovedPrescriptionAsync()
        {
            var patients = await _repo.GetAllAsync();

            var validPatients = patients
                .Where(p => p.Prescriptions != null &&
                            p.Prescriptions.Any(pr =>
                                pr.Status?.Equals("approved", StringComparison.OrdinalIgnoreCase) == true))
                .ToList();

            return _mapper.Map<IEnumerable<PatientResponseDto>>(validPatients);
        }
    }
}
