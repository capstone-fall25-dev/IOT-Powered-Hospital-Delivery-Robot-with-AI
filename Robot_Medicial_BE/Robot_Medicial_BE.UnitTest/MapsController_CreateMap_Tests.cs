using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;

namespace API_Powered_Hospital_Delivery_Robot.Tests.Controllers
{
    public class MapsUploadController_CreateMap_Tests
    {
        private readonly Mock<IMapUploadService> _uploadServiceMock;
        private readonly Mock<IMapService> _mapServiceMock;
        private readonly MapsUploadController _controller;

        public MapsUploadController_CreateMap_Tests()
        {
            _uploadServiceMock = new Mock<IMapUploadService>();
            _mapServiceMock = new Mock<IMapService>();

            _controller = new MapsUploadController(
                _uploadServiceMock.Object,
                _mapServiceMock.Object
            );
        }

        #region Helpers

        private static string ValidBase64 =>
            Convert.ToBase64String(Encoding.UTF8.GetBytes("dummy image"));

        private static MapUploadJsonDto CreateValidRequest(string mapName = "Map_Tang1")
        {
            return new MapUploadJsonDto
            {
                MapName = mapName,
                Mode = "save_map",
                Resolution = 0.05f,
                OriginX = 0,
                OriginY = 0,
                OriginZ = 0,
                OccupiedThresh = 0.65f,
                FreeThresh = 0.25f,
                Negate = false,
                ImageName = "map_tang1.pgm",
                ImageBase64 = ValidBase64
            };
        }

        private static MapResponseDto CreateFakeResponse(string mapName = "Map_Tang1")
        {
            return new MapResponseDto
            {
                Id = 1,
                MapName = mapName,
                Resolution = 0.05f,
                OriginX = 0,
                OriginY = 0,
                OriginZ = 0
            };
        }

        #endregion

        // ============================================================
        // 15 TEST CASES cho UploadJson (Create Map)
        // ============================================================

        [Fact]
        public async Task UploadJson_UTCD01_FullValid_ShouldReturnCreated()
        {
            var req = CreateValidRequest("Map_Tang1");
            var expected = CreateFakeResponse(req.MapName);

            _uploadServiceMock
                .Setup(s => s.UploadAsync(It.IsAny<MapUploadDto>(), It.IsAny<IFormFile?>()))
                .ReturnsAsync(expected);

            var result = await _controller.UploadJson(req);

            var created = Assert.IsType<CreatedAtActionResult>(result.Result);
            Assert.Equal(201, created.StatusCode);
            var body = Assert.IsType<MapResponseDto>(created.Value);
            Assert.Equal(expected.Id, body.Id);
            Assert.Equal(expected.MapName, body.MapName);

            _uploadServiceMock.Verify(
                s => s.UploadAsync(It.IsAny<MapUploadDto>(), It.IsAny<IFormFile?>()),
                Times.Once);
        }

        [Fact]
        public async Task UploadJson_UTCD02_NoImage_ShouldCallServiceWithNullFile()
        {
            var req = CreateValidRequest("Map_NoImage");
            req.ImageBase64 = null;
            req.ImageName = null;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.IsAny<MapUploadDto>(),
                    It.Is<IFormFile?>(f => f == null)))
                .ReturnsAsync(CreateFakeResponse(req.MapName));

            var result = await _controller.UploadJson(req);

            var created = Assert.IsType<CreatedAtActionResult>(result.Result);
            Assert.Equal(201, created.StatusCode);

            _uploadServiceMock.Verify(
                s => s.UploadAsync(It.IsAny<MapUploadDto>(), null),
                Times.Once);
        }

        [Fact]
        public async Task UploadJson_UTCD03_MapNameOneChar_ShouldReturnCreated()
        {
            var req = CreateValidRequest("M");

            _uploadServiceMock
                .Setup(s => s.UploadAsync(It.IsAny<MapUploadDto>(), It.IsAny<IFormFile?>()))
                .ReturnsAsync(CreateFakeResponse("M"));

            var result = await _controller.UploadJson(req);

            var created = Assert.IsType<CreatedAtActionResult>(result.Result);
            var body = Assert.IsType<MapResponseDto>(created.Value);
            Assert.Equal("M", body.MapName);
        }

        [Fact]
        public async Task UploadJson_UTCD04_MapName255Chars_ShouldReturnCreated()
        {
            var longName = new string('A', 255);
            var req = CreateValidRequest(longName);

            _uploadServiceMock
                .Setup(s => s.UploadAsync(It.IsAny<MapUploadDto>(), It.IsAny<IFormFile?>()))
                .ReturnsAsync(CreateFakeResponse(longName));

            var result = await _controller.UploadJson(req);

            var created = Assert.IsType<CreatedAtActionResult>(result.Result);
            var body = Assert.IsType<MapResponseDto>(created.Value);
            Assert.Equal(longName, body.MapName);
        }

        [Fact]
        public async Task UploadJson_UTCD05_ResolutionVerySmall_ShouldReturnCreated()
        {
            var req = CreateValidRequest("Map_Resolution_Min");
            req.Resolution = 0.001f;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d => d.Resolution == req.Resolution),
                    It.IsAny<IFormFile?>()))
                .ReturnsAsync(CreateFakeResponse(req.MapName));

            var result = await _controller.UploadJson(req);
            Assert.IsType<CreatedAtActionResult>(result.Result);
        }

        [Fact]
        public async Task UploadJson_UTCD06_ResolutionLarge_ShouldReturnCreated()
        {
            var req = CreateValidRequest("Map_Resolution_Max");
            req.Resolution = 1.0f;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d => d.Resolution == 1.0f),
                    It.IsAny<IFormFile?>()))
                .ReturnsAsync(CreateFakeResponse(req.MapName));

            var result = await _controller.UploadJson(req);
            Assert.IsType<CreatedAtActionResult>(result.Result);
        }

        [Fact]
        public async Task UploadJson_UTCD07_ResolutionNotPositive_ShouldReturn500()
        {
            var req = CreateValidRequest("Map_NegativeResolution");
            req.Resolution = -0.05f;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d => d.Resolution <= 0),
                    It.IsAny<IFormFile?>()))
                .ThrowsAsync(new ArgumentException("Resolution must be > 0"));

            var result = await _controller.UploadJson(req);

            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, obj.StatusCode);
        }

        [Fact]
        public async Task UploadJson_UTCD08_MapNameEmpty_ShouldReturn500()
        {
            var req = CreateValidRequest("");
            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d => string.IsNullOrWhiteSpace(d.MapName)),
                    It.IsAny<IFormFile?>()))
                .ThrowsAsync(new ArgumentException("MapName is required"));

            var result = await _controller.UploadJson(req);

            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, obj.StatusCode);
        }

        [Fact]
        public async Task UploadJson_UTCD09_MapNameNull_ShouldReturn500()
        {
            var req = CreateValidRequest();
            req.MapName = null;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d => d.MapName == null),
                    It.IsAny<IFormFile?>()))
                .ThrowsAsync(new ArgumentException("MapName is required"));

            var result = await _controller.UploadJson(req);

            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, obj.StatusCode);
        }

        [Fact]
        public async Task UploadJson_UTCD10_InvalidBase64_ShouldReturn500_AndNotCallService()
        {
            var req = CreateValidRequest("Map_InvalidBase64");
            req.ImageBase64 = "NOT_BASE64!!!!";

            var result = await _controller.UploadJson(req);

            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, obj.StatusCode);

            _uploadServiceMock.Verify(
                s => s.UploadAsync(It.IsAny<MapUploadDto>(), It.IsAny<IFormFile?>()),
                Times.Never);
        }

        [Fact]
        public async Task UploadJson_UTCD11_ImageNameNull_ShouldStillReturnCreated()
        {
            var req = CreateValidRequest("Map_NoImageName");
            req.ImageName = null;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(It.IsAny<MapUploadDto>(), It.IsAny<IFormFile?>()))
                .ReturnsAsync(CreateFakeResponse(req.MapName));

            var result = await _controller.UploadJson(req);

            Assert.IsType<CreatedAtActionResult>(result.Result);
        }

        [Fact]
        public async Task UploadJson_UTCD12_OccupiedLessOrEqualFree_ShouldReturn500()
        {
            var req = CreateValidRequest("Map_ThreshEqual");
            req.OccupiedThresh = 0.5f;
            req.FreeThresh = 0.5f;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d => d.OccupiedThresh <= d.FreeThresh),
                    It.IsAny<IFormFile?>()))
                .ThrowsAsync(new ArgumentException("OccupiedThresh must be greater than FreeThresh"));

            var result = await _controller.UploadJson(req);

            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, obj.StatusCode);
        }

        [Fact]
        public async Task UploadJson_UTCD13_ThresholdOutOfRange_ShouldReturn500()
        {
            var req = CreateValidRequest("Map_ThreshOutOfRange");
            req.OccupiedThresh = 1.5f;
            req.FreeThresh = -0.1f;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d =>
                        d.OccupiedThresh > 1 || d.OccupiedThresh < 0 ||
                        d.FreeThresh > 1 || d.FreeThresh < 0),
                    It.IsAny<IFormFile?>()))
                .ThrowsAsync(new ArgumentException("Thresholds must be between 0 and 1"));

            var result = await _controller.UploadJson(req);

            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, obj.StatusCode);
        }

        [Fact]
        public async Task UploadJson_UTCD14_OriginVeryLarge_ShouldReturnCreated()
        {
            var req = CreateValidRequest("Map_OriginHuge");
            req.OriginX = 1_000_000;
            req.OriginY = 1_000_000;
            req.OriginZ = 0;

            _uploadServiceMock
                .Setup(s => s.UploadAsync(
                    It.Is<MapUploadDto>(d =>
                        d.OriginX == req.OriginX &&
                        d.OriginY == req.OriginY &&
                        d.OriginZ == req.OriginZ),
                    It.IsAny<IFormFile?>()))
                .ReturnsAsync(CreateFakeResponse(req.MapName));

            var result = await _controller.UploadJson(req);

            var created = Assert.IsType<CreatedAtActionResult>(result.Result);
            var body = Assert.IsType<MapResponseDto>(created.Value);
            Assert.Equal(req.MapName, body.MapName);
        }

        [Fact]
        public async Task UploadJson_UTCD15_ServiceThrows_ShouldReturn500()
        {
            var req = CreateValidRequest("Map_DBError");

            _uploadServiceMock
                .Setup(s => s.UploadAsync(It.IsAny<MapUploadDto>(), It.IsAny<IFormFile?>()))
                .ThrowsAsync(new Exception("DB error"));

            var result = await _controller.UploadJson(req);

            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, obj.StatusCode);
        }

        // ============================================================
        // Bonus: GetById (để hỗ trợ CreatedAtAction)
        // ============================================================

        [Fact]
        public async Task GetById_Found_ReturnsOk()
        {
            _mapServiceMock.Setup(s => s.GetByIdAsync(1))
                           .ReturnsAsync(CreateFakeResponse("Map_X"));

            var res = await _controller.GetById(1);
            var ok = Assert.IsType<OkObjectResult>(res.Result);
            Assert.IsType<MapResponseDto>(ok.Value);
        }

        [Fact]
        public async Task GetById_NotFound_Returns404()
        {
            _mapServiceMock.Setup(s => s.GetByIdAsync(123))
                           .ReturnsAsync((MapResponseDto?)null);

            var res = await _controller.GetById(123);
            Assert.IsType<NotFoundObjectResult>(res.Result);
        }
    }
}
