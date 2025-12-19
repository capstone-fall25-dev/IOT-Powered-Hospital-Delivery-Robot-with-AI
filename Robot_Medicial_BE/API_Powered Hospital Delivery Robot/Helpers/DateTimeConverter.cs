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
                    // Lấy DateTime từ DateTimeOffset (đã là local time theo timezone offset)
                    // Ví dụ: "2024-12-19T09:55:00+07:00" -> DateTime sẽ là 09:55 (local time)
                    return dateTimeOffset.DateTime;
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

            // Serialize như local time với timezone offset +07:00 (Vietnam)
            var offset = TimeSpan.FromHours(7); // Vietnam UTC+7
            var offsetString = $"+{offset.Hours:D2}:{offset.Minutes:D2}";
            
            writer.WriteStringValue($"{value.Value:yyyy-MM-ddTHH:mm:ss}{offsetString}");
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
                    // Lấy DateTime từ DateTimeOffset (đã là local time theo timezone offset)
                    // Ví dụ: "2024-12-19T09:55:00+07:00" -> DateTime sẽ là 09:55 (local time)
                    return dateTimeOffset.DateTime;
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
            // Serialize như local time với timezone offset +07:00 (Vietnam)
            var offset = TimeSpan.FromHours(7); // Vietnam UTC+7
            var offsetString = $"+{offset.Hours:D2}:{offset.Minutes:D2}";
            
            writer.WriteStringValue($"{value:yyyy-MM-ddTHH:mm:ss}{offsetString}");
        }
    }
}
