using System;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    /// <summary>
    /// Helper class để đảm bảo tất cả DateTime operations đều sử dụng giờ Việt Nam (UTC+7)
    /// </summary>
    public static class DateTimeHelper
    {
        private static readonly TimeZoneInfo VietnamTimeZone;

        static DateTimeHelper()
        {
            // Tìm timezone Việt Nam
            try
            {
                // Windows: "SE Asia Standard Time"
                // Linux: "Asia/Ho_Chi_Minh"
                if (OperatingSystem.IsWindows())
                {
                    VietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
                }
                else
                {
                    VietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
                }
            }
            catch
            {
                // Fallback: tạo timezone UTC+7 nếu không tìm thấy
                VietnamTimeZone = TimeZoneInfo.CreateCustomTimeZone(
                    "Vietnam Time",
                    TimeSpan.FromHours(7),
                    "Vietnam Time",
                    "Vietnam Time"
                );
            }
        }

        /// <summary>
        /// Lấy thời gian hiện tại theo giờ Việt Nam (UTC+7)
        /// Thay thế cho DateTime.Now để đảm bảo luôn trả về giờ Việt Nam
        /// </summary>
        public static DateTime Now
        {
            get
            {
                // Lấy UTC time và convert sang Vietnam time
                var utcNow = DateTime.UtcNow;
                return TimeZoneInfo.ConvertTimeFromUtc(utcNow, VietnamTimeZone);
            }
        }

        /// <summary>
        /// Convert DateTime từ UTC hoặc Unspecified (từ database) sang Vietnam time
        /// </summary>
        public static DateTime FromUtc(DateTime dateTime)
        {
            if (dateTime.Kind == DateTimeKind.Utc)
            {
                return TimeZoneInfo.ConvertTimeFromUtc(dateTime, VietnamTimeZone);
            }
            else if (dateTime.Kind == DateTimeKind.Unspecified)
            {
                // Unspecified thường là từ database (lưu UTC), convert sang Vietnam time
                // Giả sử dateTime là UTC và convert sang Vietnam time
                var utcDateTime = DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
                return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, VietnamTimeZone);
            }
            // Nếu đã là Local, giả sử đã là Vietnam time
            return dateTime;
        }

        /// <summary>
        /// Convert DateTime sang UTC
        /// </summary>
        public static DateTime ToUtc(DateTime vietnamDateTime)
        {
            if (vietnamDateTime.Kind == DateTimeKind.Utc)
            {
                return vietnamDateTime;
            }
            // Giả sử input là Vietnam time, convert sang UTC
            return TimeZoneInfo.ConvertTimeToUtc(vietnamDateTime, VietnamTimeZone);
        }
    }
}

