using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using Task = System.Threading.Tasks.Task;

namespace Robot_Medicial_BE.UnitTest
{
    public class ProfileControllerUpdateProfileTests
    {
        private readonly Mock<IUserService> _mockUserService;
        private readonly ProfileController _profileController;

        public ProfileControllerUpdateProfileTests()
        {
            _mockUserService = new Mock<IUserService>();
            _profileController = new ProfileController(_mockUserService.Object);
        }

        private void SetupUserClaims(string email = "test@example.com")
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.NameIdentifier, "1"),
                new Claim(ClaimTypes.Role, "doctor")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            _profileController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = principal
                }
            };
        }

        private ProfileResponseDto CreateProfileResponseDto(string email = "test@example.com", string fullName = "Test User")
        {
            return new ProfileResponseDto
            {
                Id = 1,
                Email = email,
                FullName = fullName,
                Role = "doctor",
                IsActive = true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
        }

        [Fact]
        public async Task UpdateMyProfile_UTCID01_ValidName_ReturnsOk()
        {
            SetupUserClaims();
            var email = "test@example.com";
            var dto = new UpdateProfileDto { FullName = "Le Manh Cuong" };
            var expectedResponse = CreateProfileResponseDto(email, "Le Manh Cuong");

            _mockUserService
                .Setup(s => s.UpdateProfileAsync(email, dto))
                .ReturnsAsync(expectedResponse);

            var result = await _profileController.UpdateMyProfile(dto);

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var response = Assert.IsType<ProfileResponseDto>(okResult.Value);
            Assert.Equal("Le Manh Cuong", response.FullName);
            Assert.Equal(email, response.Email);
            _mockUserService.Verify(s => s.UpdateProfileAsync(email, dto), Times.Once);
        }

        [Fact]
        public async Task UpdateMyProfile_UTCID02_InvalidName_ReturnsBadRequest()
        {
            SetupUserClaims();
            var email = "test@example.com";
            var dto = new UpdateProfileDto { FullName = "30" };

            _mockUserService
                .Setup(s => s.UpdateProfileAsync(email, dto))
                .ThrowsAsync(new InvalidOperationException("Tên không hợp lệ"));

            var result = await _profileController.UpdateMyProfile(dto);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.NotNull(badRequestResult.Value);
            _mockUserService.Verify(s => s.UpdateProfileAsync(email, dto), Times.Once);
        }

        [Fact]
        public async Task UpdateMyProfile_UTCID03_TooShortName_ReturnsBadRequest()
        {
            SetupUserClaims();
            var email = "test@example.com";
            var dto = new UpdateProfileDto { FullName = "!" };

            _mockUserService
                .Setup(s => s.UpdateProfileAsync(email, dto))
                .ThrowsAsync(new InvalidOperationException("Tên phải có ít nhất 2 ký tự"));

            var result = await _profileController.UpdateMyProfile(dto);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.NotNull(badRequestResult.Value);
            _mockUserService.Verify(s => s.UpdateProfileAsync(email, dto), Times.Once);
        }

        [Fact]
        public async Task UpdateMyProfile_UTCID04_ValidVietnameseName_ReturnsOk()
        {
            SetupUserClaims();
            var email = "test@example.com";
            var dto = new UpdateProfileDto { FullName = "Lê Mạnh Cường" };
            var expectedResponse = CreateProfileResponseDto(email, "Lê Mạnh Cường");

            _mockUserService
                .Setup(s => s.UpdateProfileAsync(email, dto))
                .ReturnsAsync(expectedResponse);

            var result = await _profileController.UpdateMyProfile(dto);

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var response = Assert.IsType<ProfileResponseDto>(okResult.Value);
            Assert.Equal("Lê Mạnh Cường", response.FullName);
            Assert.Equal(email, response.Email);
            _mockUserService.Verify(s => s.UpdateProfileAsync(email, dto), Times.Once);
        }

        [Fact]
        public async Task UpdateMyProfile_UTCID05_BoundaryLength50_ReturnsBadRequest()
        {
            SetupUserClaims();
            var email = "test@example.com";
            var fullName50 = new string('A', 50);
            var dto = new UpdateProfileDto { FullName = fullName50 };

            _mockUserService
                .Setup(s => s.UpdateProfileAsync(email, dto))
                .ThrowsAsync(new InvalidOperationException("Tên không được vượt quá 50 ký tự"));

            var result = await _profileController.UpdateMyProfile(dto);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.NotNull(badRequestResult.Value);
            _mockUserService.Verify(s => s.UpdateProfileAsync(email, dto), Times.Once);
        }

        [Fact]
        public async Task UpdateMyProfile_UTCID06_TooLongName_ReturnsBadRequest()
        {
            SetupUserClaims();
            var email = "test@example.com";
            var fullNameTooLong = new string('A', 129);
            var dto = new UpdateProfileDto { FullName = fullNameTooLong };

            _mockUserService
                .Setup(s => s.UpdateProfileAsync(email, dto))
                .ThrowsAsync(new InvalidOperationException("Tên không được vượt quá 128 ký tự"));

            var result = await _profileController.UpdateMyProfile(dto);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.NotNull(badRequestResult.Value);
            _mockUserService.Verify(s => s.UpdateProfileAsync(email, dto), Times.Once);
        }

        [Fact]
        public async Task UpdateMyProfile_UTCID07_NullName_ReturnsBadRequest()
        {
            SetupUserClaims();
            var email = "test@example.com";
            var dto = new UpdateProfileDto { FullName = null! };

            _mockUserService
                .Setup(s => s.UpdateProfileAsync(email, dto))
                .ThrowsAsync(new InvalidOperationException("Tên không được để trống"));

            var result = await _profileController.UpdateMyProfile(dto);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.NotNull(badRequestResult.Value);
            _mockUserService.Verify(s => s.UpdateProfileAsync(email, dto), Times.Once);
        }
    }
}