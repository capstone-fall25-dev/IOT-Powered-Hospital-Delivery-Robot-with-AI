using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    /// <summary>
    /// Xử lý tạo và quản lý JWT token cho xác thực người dùng
    /// </summary>
    public static class JwtHelper
    {
        /// <summary>
        /// Tạo JWT token cho nhân viên sau khi đăng nhập thành công
        /// </summary>
        public static string GenerateToken(User user, IConfiguration configuration)
        {
            // Tạo thông tin xác thực đưa vào token
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.Name, user.FullName ?? "Nhân viên"),
                new Claim("fullName", user.FullName ?? "Nhân viên"),
                new Claim("CreatedAt", user.CreatedAt.ToString("O"))
            };

            // Lấy khóa bí mật từ cấu hình
            var secretKey = configuration["Jwt:Secret"];
            if (string.IsNullOrEmpty(secretKey))
                throw new Exception("Thiếu cấu hình JWT Secret Key trong appsettings.json");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Tạo token với thời gian hết hạn
            var token = new JwtSecurityToken(
                issuer: configuration["Jwt:Issuer"],
                audience: configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTimeHelper.Now().AddMinutes(int.Parse(configuration["Jwt:ExpiryInMinutes"] ?? "60")),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
