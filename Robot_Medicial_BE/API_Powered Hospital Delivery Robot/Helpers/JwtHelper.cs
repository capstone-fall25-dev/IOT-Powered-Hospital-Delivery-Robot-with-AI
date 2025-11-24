using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    public static class JwtHelper
    {
        /// <summary>
        /// Tạo JWT Token cho người dùng sau khi đăng nhập thành công
        /// </summary>
        /// <param name="user">Thông tin người dùng</param>
        /// <param name="configuration">Cấu hình từ appsettings.json</param>
        /// <returns>Chuỗi JWT Token</returns>
        public static string GenerateToken(User user, IConfiguration configuration)
        {
            // Tạo các claim (thông tin đưa vào token)
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("FullName", user.FullName ?? string.Empty),
                new Claim("CreatedAt", user.CreatedAt.ToString("O"))
            };

            // Tạo key token
            var secretKey = configuration["Jwt:Secret"];
            if (string.IsNullOrEmpty(secretKey))
                throw new Exception("Thiếu cấu hình JWT Secret Key trong appsettings.json");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Tạo token 
            var token = new JwtSecurityToken(
                issuer: configuration["Jwt:Issuer"],
                audience: configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(int.Parse(configuration["Jwt:ExpiryInMinutes"] ?? "60")),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
