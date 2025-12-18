using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho nhật ký và cảnh báo
    /// </summary>
    public class LogAlertProfile : Profile
    {
        public LogAlertProfile()
        {
            // Mapping nhật ký
            CreateMap<LogDto, Log>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());
            CreateMap<Log, LogResponseDto>();

            // Mapping cảnh báo
            CreateMap<AlertDto, Alert>()
                .ForMember(dest => dest.Severity,
                    opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Severity) ? "low" : src.Severity))
                .ForMember(dest => dest.Category,
                    opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Category) ? "manual" : src.Category))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Status) ? "open" : src.Status))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                // ⭐ THÊM MỚI: Map ResolvedAt từ DTO
                .ForMember(dest => dest.ResolvedAt, 
                    opt => opt.MapFrom(src => src.ResolvedAt));
            
            CreateMap<Alert, AlertResponseDto>();

            // Mapping báo cáo thuốc hư hỏng
            CreateMap<AlertResponseDto, ReportDamagedMedicineResponseDto>()
                .ForMember(dest => dest.AlertId, opt => opt.MapFrom(src => src.Id))
                .ForMember(dest => dest.PrescriptionItemId, opt => opt.MapFrom(src => src.PrescriptionItemId ?? 0))
                .ForMember(dest => dest.Reason, opt => opt.Ignore())
                .ForMember(dest => dest.Description, opt => opt.Ignore())
                .ForMember(dest => dest.TaskId, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
                .ForMember(dest => dest.Message, opt => opt.MapFrom(src => src.Message));
        }
    }
}
