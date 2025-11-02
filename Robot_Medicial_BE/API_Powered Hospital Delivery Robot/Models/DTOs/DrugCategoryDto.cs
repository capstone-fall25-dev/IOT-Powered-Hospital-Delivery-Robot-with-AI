using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class DrugCategoryDto
    {
        [Required]
        [StringLength(128)]
        public string Name { get; set; } = null!;
    }

    public class DrugCategoryResponseDto
    {
        public ulong Id { get; set; }
        public string Name { get; set; } = null!;
    }
}
