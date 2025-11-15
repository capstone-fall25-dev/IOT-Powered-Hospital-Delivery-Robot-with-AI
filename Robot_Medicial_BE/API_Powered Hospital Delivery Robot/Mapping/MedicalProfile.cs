using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class MedicalProfile : Profile
    {
        public MedicalProfile()
        {
            // ===========================
            // PATIENT
            // ===========================
            CreateMap<PatientDto, Patient>()
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? DateOnly.FromDateTime(src.Dob.Value) : (DateOnly?)null));

            CreateMap<Patient, PatientResponseDto>()
                .ForMember(dest => dest.RoomName,
                    opt => opt.MapFrom(src => src.Room != null ? src.Room.RoomName : null))
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? src.Dob.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null));

            // Patient Report
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
                        src.Prescriptions.OrderByDescending(p => p.CreatedAt)
                        .Select(p => p.CreatedAt)
                        .FirstOrDefault()))
                .ForMember(dest => dest.CurrentRoom,
                    opt => opt.MapFrom(src => src.Room != null ? src.Room.RoomName : null));


            // ===========================
            // DRUG CATEGORY (NEW DTOs)
            // ===========================
            CreateMap<CategoryCreateDto, DrugCategory>();
            CreateMap<CategoryUpdateDto, DrugCategory>();

            CreateMap<DrugCategory, CategoryResponseDto>();


            // ===========================
            // MEDICINE (NEW DTOs)
            // ===========================
            CreateMap<MedicineCreateDto, Medicine>();
            CreateMap<MedicineUpdateDto, Medicine>()
                .ForAllMembers(opt => opt.Condition((src, dest, val) => val != null));

            CreateMap<Medicine, MedicineResponseDto>()
                .ForMember(dest => dest.CategoryName,
                    opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : null));


            // ===========================
            // PRESCRIPTION
            // ===========================
            CreateMap<Prescription, PrescriptionResponseDto>()
                .ForMember(dest => dest.PatientName,
                    opt => opt.MapFrom(src => src.Patient.FullName))
                .ForMember(dest => dest.Items,
                    opt => opt.MapFrom(src => src.PrescriptionItems));


            // ===========================
            // PRESCRIPTION ITEM
            // ===========================
            CreateMap<PrescriptionItem, PrescriptionItemResponseDto>()
                .ForMember(dest => dest.MedicineCode,
                    opt => opt.MapFrom(src => src.Medicine != null ? src.Medicine.MedicineCode : null))
                .ForMember(dest => dest.MedicineName,
                    opt => opt.MapFrom(src => src.Medicine != null ? src.Medicine.Name : null));


            // ===========================
            // ROOM
            // ===========================
            CreateMap<RoomDto, Room>();
            CreateMap<Room, RoomResponseDto>();
        }
    }
}
