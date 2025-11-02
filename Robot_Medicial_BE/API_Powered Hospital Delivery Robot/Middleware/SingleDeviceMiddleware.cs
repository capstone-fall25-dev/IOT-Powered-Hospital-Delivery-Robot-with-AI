using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Http;
using System.Linq;
using System.Threading.Tasks;

public class SingleDeviceMiddleware
{
    private readonly RequestDelegate _next;

    public SingleDeviceMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();

        // Nếu request có JWT token
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();

            // Giải mã JWT để lấy username
            var jwtHandler = new JwtSecurityTokenHandler();
            JwtSecurityToken? jwtToken = null;
            try
            {
                jwtToken = jwtHandler.ReadJwtToken(token);
            }
            catch
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("Invalid token format.");
                return;
            }

            var username = jwtToken?.Claims.FirstOrDefault(c =>
                c.Type == "unique_name" || c.Type == "sub")?.Value;

            if (!string.IsNullOrEmpty(username))
            {
                // Kiểm tra token trong session
                var sessionToken = context.Session.GetString($"UserToken_{username}");

                // 🔹 Nếu session hết hạn hoặc chưa có
                if (sessionToken == null)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Session expired due to inactivity (auto logout after 5 minutes).");
                    return;
                }

                // 🔹 Nếu đăng nhập từ thiết bị khác (token thay đổi)
                if (sessionToken != token)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("You have been logged out because you logged in on another device.");
                    return;
                }

                // 🔹 Nếu session còn hợp lệ → “chạm” lại session để reset IdleTimeout
                context.Session.SetString($"UserToken_{username}", sessionToken);
            }
        }

        await _next(context);
    }
}
