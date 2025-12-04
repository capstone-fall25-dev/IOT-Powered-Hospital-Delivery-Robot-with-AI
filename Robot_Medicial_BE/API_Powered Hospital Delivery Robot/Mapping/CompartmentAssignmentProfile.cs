using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho gán ngăn chứa
    /// </summary>
    public class CompartmentAssignmentProfile : Profile
    {
        public CompartmentAssignmentProfile()
        {
            CreateMap<CompartmentAssignmentDto, CompartmentAssignment>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore());

            CreateMap<CompartmentAssignment, CompartmentAssignmentResponseDto>()
                .ForMember(dest => dest.CompartmentCode, opt => opt.MapFrom(src => src.Compartment != null ? src.Compartment.CompartmentCode : null))
                .ForMember(dest => dest.StopCustomName, opt => opt.MapFrom(src => src.Stop != null ? src.Stop.CustomName : null));

            // Mapping nạp ngăn chứa
            CreateMap<LoadCompartmentDto, CompartmentAssignment>()
                .ForMember(dest => dest.ItemDesc, opt => opt.MapFrom(src => src.ItemDesc));

            CreateMap<RobotCompartment, CompartmentDto>()
                .ForMember(d => d.Code, o => o.MapFrom(s => s.CompartmentCode))
                .ForMember(d => d.Id, o => o.MapFrom(s => s.Id));
        }
    }
}
