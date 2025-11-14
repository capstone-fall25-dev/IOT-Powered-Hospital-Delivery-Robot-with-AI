using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;
using System.Linq;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class TaskProfile : Profile
    {
        public TaskProfile()
        {
            // ========== Create Task ==========
            CreateMap<CreateTaskDto, Models.Entities.Task>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority.ToString()))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => "pending"));

            // ========== TaskStop create ==========
            CreateMap<CreateTaskStopDto, TaskStop>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => "pending"));

            // ========== Entity → DTO ==========
            CreateMap<Models.Entities.Task, TaskResponseDto>()
                .ForMember(dest => dest.RobotName, opt => opt.MapFrom(src => src.Robot.Name))
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src =>
                (TaskPriority)Enum.Parse(typeof(TaskPriority), src.Priority ?? nameof(TaskPriority.Normal), true)))
                .ForMember(dest => dest.Stops, opt => opt.MapFrom(src => src.TaskStops.OrderBy(s => s.SeqNo)))
                .ForMember(dest => dest.AssignedByEmail, opt => opt.MapFrom(src => src.AssignedByNavigation.Email))
                .ForMember(dest => dest.AssignedByFullName, opt => opt.MapFrom(src => src.AssignedByNavigation.FullName))
                .ForMember(dest => dest.Stops, opt => opt.MapFrom(src => src.TaskStops))
                .ForMember(dest => dest.ScheduledStartAt, opt => opt.MapFrom(src => src.ScheduledStartAt));

            CreateMap<TaskStop, TaskStopResponseDto>()
                .ForMember(dest => dest.PatientName, opt => opt.MapFrom(src => src.Patient.FullName))
                .ForMember(dest => dest.DestinationName, opt => opt.MapFrom(src => src.Destination.Name))
                .ForMember(dest => dest.CompartmentCode, opt => opt.MapFrom(src =>
                    src.CompartmentAssignments.FirstOrDefault().Compartment.CompartmentCode))
                .ForMember(dest => dest.Prescription, opt => opt.MapFrom(src =>
                    src.CompartmentAssignments.FirstOrDefault() != null
                        ? new PrescriptionSummaryDto
                        {
                            Code = ExtractPrescriptionCode(src.CompartmentAssignments.FirstOrDefault().ItemDesc),
                            Items = new List<PrescriptionItemResponseDto>
                            {
                                new PrescriptionItemResponseDto
                                {
                                    MedicineName = ExtractMedicineSummary(src.CompartmentAssignments.FirstOrDefault().ItemDesc)
                                }
                            }
                        }
                        : null));

            // ========== Prescription Mapping ==========
            CreateMap<Prescription, PrescriptionSummaryDto>()
                .ForMember(dest => dest.Code, opt => opt.MapFrom(src => src.PrescriptionCode))
                .ForMember(dest => dest.Items, opt => opt.MapFrom(src =>
                    src.PrescriptionItems.Select(i => new PrescriptionItemResponseDto
                    {
                        Id = i.Id,
                        MedicineName = i.Medicine.Name,
                        Quantity = i.Quantity,
                        Dosage = i.Dosage,
                        Instructions = i.Instructions
                    }).ToList()));
        }

        // Helper method: parse text like "RX#PR-001: Paracetamol x 10; VitaminC x 5"
        private static string ExtractPrescriptionCode(string itemDesc)
        {
            if (string.IsNullOrEmpty(itemDesc)) return "";
            var parts = itemDesc.Split(':');
            return parts.Length > 0 ? parts[0].Replace("RX#", "").Trim() : "";
        }

        private static string ExtractMedicineSummary(string itemDesc)
        {
            if (string.IsNullOrEmpty(itemDesc)) return "";
            var parts = itemDesc.Split(':');
            return parts.Length > 1 ? parts[1].Trim() : "";
        }
    }
}
