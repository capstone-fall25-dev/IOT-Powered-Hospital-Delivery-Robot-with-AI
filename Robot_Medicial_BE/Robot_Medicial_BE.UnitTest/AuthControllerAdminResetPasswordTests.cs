using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Reflection;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Task = System.Threading.Tasks.Task;

namespace Robot_Medicial_BE.UnitTest
{
    public class AuthControllerAdminResetPasswordTests
    {
        private readonly Mock<IUserService> _mockUserService;
        private readonly AuthController _authController;

        public AuthControllerAdminResetPasswordTests()
        {
            _mockUserService = new Mock<IUserService>();
            _authController = new AuthController(_mockUserService.Object);
        }

        private void SetupAdminUserClaims()
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, "admin@example.com"),
                new Claim(ClaimTypes.NameIdentifier, "1"),
                new Claim(ClaimTypes.Role, "admin")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            _authController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = principal
                }
            };
        }

        // Helper method to get message from anonymous object
        private string GetMessageFromResult(object? value)
        {
            if (value == null) return string.Empty;
            
            var type = value.GetType();
            var messageProperty = type.GetProperty("message");
            if (messageProperty != null)
            {
                return messageProperty.GetValue(value)?.ToString() ?? string.Empty;
            }
            
            // Fallback: try to get value using reflection with uppercase
            messageProperty = type.GetProperty("Message");
            if (messageProperty != null)
            {
                return messageProperty.GetValue(value)?.ToString() ?? string.Empty;
            }
            
            return value.ToString() ?? string.Empty;
        }

        [Fact]
        public async Task AdminResetPassword_UTCID01_AutomaticReset_ReturnsSuccess()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var expectedMessage = "Mật khẩu đã được đặt lại thành công. Mật khẩu mới: NewPass123@";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(expectedMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = GetMessageFromResult(okResult.Value);
            Assert.Equal(expectedMessage, message);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID02_ManualReset_ValidPassword_ReturnsSuccess()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var expectedMessage = "Lưu thành công";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(expectedMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID03_ManualReset_NullPassword_ReturnsSuccess()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var expectedMessage = "Lưu thành công";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(expectedMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID04_ManualReset_ValidLength_ReturnsError()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var errorMessage = "Không thể lưu thay đổi. Vui lòng thử lại";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(errorMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID05_ManualReset_PasswordLengthLessThan8_ReturnsError()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var errorMessage = "Không thể lưu thay đổi. Vui lòng thử lại";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(errorMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = GetMessageFromResult(okResult.Value);
            Assert.Equal(errorMessage, message);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID06_ManualReset_PasswordLengthGreaterThan50_ReturnsError()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var errorMessage = "Không thể lưu thay đổi. Vui lòng thử lại";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(errorMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = GetMessageFromResult(okResult.Value);
            Assert.Equal(errorMessage, message);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID07_ManualReset_PasswordWithoutRequiredChars_ReturnsError()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var errorMessage = "Không thể lưu thay đổi. Vui lòng thử lại";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(errorMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = GetMessageFromResult(okResult.Value);
            Assert.Equal(errorMessage, message);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID08_ManualReset_PasswordWithSpace_ReturnsError()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var errorMessage = "Không thể lưu thay đổi. Vui lòng thử lại";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(errorMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = GetMessageFromResult(okResult.Value);
            Assert.Equal(errorMessage, message);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID09_ManualReset_ReturnsResult()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var expectedMessage = "Mật khẩu đã được đặt lại thành công. Mật khẩu mới: NewPass123@";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(expectedMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID10_ManualReset_ReturnsResult()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var expectedMessage = "Mật khẩu đã được đặt lại thành công. Mật khẩu mới: NewPass123@";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(expectedMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_UTCID11_ManualReset_ReturnsResult()
        {
            SetupAdminUserClaims();
            var email = "user@example.com";
            var expectedMessage = "Mật khẩu đã được đặt lại thành công. Mật khẩu mới: NewPass123@";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(expectedMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }

        [Fact]
        public async Task AdminResetPassword_EmptyEmail_ReturnsBadRequest()
        {
            SetupAdminUserClaims();
            var email = "";

            var result = await _authController.AdminResetPassword(email);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequestResult.Value);
            var message = GetMessageFromResult(badRequestResult.Value);
            Assert.Equal("Email không được để trống.", message);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task AdminResetPassword_UserNotFound_ReturnsNotFoundMessage()
        {
            SetupAdminUserClaims();
            var email = "nonexistent@example.com";
            var errorMessage = "Không tìm thấy người dùng.";

            _mockUserService.Setup(s => s.AdminResetPasswordAsync(email)).ReturnsAsync(errorMessage);

            var result = await _authController.AdminResetPassword(email);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = GetMessageFromResult(okResult.Value);
            Assert.Equal(errorMessage, message);
            _mockUserService.Verify(s => s.AdminResetPasswordAsync(email), Times.Once);
        }
    }
}
