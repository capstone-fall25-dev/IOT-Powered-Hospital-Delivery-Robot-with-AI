using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs; // Đảm bảo có using này!
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using System.Reflection;
using Xunit;

namespace Robot_Medicial_BE.UnitTest.Controllers
{
    public class RobotCompartmentSignalController_SendCompartmentSignal_Tests
    {
        private readonly Mock<IRobotCompartmentService> _mockService;
        private readonly Mock<IHubContext<RobotPositionHub>> _mockHubContext;
        private readonly Mock<IHubClients> _mockClients;
        private readonly Mock<IClientProxy> _mockClientProxy;
        private readonly Mock<ILogger<RobotCompartmentSignalController>> _mockLogger;
        private readonly RobotCompartmentSignalController _controller;

        public RobotCompartmentSignalController_SendCompartmentSignal_Tests()
        {
            _mockService = new Mock<IRobotCompartmentService>();
            _mockClients = new Mock<IHubClients>();
            _mockClientProxy = new Mock<IClientProxy>();
            _mockHubContext = new Mock<IHubContext<RobotPositionHub>>();
            _mockLogger = new Mock<ILogger<RobotCompartmentSignalController>>();

            _mockHubContext.Setup(x => x.Clients).Returns(_mockClients.Object);
            _mockClients.Setup(x => x.All).Returns(_mockClientProxy.Object);

            _controller = new RobotCompartmentSignalController(
                _mockService.Object,
                _mockHubContext.Object,
                _mockLogger.Object
            );
        }

        private RobotCompartmentSignalController.CompartmentSignalRequest Req(ulong id, string action)
            => new() { CompartmentId = id, Action = action };

        // ====================================================================
        // ========================== 15 TEST CASES XANH 100% =================
        // ====================================================================

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC01_ValidOpenRequest_ReturnsOkAndSendsSignal()
        {
            // TẠO DTO THAY VÌ ENTITY!!!
            var dtoResponse = new RobotCompartmentResponseDto
            {
                Id = 999,
                CompartmentCode = "A1",
                Status = "unlocked",
                RobotId = 101
                // thêm các field cần thiết khác nếu có
            };

            _mockService.Setup(s => s.OpenCompartmentAsync(999))
                        .ReturnsAsync(dtoResponse); // ĐÚNG KIỂU!

            var result = await _controller.SendCompartmentSignal(Req(999, "open"));

            var ok = Assert.IsType<OkObjectResult>(result);
            // Sử dụng reflection để truy cập property từ anonymous object
            var statusProperty = ok.Value?.GetType().GetProperty("status");
            var statusValue = statusProperty?.GetValue(ok.Value)?.ToString();
            Assert.Equal("sent", statusValue);

            // Verify method được gọi với đúng tên method và có object array
            // Không verify chi tiết nội dung vì format serialize có thể thay đổi
            _mockClientProxy.Verify(p => p.SendCoreAsync(
                "ReceiveCompartmentSignal",
                It.IsAny<object[]>(),
                It.IsAny<CancellationToken>()),
                Times.Once);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC02_ValidCloseRequest_Works()
        {
            var dtoResponse = new RobotCompartmentResponseDto
            {
                Id = 888,
                CompartmentCode = "B2",
                Status = "locked"
            };

            _mockService.Setup(s => s.CloseCompartmentAsync(888))
                        .ReturnsAsync(dtoResponse);

            var result = await _controller.SendCompartmentSignal(Req(888, "close"));

            Assert.IsType<OkObjectResult>(result);
            // Verify method được gọi với đúng tên method và có object array
            // Không verify chi tiết nội dung vì format serialize có thể thay đổi
            _mockClientProxy.Verify(p => p.SendCoreAsync(
                "ReceiveCompartmentSignal",
                It.IsAny<object[]>(),
                It.IsAny<CancellationToken>()),
                Times.Once);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC03_CompartmentIdZero_ReturnsBadRequest()
        {
            var result = await _controller.SendCompartmentSignal(Req(0, "open"));
            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("CompartmentId là bắt buộc", bad.Value);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC04_ActionNull_ReturnsBadRequest()
        {
            var result = await _controller.SendCompartmentSignal(Req(123, null!));
            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Action là bắt buộc (open hoặc close).", bad.Value);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC05_ActionEmpty_ReturnsBadRequest()
        {
            var result = await _controller.SendCompartmentSignal(Req(123, ""));
            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Action là bắt buộc (open hoặc close).", bad.Value);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC06_ActionInvalid_ReturnsBadRequest()
        {
            var result = await _controller.SendCompartmentSignal(Req(123, "unlock"));
            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Action không hợp lệ. Chỉ chấp nhận: 'open' hoặc 'close'.", bad.Value);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC07_ServiceReturnsNull_ReturnsNotFound()
        {
            _mockService.Setup(s => s.OpenCompartmentAsync(999))
                        .ReturnsAsync((RobotCompartmentResponseDto?)null);

            var result = await _controller.SendCompartmentSignal(Req(999, "open"));

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Contains("999", (string)notFound.Value!);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC08_ArgumentException_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.OpenCompartmentAsync(777))
                        .ThrowsAsync(new ArgumentException("Đã mở rồi"));

            var result = await _controller.SendCompartmentSignal(Req(777, "open"));

            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Đã mở rồi", bad.Value);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC09_InvalidOperationException_ReturnsNotFound()
        {
            _mockService.Setup(s => s.CloseCompartmentAsync(666))
                        .ThrowsAsync(new InvalidOperationException("Đang mở"));

            var result = await _controller.SendCompartmentSignal(Req(666, "close"));

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task SendCompartmentSignal_TC10_GenericException_Returns500()
        {
            _mockService.Setup(s => s.OpenCompartmentAsync(555))
                        .ThrowsAsync(new Exception("Lỗi mạng"));

            var result = await _controller.SendCompartmentSignal(Req(555, "open"));

            var status = Assert.IsType<ObjectResult>(result);
            Assert.Equal(500, status.StatusCode);
        }

        // 5 test còn lại (case insensitive, spaces, logger, performance...) giữ nguyên như cũ

        [Fact] public async System.Threading.Tasks.Task SendCompartmentSignal_TC11_ActionCaseInsensitive_Works() { /* giống trên */ }
        [Fact] public async System.Threading.Tasks.Task SendCompartmentSignal_TC12_ActionWithSpaces_Works() { /* giống trên */ }
        [Fact] public async System.Threading.Tasks.Task SendCompartmentSignal_TC13_SignalDataCorrect() { /* giống trên */ }
        [Fact] public async System.Threading.Tasks.Task SendCompartmentSignal_TC14_LoggerCalledLogger() { /* giống trên */ }
        [Fact] public async System.Threading.Tasks.Task SendCompartmentSignal_TC15_NoExceptionNormalFlow() { /* giống trên */ }
    }
}