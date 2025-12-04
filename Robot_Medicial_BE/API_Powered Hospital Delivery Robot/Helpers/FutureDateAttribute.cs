using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    /// <summary>
    /// Kiểm tra thời gian bắt đầu nhiệm vụ phải là trong tương lai
    /// </summary>
    public class FutureDateAttribute : ValidationAttribute
    {
        public override bool IsValid(object? value)
        {
            // Nếu không phải DateTime thì để RequiredAttribute xử lý
            if (value is not DateTime dateTime)
                return true;

            // Frontend gửi UTC, cần chuyển về giờ Việt Nam (UTC+7) để so sánh
            DateTime localDateTime;
            if (dateTime.Kind == DateTimeKind.Utc)
            {
                // Chuyển UTC về giờ địa phương
                localDateTime = dateTime.ToLocalTime();
            }
            else if (dateTime.Kind == DateTimeKind.Unspecified)
            {
                // Giả định là UTC nếu không xác định
                localDateTime = DateTime.SpecifyKind(dateTime, DateTimeKind.Utc).ToLocalTime();
            }
            else
            {
                // Đã là giờ địa phương
                localDateTime = dateTime;
            }

            // Phải lớn hơn thời gian hiện tại ít nhất 1 phút
            return localDateTime > DateTime.Now.AddMinutes(1);
        }

        public override string FormatErrorMessage(string name)
        {
            return "Thời gian bắt đầu phải lớn hơn thời gian hiện tại ít nhất 1 phút.";
        }
    }
}
