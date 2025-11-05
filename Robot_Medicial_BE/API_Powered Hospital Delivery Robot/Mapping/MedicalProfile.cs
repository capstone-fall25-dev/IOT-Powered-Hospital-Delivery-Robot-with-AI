using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class MedicalProfile : Profile
    {
        public MedicalProfile()
        {
            // ✅ Patient mapping với xử lý DateTime? -> DateOnly?
            CreateMap<PatientDto, Patient>()
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? DateOnly.FromDateTime(src.Dob.Value) : (DateOnly?)null))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status));

            CreateMap<Patient, PatientResponseDto>()
                .ForMember(dest => dest.RoomName,
                    opt => opt.MapFrom(src => src.Room != null ? src.Room.RoomName : null))
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? src.Dob.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status));
            // In MedicalProfile.cs - Xóa map for Visit, giữ Patient map
            // ✅ Patient Report - Đã xóa TotalCost
            CreateMap<Patient, PatientReportDto>()
                .ForMember(dest => dest.TotalVisits,
                    opt => opt.MapFrom(src => src.Prescriptions.Count))
                    .ForMember(dest => dest.TotalMedicinesPrescribed,
 opt => opt.MapFrom(src => src.Prescriptions
     .Where(p => p.PrescriptionItems != null)
     .SelectMany(p => p.PrescriptionItems)
     .Where(i => i != null && i.Medicine != null)
     .Select(i => i.Medicine.Name)
     .Distinct()
     .Count()))

                // ❌ XÓA dòng TotalCost
                .ForMember(dest => dest.LastVisit,
                    opt => opt.MapFrom(src => src.Prescriptions
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => p.CreatedAt)
                        .FirstOrDefault()))
                .ForMember(dest => dest.CurrentRoom,
                    opt => opt.MapFrom(src => src.Room != null ? src.Room.RoomName : null));
            // DrugCategory
            CreateMap<DrugCategoryDto, DrugCategory>();
            CreateMap<DrugCategory, DrugCategoryResponseDto>();

            // Medicine
            CreateMap<MedicineDto, Medicine>()
                .ForMember(dest => dest.ExpiryDate, opt => opt.MapFrom(src => src.ExpiryDate))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status));

            CreateMap<Medicine, MedicineResponseDto>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : null))
                .ForMember(dest => dest.ExpiryDate, opt => opt.MapFrom(src => src.ExpiryDate))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status));

            // Prescription
            CreateMap<PrescriptionDto, Prescription>();
            CreateMap<Prescription, PrescriptionResponseDto>()
                .ForMember(dest => dest.PatientName, opt => opt.MapFrom(src => src.Patient != null ? src.Patient.FullName : null))
                .ForMember(dest => dest.UserEmail, opt => opt.MapFrom(src => src.Users != null ? src.Users.Email : null))
                .ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.PrescriptionItems));

            // Room
            CreateMap<RoomDto, Room>();
            CreateMap<Room, RoomResponseDto>();
        }
    }
}
