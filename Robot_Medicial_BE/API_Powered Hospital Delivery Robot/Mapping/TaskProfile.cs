using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;
using System.Linq;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho nhiệm vụ và điểm dừng
    /// </summary>
    public class TaskProfile : Profile
    {
        public TaskProfile()
        {
            // Tạo nhiệm vụ
            CreateMap<CreateTaskDto, Models.Entities.Task>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority.ToString()))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => "pending"));

            // Tạo điểm dừng
            CreateMap<CreateTaskStopDto, TaskStop>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => "pending"));

            // Entity → DTO
            CreateMap<Models.Entities.Task, TaskResponseDto>()
                .ForMember(dest => dest.RobotName, opt => opt.MapFrom(src => src.Robot != null ? src.Robot.Name : null))
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src =>
                (TaskPriority)Enum.Parse(typeof(TaskPriority), src.Priority ?? nameof(TaskPriority.Normal), true)))
                .ForMember(dest => dest.Stops, opt => opt.MapFrom(src => src.TaskStops.OrderBy(s => s.SeqNo)))
                .ForMember(dest => dest.AssignedByEmail, opt => opt.MapFrom(src => src.AssignedByNavigation != null ? src.AssignedByNavigation.Email : null))
                .ForMember(dest => dest.AssignedByFullName, opt => opt.MapFrom(src => src.AssignedByNavigation != null ? src.AssignedByNavigation.FullName : null))
                .ForMember(dest => dest.ScheduledStartAt, opt => opt.MapFrom(src => src.ScheduledStartAt));

            CreateMap<TaskStop, TaskStopResponseDto>()
                .ForMember(dest => dest.PatientName, opt => opt.MapFrom(src => src.Patient != null ? src.Patient.FullName : null))
                .ForMember(dest => dest.DestinationName, opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : null))
                .ForMember(dest => dest.CompartmentCode, opt => opt.MapFrom(src =>
                    src.CompartmentAssignments.FirstOrDefault() != null && src.CompartmentAssignments.FirstOrDefault()!.Compartment != null
                        ? src.CompartmentAssignments.FirstOrDefault()!.Compartment.CompartmentCode
                        : null))
                .ForMember(dest => dest.Prescription, opt => opt.MapFrom(src =>
                    src.CompartmentAssignments.FirstOrDefault() != null
                        ? new PrescriptionSummaryDto
                        {
                            Code = ExtractPrescriptionCode(src.CompartmentAssignments.FirstOrDefault()!.ItemDesc ?? ""),
                            Items = new List<PrescriptionItemResponseDto>
                            {
                                new PrescriptionItemResponseDto
                                {
                                    MedicineName = ExtractMedicineSummary(src.CompartmentAssignments.FirstOrDefault()!.ItemDesc ?? "")
                                }
                            }
                        }
                        : null));

            // Mapping đơn thuốc
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

            // Mapping lịch sử nhiệm vụ
            CreateMap<TaskHistory, TaskHistoryResponseDto>()
                .ForMember(d => d.Stops, o => o.MapFrom(s => s.StopHistories));
            CreateMap<TaskStopHistory, TaskStopHistoryDto>();
        }

        /// <summary>
        /// Trích xuất mã đơn thuốc từ mô tả (ví dụ: "RX#PR-001: Paracetamol x 10")
        /// </summary>
        private static string ExtractPrescriptionCode(string itemDesc)
        {
            if (string.IsNullOrEmpty(itemDesc)) return "";
            var parts = itemDesc.Split(':');
            return parts.Length > 0 ? parts[0].Replace("RX#", "").Trim() : "";
        }

        /// <summary>
        /// Trích xuất tóm tắt thuốc từ mô tả
        /// </summary>
        private static string ExtractMedicineSummary(string itemDesc)
        {
            if (string.IsNullOrEmpty(itemDesc)) return "";
            var parts = itemDesc.Split(':');
            return parts.Length > 1 ? parts[1].Trim() : "";
        }
    }
}
