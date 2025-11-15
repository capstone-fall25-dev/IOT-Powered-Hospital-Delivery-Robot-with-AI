using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class MedicalProfile : Profile
    {
        public MedicalProfile()
        {
            // ======================================================
            //  PATIENT – CREATE
            // ======================================================
            CreateMap<PatientCreateDto, Patient>()
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? DateOnly.FromDateTime(src.Dob.Value) : (DateOnly?)null))
                .ForMember(dest => dest.CreatedAt,
                    opt => opt.Ignore()); // Set in service


            // ======================================================
            //  PATIENT – UPDATE (ONLY MAP WHEN SOURCE NOT NULL)
            // ======================================================
            CreateMap<PatientUpdateDto, Patient>()
                .ForAllMembers(opt =>
                    opt.Condition((src, dest, val) =>
                        val != null)); // Chỉ map field có giá trị, tránh overwrite null

            // Dob convert cho update
            CreateMap<PatientUpdateDto, Patient>()
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom((src, dest) =>
                        src.Dob.HasValue ? DateOnly.FromDateTime(src.Dob.Value) : dest.Dob))
                .ForAllMembers(opt =>
                    opt.Condition((src, dest, val) => val != null));

            // ======================================================
            //  PATIENT → RESPONSE DTO
            // ======================================================
            CreateMap<Patient, PatientResponseDto>()
                .ForMember(dest => dest.RoomName,
                    opt => opt.MapFrom(src => src.Room != null ? src.Room.RoomName : null))
                .ForMember(dest => dest.Dob,
                    opt => opt.MapFrom(src =>
                        src.Dob.HasValue ? src.Dob.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null));


            // ======================================================
            //  PATIENT REPORT DTO
            // ======================================================
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


            // ======================================================
            //  PATIENT IN ROOM DTO
            // ======================================================
            CreateMap<Patient, PatientInRoomDto>()
                .ForMember(dest => dest.Gender,
                    opt => opt.MapFrom(src => src.Gender ?? "-"))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status));


            // ======================================================
            // DRUG CATEGORY
            // ======================================================
            CreateMap<CategoryCreateDto, DrugCategory>();
            CreateMap<CategoryUpdateDto, DrugCategory>();

            CreateMap<DrugCategory, CategoryResponseDto>();


            // ======================================================
            // MEDICINE
            // ======================================================
            CreateMap<MedicineCreateDto, Medicine>();
            CreateMap<MedicineUpdateDto, Medicine>()
                .ForAllMembers(opt =>
                    opt.Condition((src, dest, val) => val != null));

            CreateMap<Medicine, MedicineResponseDto>()
                .ForMember(dest => dest.CategoryName,
                    opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : null));


            // ======================================================
            // PRESCRIPTION
            // ======================================================
            CreateMap<Prescription, PrescriptionResponseDto>()
                .ForMember(dest => dest.PatientName,
                    opt => opt.MapFrom(src => src.Patient.FullName))
                .ForMember(dest => dest.Items,
                    opt => opt.MapFrom(src => src.PrescriptionItems));


            // ======================================================
            // PRESCRIPTION ITEM
            // ======================================================
            CreateMap<PrescriptionItem, PrescriptionItemResponseDto>()
                .ForMember(dest => dest.MedicineCode,
                    opt => opt.MapFrom(src => src.Medicine != null ? src.Medicine.MedicineCode : null))
                .ForMember(dest => dest.MedicineName,
                    opt => opt.MapFrom(src => src.Medicine != null ? src.Medicine.Name : null));


            // ======================================================
            // ROOM
            // ======================================================
            CreateMap<RoomDto, Room>();

            CreateMap<Room, RoomResponseDto>()
                .ForMember(dest => dest.PatientCount,
                    opt => opt.MapFrom(src => src.Patients.Count))
                .ForMember(dest => dest.Patients,
                    opt => opt.MapFrom(src => src.Patients));
        }
    }
}
