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

            // Convert DateTime sang Vietnam time (UTC+7)
            // Xử lý các trường hợp:
            // - DateTimeKind.Utc: Convert từ UTC sang Vietnam time
            // - DateTimeKind.Unspecified: Giả sử là UTC (từ database) và convert sang Vietnam time
            // - DateTimeKind.Local: Giả sử đã là Vietnam time
            DateTime vietnamTime;
            if (value.Value.Kind == DateTimeKind.Utc || value.Value.Kind == DateTimeKind.Unspecified)
            {
                // Unspecified thường là từ database (lưu UTC), convert sang Vietnam time
                vietnamTime = DateTimeHelper.FromUtc(value.Value);
            }
            else
            {
                // Local time, giả sử đã là Vietnam time
                vietnamTime = value.Value;
            }

            // Serialize như local time với timezone offset +07:00 (Vietnam)
            var offset = TimeSpan.FromHours(7); // Vietnam UTC+7
            var offsetString = $"+{offset.Hours:D2}:{offset.Minutes:D2}";
            
            writer.WriteStringValue($"{vietnamTime:yyyy-MM-ddTHH:mm:ss}{offsetString}");
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
            // Convert DateTime sang Vietnam time (UTC+7)
            // Xử lý các trường hợp:
            // - DateTimeKind.Utc: Convert từ UTC sang Vietnam time
            // - DateTimeKind.Unspecified: Giả sử là UTC (từ database) và convert sang Vietnam time
            // - DateTimeKind.Local: Giả sử đã là Vietnam time
            DateTime vietnamTime;
            if (value.Kind == DateTimeKind.Utc || value.Kind == DateTimeKind.Unspecified)
            {
                // Unspecified thường là từ database (lưu UTC), convert sang Vietnam time
                vietnamTime = DateTimeHelper.FromUtc(value);
            }
            else
            {
                // Local time, giả sử đã là Vietnam time
                vietnamTime = value;
            }

            // Serialize như local time với timezone offset +07:00 (Vietnam)
            var offset = TimeSpan.FromHours(7); // Vietnam UTC+7
            var offsetString = $"+{offset.Hours:D2}:{offset.Minutes:D2}";
            
            writer.WriteStringValue($"{vietnamTime:yyyy-MM-ddTHH:mm:ss}{offsetString}");
        }
    }
}
