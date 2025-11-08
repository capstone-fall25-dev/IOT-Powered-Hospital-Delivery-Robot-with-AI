using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class CompartmentAssignmentDto
    {
        public ulong Id { get; set; }

        public ulong? CompartmentId { get; set; } // RobotCompartment Id

        [Required]
        public ulong StopId { get; set; } // TaskStop Id

        [Required]
        public ulong TaskId { get; set; } 

        public string Status { get; set; } = "pending"; 
    }


    public class CompartmentAssignmentDto1
    {
        public ulong Id { get; set; }
        public ulong TaskId { get; set; }
        public ulong StopId { get; set; }
        public int StopSeqNo { get; set; }
        public ulong CompartmentId { get; set; }           // ← ulong
        public string CompartmentCode { get; set; } = string.Empty; // ← string
        public string ItemDesc { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // DTO cho load (input)
    public class LoadCompartmentDto
    {
        [StringLength(255)]
        public string? ItemDesc { get; set; } // Mô tả item khi load (e.g., "Thuốc paracetamol 500mg")
    }

    public class CompartmentAssignmentResponseDto
    {
        public ulong Id { get; set; }
        public ulong? CompartmentId { get; set; }
        public string? CompartmentCode { get; set; } // Từ relation
        public ulong StopId { get; set; }
        public string? StopCustomName { get; set; } // Từ TaskStop
        public ulong TaskId { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? ItemDesc { get; set; }
    }
}
