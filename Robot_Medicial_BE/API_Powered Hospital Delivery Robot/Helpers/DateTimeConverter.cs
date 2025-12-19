using System.Text.Json;
using System.Text.Json.Serialization;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    /// <summary>
    /// Custom DateTime converter để xử lý timezone đúng cách
    /// Parse datetime string với timezone offset và giữ nguyên local time (Vietnam UTC+7)
    /// </summary>
    public class DateTimeConverter : JsonConverter<DateTime?>
    {
        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
                return null;

            if (reader.TokenType == JsonTokenType.String)
            {
                var dateString = reader.GetString();
                if (string.IsNullOrWhiteSpace(dateString))
                    return null;

                // Thử parse với timezone offset trước
                if (DateTimeOffset.TryParse(dateString, out var dateTimeOffset))
                {
                    // Frontend gửi datetime với timezone offset (ví dụ: "2024-12-19T11:03:00+07:00")
                    // DateTimeOffset đã parse đúng timezone, nhưng .DateTime sẽ trả về theo server timezone
                    // Để đảm bảo lưu đúng Vietnam time, ta lấy UTC time và convert sang Vietnam time
                    var utcDateTime = dateTimeOffset.UtcDateTime;
                    return DateTimeHelper.FromUtc(utcDateTime);
                }

                // Nếu không có timezone offset, parse như local time
                if (DateTime.TryParse(dateString, out var dateTime))
                {
                    // Giả sử datetime string đã là local time (Vietnam), giữ nguyên
                    return dateTime;
                }
            }

            throw new JsonException($"Không thể parse datetime: {reader.GetString()}");
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value == null)
            {
                writer.WriteNullValue();
                return;
            }

            // Database đã lưu Vietnam time (ví dụ: 11:07)
            // Ta cần serialize sao cho frontend hiểu đây là 11:07 Vietnam time
            // Nếu serialize với offset +07:00, JavaScript sẽ parse và convert về local time
            // Để frontend hiển thị đúng, ta serialize như UTC (không có offset) hoặc với offset 00:00
            // Nhưng cách tốt nhất là serialize như local time với offset +07:00, nhưng giá trị phải là UTC equivalent
            
            // Database lưu Vietnam time (11:07), ta cần serialize như UTC equivalent (04:07 UTC) với offset +07:00
            // Hoặc đơn giản hơn: serialize như local time với offset +00:00 (UTC) để JavaScript không convert
            // Nhưng cách tốt nhất: serialize giá trị Vietnam time với offset +07:00, nhưng đảm bảo JavaScript parse đúng
            
            // Giá trị từ database đã là Vietnam time (11:07)
            // Ta serialize như: "2025-12-19T11:07:35+07:00"
            // JavaScript sẽ parse: 11:07 UTC+7 = 04:07 UTC, sau đó convert về local time (UTC+7) = 11:07 ✅
            // Nhưng nếu có vấn đề, có thể JavaScript đang hiểu sai
            
            // Giải pháp: Serialize như UTC (không có offset) hoặc với offset 00:00
            // Database lưu 11:07 (Vietnam time), ta serialize như 11:07 UTC (sai)
            // Hoặc: Convert về UTC trước khi serialize
            
            // Cách đúng: Database lưu 11:07 (Vietnam time), ta cần serialize như 04:07 UTC với offset +07:00
            // Hoặc đơn giản: Serialize như local time với offset +00:00 để JavaScript không convert
            
            // Giá trị từ database đã là Vietnam time
            DateTime vietnamTime = value.Value;
            
            // Nếu Kind là Unspecified (từ database), giả sử đã là Vietnam time
            // Nếu Kind là UTC, convert sang Vietnam time
            if (vietnamTime.Kind == DateTimeKind.Utc)
            {
                vietnamTime = DateTimeHelper.FromUtc(vietnamTime);
            }
            
            // Serialize như local time với offset +00:00 (UTC) để JavaScript không convert
            // Frontend sẽ hiểu đây là 11:07 UTC và convert về local time (UTC+7) → 18:07 (SAI)
            
            // Cách đúng: Serialize như UTC equivalent với offset +07:00
            // Database: 11:07 (Vietnam time) → UTC: 04:07 → Serialize: "04:07+07:00" → JavaScript parse: 04:07 UTC+7 = 11:07 local ✅
            
            // Database lưu Vietnam time (11:07), ta serialize như local time với offset +00:00 (UTC)
            // JavaScript sẽ parse: 11:07 UTC → convert về local time (UTC+7) → 18:07 (SAI)
            
            // Cách đúng: Serialize như UTC equivalent với offset +07:00
            // Database: 11:07 (Vietnam time) → UTC: 04:07 → Serialize: "04:07+07:00"
            // JavaScript parse: 04:07 UTC+7 = 11:07 local time ✅
            
            // Convert Vietnam time về UTC trước khi serialize
            var utcTime = DateTimeHelper.ToUtc(vietnamTime);
            
            // Serialize UTC time với offset +07:00
            // JavaScript sẽ parse: UTC time + offset = Vietnam time
            var offset = TimeSpan.FromHours(7); // Vietnam UTC+7
            var offsetString = $"+{offset.Hours:D2}:{offset.Minutes:D2}";
            
            writer.WriteStringValue($"{utcTime:yyyy-MM-ddTHH:mm:ss}{offsetString}");
        }
    }

    /// <summary>
    /// Custom DateTime converter cho DateTime (non-nullable)
    /// </summary>
    public class DateTimeNonNullableConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
                throw new JsonException("DateTime không thể null");

            if (reader.TokenType == JsonTokenType.String)
            {
                var dateString = reader.GetString();
                if (string.IsNullOrWhiteSpace(dateString))
                    throw new JsonException("DateTime string không được rỗng");

                // Thử parse với timezone offset trước
                if (DateTimeOffset.TryParse(dateString, out var dateTimeOffset))
                {
                    // Frontend gửi datetime với timezone offset (ví dụ: "2024-12-19T11:03:00+07:00")
                    // DateTimeOffset đã parse đúng timezone, nhưng .DateTime sẽ trả về theo server timezone
                    // Để đảm bảo lưu đúng Vietnam time, ta lấy UTC time và convert sang Vietnam time
                    var utcDateTime = dateTimeOffset.UtcDateTime;
                    return DateTimeHelper.FromUtc(utcDateTime);
                }

                // Nếu không có timezone offset, parse như local time
                if (DateTime.TryParse(dateString, out var dateTime))
                {
                    // Giả sử datetime string đã là local time (Vietnam), giữ nguyên
                    return dateTime;
                }
            }

            throw new JsonException($"Không thể parse datetime: {reader.GetString()}");
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            // Database đã lưu Vietnam time (ví dụ: 11:07)
            // Ta cần serialize sao cho frontend hiểu đây là 11:07 Vietnam time
            // Cách đúng: Convert Vietnam time về UTC trước khi serialize với offset +07:00
            // Database: 11:07 (Vietnam time) → UTC: 04:07 → Serialize: "04:07+07:00"
            // JavaScript parse: 04:07 UTC+7 = 11:07 local time ✅
            
            // Giá trị từ database đã là Vietnam time
            DateTime vietnamTime = value;
            
            // Nếu Kind là UTC, convert sang Vietnam time
            if (vietnamTime.Kind == DateTimeKind.Utc)
            {
                vietnamTime = DateTimeHelper.FromUtc(vietnamTime);
            }
            
            // Convert Vietnam time về UTC trước khi serialize
            var utcTime = DateTimeHelper.ToUtc(vietnamTime);
            
            // Serialize UTC time với offset +07:00
            // JavaScript sẽ parse: UTC time + offset = Vietnam time
            var offset = TimeSpan.FromHours(7); // Vietnam UTC+7
            var offsetString = $"+{offset.Hours:D2}:{offset.Minutes:D2}";
            
            writer.WriteStringValue($"{utcTime:yyyy-MM-ddTHH:mm:ss}{offsetString}");
        }
    }
}
