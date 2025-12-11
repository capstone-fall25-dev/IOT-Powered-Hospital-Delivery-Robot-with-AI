using Xunit;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

using TaskEntity = API_Powered_Hospital_Delivery_Robot.Models.Entities.Task;
using Task = System.Threading.Tasks.Task;

public class RobotServiceTests
{
    private readonly RobotService _service;
    private readonly Mock<IRobotRepository> _robotRepo;
    private readonly Mock<IMapRepository> _mapRepo;
    private readonly Mock<ILogRepository> _logRepo;
    private readonly Mock<IAlertService> _alertService;
    private readonly Mock<IRobotCompartmentRepository> _compRepo;
    private readonly Mock<IMapper> _mapper;
    private readonly Mock<IHubContext<RobotHub>> _hubContext;
    private readonly Mock<IHubClients> _hubClients;
    private readonly Mock<IClientProxy> _clientProxy;
    private readonly Mock<IConfiguration> _configuration;
    private readonly Mock<ILogger<RobotService>> _logger;

    public RobotServiceTests()
    {
        _robotRepo = new Mock<IRobotRepository>();
        _mapRepo = new Mock<IMapRepository>();
        _logRepo = new Mock<ILogRepository>();
        _alertService = new Mock<IAlertService>();
        _compRepo = new Mock<IRobotCompartmentRepository>();
        _mapper = new Mock<IMapper>();

        // Fix HubContext
        _hubClients = new Mock<IHubClients>();
        _clientProxy = new Mock<IClientProxy>();
        _hubClients.Setup(c => c.All).Returns(_clientProxy.Object);

        _hubContext = new Mock<IHubContext<RobotHub>>();
        _hubContext.Setup(h => h.Clients).Returns(_hubClients.Object);

        _configuration = new Mock<IConfiguration>();
        _logger = new Mock<ILogger<RobotService>>();

        _service = new RobotService(
            _robotRepo.Object,
            _mapper.Object,
            _mapRepo.Object,
            _logRepo.Object,
            _alertService.Object,
            _compRepo.Object,
            _hubContext.Object,
            _configuration.Object,
            _logger.Object
        );
    }

    // ==============================
    // ASSIGN MAP
    // ==============================
    [Fact]
    public async Task AssignMapAsync_ShouldThrow_WhenRobotNotFound()
    {
        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, true, false))
                  .ReturnsAsync((Robot?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.AssignMapAsync(1UL, 1UL)
        );
    }

    [Fact]
    public async Task AssignMapAsync_ShouldThrow_WhenRobotHasRunningTask()
    {
        var robot = new Robot
        {
            Id = 1,
            Tasks = new List<TaskEntity> { new TaskEntity { Status = "in_progress" } }
        };

        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, true, false)).ReturnsAsync(robot);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.AssignMapAsync(1UL, 1UL)
        );
    }

    [Fact]
    public async Task AssignMapAsync_ShouldReturnSuccess_WhenValid()
    {
        var robot = new Robot { Id = 1, Code = "RB001", Tasks = new List<TaskEntity>() };
        var map = new Map { Id = 10, MapName = "Floor 1" };

        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, true, false)).ReturnsAsync(robot);
        _mapRepo.Setup(m => m.GetByIdAsync(10UL, false)).ReturnsAsync(map);
        _robotRepo.Setup(r => r.AssignMapAsync(1UL, 10UL)).ReturnsAsync(robot);

        var result = await _service.AssignMapAsync(1UL, 10UL);

        Assert.Equal((ulong)1, result.RobotId);
        Assert.Equal((ulong)10, result.MapId);
        Assert.Equal("Floor 1", result.MapName);
        _logRepo.Verify(l => l.CreateAsync(It.IsAny<Log>()), Times.Once);
    }

    // ==============================
    // CREATE ROBOT
    // ==============================
    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenCodeEmpty()
    {
        var dto = new RobotDto { Code = "" };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenCodeExists()
    {
        _robotRepo.Setup(r => r.GetByCodeAsync("RB001"))
                  .ReturnsAsync(new Robot { Code = "RB001" });

        var dto = new RobotDto { Code = "RB001" };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateRobotSuccessfully()
    {
        var dto = new RobotDto
        {
            Code = "RB001",
            BatteryPercent = 80,
            Compartments = new List<CompartmentDto> { new CompartmentDto { CategoryId = 1 } }
        };

        var robot = new Robot { Id = 123, Code = "RB001", RobotCompartments = new List<RobotCompartment>() };

        _robotRepo.Setup(r => r.GetByCodeAsync("RB001")).ReturnsAsync((Robot?)null);
        _mapper.Setup(m => m.Map<Robot>(dto)).Returns(robot);
        _robotRepo.Setup(r => r.CreateAsync(It.IsAny<Robot>())).ReturnsAsync(robot);
        _compRepo.Setup(c => c.CreateManyAsync(It.IsAny<List<RobotCompartment>>())).Returns(Task.CompletedTask);

        var result = await _service.CreateAsync(dto);

        Assert.Equal((ulong)123, result.Id);
        Assert.Equal("RB001", result.Code);
    }

    // ==============================
    // UPDATE ROBOT
    // ==============================
    [Fact]
    public async Task UpdateAsync_ShouldThrow_WhenRobotNotFound()
    {
        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, true, true))
                  .ReturnsAsync((Robot?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.UpdateAsync(1UL, new UpdateRobotDto())
        );
    }

    [Fact]
    public async Task UpdateAsync_ShouldThrow_WhenRobotRunningTask()
    {
        var robot = new Robot { Id = 1, Tasks = new List<TaskEntity> { new TaskEntity { Status = "transporting" } } };

        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, true, true))
                  .ReturnsAsync(robot);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.UpdateAsync(1UL, new UpdateRobotDto())
        );
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateSuccessfully()
    {
        // Arrange
        ulong robotId = 1;

        var robot = new Robot
        {
            Id = robotId,
            Code = "RB001",
            Name = "Old Name",
            Status = "idle",
            Tasks = new List<TaskEntity>(), // Không có task đang chạy
            RobotCompartments = new List<RobotCompartment>()
        };

        var updateDto = new UpdateRobotDto
        {
            Name = "New Name",
            MapId = 5,
            Compartments = new List<UpdateCompartmentDto>
        {
            new UpdateCompartmentDto { CategoryId = 2, IsLocked = false }
        }
        };

        // Mock repository và service
        _robotRepo.Setup(r => r.GetByIdAsync(robotId, It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>()))
            .ReturnsAsync(robot);

        _mapRepo.Setup(m => m.GetByIdAsync(5UL, It.IsAny<bool>()))
            .ReturnsAsync(new Map { Id = 5, MapName = "Floor 1" });

        _compRepo.Setup(c => c.DeleteByRobotIdAsync(robotId))
            .Returns(Task.CompletedTask);

        _compRepo.Setup(c => c.CreateManyAsync(It.IsAny<List<RobotCompartment>>()))
            .Returns(Task.CompletedTask);

        _robotRepo.Setup(r => r.UpdateAsync(It.IsAny<Robot>()))
            .ReturnsAsync((Robot r) => r); // trả về robot sau update

        _logRepo.Setup(l => l.CreateAsync(It.IsAny<Log>()))
               .ReturnsAsync(new Log());

        // Act
        var result = await _service.UpdateAsync(robotId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Name", result.Name);
        Assert.Equal((ulong)5, result.MapId);



        // Verify các phương thức repository được gọi
        _robotRepo.Verify(r => r.GetByIdAsync(robotId, It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Once);
        _mapRepo.Verify(m => m.GetByIdAsync(5UL, It.IsAny<bool>()), Times.Once);
        _compRepo.Verify(c => c.DeleteByRobotIdAsync(robotId), Times.Once);
        _compRepo.Verify(c => c.CreateManyAsync(It.IsAny<List<RobotCompartment>>()), Times.Once);
        _robotRepo.Verify(r => r.UpdateAsync(It.IsAny<Robot>()), Times.Once);
        _logRepo.Verify(l => l.CreateAsync(It.IsAny<Log>()), Times.Once);
    }



    // ==============================
    // UPDATE STATUS
    // ==============================
    [Fact]
    public async Task UpdateStatusAsync_ShouldThrow_WhenStatusInvalid()
    {
        var dto = new UpdateStatusDto { Status = "invalid_status" };

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateStatusAsync(1UL, dto));
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldThrow_WhenRobotNotFound()
    {
        var dto = new UpdateStatusDto { Status = "transporting" };

        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, false, false))
                  .ReturnsAsync((Robot?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.UpdateStatusAsync(1UL, dto));
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldThrow_WhenRobotOffline()
    {
        var robot = new Robot { Id = 1, Status = "offline" };
        var dto = new UpdateStatusDto { Status = "transporting" };

        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, false, false))
                  .ReturnsAsync(robot);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.UpdateStatusAsync(1UL, dto));
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldReturnRobotResponse_WhenSuccessful()
    {
        var robot = new Robot { Id = 1, Status = "idle" };
        var dto = new UpdateStatusDto { Status = "charging" };
        var updatedRobot = new Robot { Id = 1, Status = "charging" };
        var responseDto = new RobotResponseDto { Id = 1, Status = "charging" };

        _robotRepo.Setup(r => r.GetByIdAsync(1UL, false, false, false))
                  .ReturnsAsync(robot);
        _robotRepo.Setup(r => r.UpdateStatusAsync(1UL, "charging"))
                  .ReturnsAsync(updatedRobot);
        _mapper.Setup(m => m.Map<RobotResponseDto>(updatedRobot))
               .Returns(responseDto);

        var result = await _service.UpdateStatusAsync(1UL, dto);

        Assert.NotNull(result);
        Assert.Equal("charging", result.Status);
        Assert.Equal((ulong)1, result.Id);
    }
}
