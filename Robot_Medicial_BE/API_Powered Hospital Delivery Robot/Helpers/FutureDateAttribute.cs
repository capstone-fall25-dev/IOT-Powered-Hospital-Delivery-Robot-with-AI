using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    public class FutureDateAttribute : ValidationAttribute
    {
        public override bool IsValid(object? value)
        {
            if (value is not DateTime dateTime)
                return true; // để Required bắt

            // Phải lớn hơn hiện tại ít nhất 1 phút (tránh chọn nhầm)
            return dateTime > DateTime.UtcNow.AddMinutes(1);
        }

        public override string FormatErrorMessage(string name)
        {
            return "Thời gian bắt đầu phải là trong tương lai (ít nhất 1 phút từ bây giờ).";
        }
    }
}
