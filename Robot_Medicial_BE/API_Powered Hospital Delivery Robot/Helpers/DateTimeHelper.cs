using System;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    /// <summary>
    /// Helper để lấy thời gian local (Vietnam UTC+7) bất kể server timezone là gì
    /// Giải quyết vấn đề production server ở UTC timezone
    /// </summary>
    public static class DateTimeHelper
    {
        /// <summary>
        /// Trả về thời gian hiện tại theo múi giờ Vietnam (UTC+7)
        /// Bất kể server timezone là gì, luôn trả về giờ Vietnam
        /// </summary>
        public static DateTime Now()
        {
            // Lấy UTC time và cộng thêm 7 giờ để có Vietnam time
            var utcNow = DateTime.UtcNow;
            var vietnamTime = utcNow.AddHours(7);
            
            // Trả về với Kind = Unspecified để EF Core không convert
            return DateTime.SpecifyKind(vietnamTime, DateTimeKind.Unspecified);
        }
    }
}

