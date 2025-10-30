using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Http;

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
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();

            var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
            var username = jwtToken.Claims.FirstOrDefault(c => c.Type == "unique_name" || c.Type == "sub")?.Value;

            if (!string.IsNullOrEmpty(username))
            {
                var sessionToken = context.Session.GetString($"UserToken_{username}");
                if (sessionToken == null || sessionToken != token)
                {
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Your session is invalid or you logged in on another device.");
                    return;
                }
            }
        }

        await _next(context);
    }
}
