using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class LogAlertProfile : Profile
    {
        public LogAlertProfile()
        {
            // --- Log Mapping ---
            CreateMap<LogDto, Log>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());
            CreateMap<Log, LogResponseDto>();
            // --- Alert Mapping ---
            CreateMap<AlertDto, Alert>()
                // Nếu không có giá trị truyền lên → gán mặc định
                .ForMember(dest => dest.Severity,
                    opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Severity) ? "low" : src.Severity))
                .ForMember(dest => dest.Category,
                    opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Category) ? "manual" : src.Category))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Status) ? "open" : src.Status))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());
            CreateMap<Alert, AlertResponseDto>();

            // PrescriptionItem
            CreateMap<PrescriptionItemDto, PrescriptionItem>();
            CreateMap<PrescriptionItem, PrescriptionItemResponseDto>()
                .ForMember(dest => dest.MedicineName, opt => opt.MapFrom(src => src.Medicine != null ? src.Medicine.Name : null));

            // ReportDamagedMedicineResponse - Map from AlertResponseDto (since alertResponse is DTO)
            CreateMap<AlertResponseDto, ReportDamagedMedicineResponseDto>()
                .ForMember(dest => dest.AlertId, opt => opt.MapFrom(src => src.Id))
                .ForMember(dest => dest.PrescriptionItemId, opt => opt.MapFrom(src => src.PrescriptionItemId ?? 0))
                .ForMember(dest => dest.Reason, opt => opt.Ignore()) // Set manually in service
                .ForMember(dest => dest.Description, opt => opt.Ignore()) // Set manually in service
                .ForMember(dest => dest.TaskId, opt => opt.Ignore()) // Set manually in service
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
                .ForMember(dest => dest.Message, opt => opt.MapFrom(src => src.Message));
        }
    }
}