using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class TaskProfile : Profile
    {
        public TaskProfile()
        {
            CreateMap<TaskDto, Models.Entities.Task>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.TotalErrors, opt => opt.Ignore())
                .ForMember(dest => dest.Robot, opt => opt.Ignore())
                .ForMember(dest => dest.AssignedByNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.CompartmentAssignments, opt => opt.Ignore())
                .ForMember(dest => dest.Logs, opt => opt.Ignore())
                .ForMember(dest => dest.TaskStops, opt => opt.Ignore());
            CreateMap<TaskStopDto, TaskStop>().ForMember(dest => dest.CreatedAt, opt => opt.Ignore()).ForMember(dest => dest.UpdatedAt, opt => opt.Ignore());
            CreateMap<TaskStop, TaskStopDto>(); // Nếu cần response
            CreateMap<Models.Entities.Task, TaskResponseDto>()
                .ForMember(dest => dest.RobotName, opt => opt.MapFrom(src => src.Robot.Name))
                .ForMember(dest => dest.Stops, opt => opt.MapFrom(src => src.TaskStops));
        }
    }
}
