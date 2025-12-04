using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho bệnh nhân, thuốc, đơn thuốc và phòng
    /// </summary>
    public class MedicalProfile : Profile
    {
        public MedicalProfile()
        {
            // Tạo bệnh nhân
            CreateMap<PatientCreateDto, Patient>()
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? DateOnly.FromDateTime(src.Dob.Value) : (DateOnly?)null))
                .ForMember(dest => dest.CreatedAt,
                    opt => opt.Ignore());

            // Cập nhật bệnh nhân (chỉ map field có giá trị)
            CreateMap<PatientUpdateDto, Patient>()
                .ForAllMembers(opt =>
                    opt.Condition((src, dest, val) =>
                        val != null));

            // Chuyển đổi ngày sinh cho update
            CreateMap<PatientUpdateDto, Patient>()
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom((src, dest) =>
                        src.Dob.HasValue ? DateOnly.FromDateTime(src.Dob.Value) : dest.Dob))
                .ForAllMembers(opt =>
                    opt.Condition((src, dest, val) => val != null));

            // Bệnh nhân → Response DTO
            CreateMap<Patient, PatientResponseDto>()
                .ForMember(dest => dest.RoomName,
                    opt => opt.MapFrom(src => src.Room != null ? src.Room.RoomName : null))
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? src.Dob.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null));

            // Báo cáo bệnh nhân
            CreateMap<Patient, PatientReportDto>()
                .ForMember(dest => dest.TotalVisits,
                    opt => opt.MapFrom(src => src.Prescriptions.Count))
                .ForMember(dest => dest.TotalMedicinesPrescribed,
                    opt => opt.MapFrom(src =>
                        src.Prescriptions
                        .SelectMany(p => p.PrescriptionItems)
                        .Where(i => i.Medicine != null)
                        .Select(i => i.Medicine.Name)
                        .Distinct()
                        .Count()))
                .ForMember(dest => dest.LastVisit,
                    opt => opt.MapFrom(src =>
                        src.Prescriptions
                            .OrderByDescending(p => p.CreatedAt)
                            .Select(p => p.CreatedAt)
                            .FirstOrDefault()))
                .ForMember(dest => dest.CurrentRoom,
                    opt => opt.MapFrom(src => src.Room != null ? src.Room.RoomName : null));

            // Bệnh nhân trong phòng
            CreateMap<Patient, PatientInRoomDto>()
                .ForMember(dest => dest.Gender,
                    opt => opt.MapFrom(src => src.Gender ?? "-"))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status));

            // Danh mục thuốc
            CreateMap<CategoryCreateDto, DrugCategory>();
            CreateMap<CategoryUpdateDto, DrugCategory>();
            CreateMap<DrugCategory, CategoryResponseDto>();

            // Thuốc
            CreateMap<MedicineCreateDto, Medicine>();
            CreateMap<MedicineUpdateDto, Medicine>()
                .ForAllMembers(opt =>
                    opt.Condition((src, dest, val) => val != null));

            CreateMap<Medicine, MedicineResponseDto>()
                .ForMember(dest => dest.CategoryName,
                    opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : null));

            // Đơn thuốc
            CreateMap<Prescription, PrescriptionResponseDto>()
                .ForMember(dest => dest.PatientName,
                    opt => opt.MapFrom(src => src.Patient.FullName))
                .ForMember(dest => dest.Items,
                    opt => opt.MapFrom(src => src.PrescriptionItems));

            // Mục đơn thuốc
            CreateMap<PrescriptionItem, PrescriptionItemResponseDto>()
                .ForMember(dest => dest.MedicineCode,
                    opt => opt.MapFrom(src => src.Medicine != null ? src.Medicine.MedicineCode : null))
                .ForMember(dest => dest.MedicineName,
                    opt => opt.MapFrom(src => src.Medicine != null ? src.Medicine.Name : null));

            // Phòng
            CreateMap<RoomDto, Room>();
            CreateMap<Room, RoomResponseDto>()
                .ForMember(dest => dest.PatientCount,
                    opt => opt.MapFrom(src => src.Patients.Count))
                .ForMember(dest => dest.Patients,
                    opt => opt.MapFrom(src => src.Patients));
        }
    }
}
