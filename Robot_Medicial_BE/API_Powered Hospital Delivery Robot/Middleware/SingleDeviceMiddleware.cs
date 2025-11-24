using System.IdentityModel.Tokens.Jwt;

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

            // Giải mã JWT 
            var jwtHandler = new JwtSecurityTokenHandler();
            JwtSecurityToken? jwtToken = null;

            try
            {
                jwtToken = jwtHandler.ReadJwtToken(token);
            }
            catch
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("Định dạng mã thông báo không hợp lệ.");
                return;
            }

            var email = jwtToken?.Claims.FirstOrDefault(c => c.Type == "unique_name" || c.Type == "sub")?.Value;

            if (!string.IsNullOrEmpty(email))
            {
                // Kiểm tra token trong session
                var sessionToken = context.Session.GetString($"UserToken_{email}");

                // Nếu session hết hạn hoặc chưa có
                if (sessionToken == null)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Phiên đã hết hạn do không hoạt động (tự động đăng xuất sau 5 phút).");
                    return;
                }

                // Nếu đăng nhập từ thiết bị khác (token thay đổi)
                if (sessionToken != token)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Bạn đã bị đăng xuất vì đã đăng nhập trên một thiết bị khác.");
                    return;
                }

                // Nếu session còn hợp lệ → “chạm” lại session để reset IdleTimeout
                context.Session.SetString($"UserToken_{email}", sessionToken);
            }
        }

        await _next(context);
    }
}
