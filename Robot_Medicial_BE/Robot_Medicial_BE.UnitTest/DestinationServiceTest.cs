using Xunit;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using AutoMapper;
using Task = System.Threading.Tasks.Task;

namespace API_Powered_Hospital_Delivery_Robot.Tests.Services
{
    public class DestinationServiceTests
    {
        private readonly Mock<IDestinationRepository> _repo;
        private readonly Mock<IMapper> _mapper;
        private readonly DestinationService _service;

        public DestinationServiceTests()
        {
            _repo = new Mock<IDestinationRepository>();
            _mapper = new Mock<IMapper>();
            _service = new DestinationService(_repo.Object, _mapper.Object);
        }

        // ==========================
        // CREATE
        // ==========================
        [Fact]
        public async Task CreateAsync_ShouldThrow_WhenNameExists()
        {
            var dto = new DestinationDto { Name = "Lobby" };
            _repo.Setup(r => r.GetByNameAsync("Lobby")).ReturnsAsync(new Destination());

            await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.CreateAsync(dto)
            );
        }

        [Fact]
        public async Task CreateAsync_ShouldReturnDestination_WhenSuccess()
        {
            var dto = new DestinationDto { Name = "Lobby", Area = "A", Floor = "1" };
            var dest = new Destination { Id = 1, Name = "Lobby" };
            var responseDto = new DestinationResponseDto { Id = 1, Name = "Lobby" };

            _repo.Setup(r => r.GetByNameAsync("Lobby")).ReturnsAsync((Destination?)null);
            _mapper.Setup(m => m.Map<Destination>(dto)).Returns(dest);
            _repo.Setup(r => r.CreateAsync(dest)).ReturnsAsync(dest);
            _mapper.Setup(m => m.Map<DestinationResponseDto>(dest)).Returns(responseDto);

            var result = await _service.CreateAsync(dto);

            Assert.Equal((ulong)1, result.Id);
            Assert.Equal("Lobby", result.Name);
        }

        // ==========================
        // GET ALL
        // ==========================
        [Fact]
        public async Task GetAllAsync_ShouldReturnMappedList()
        {
            var list = new List<Destination> { new Destination { Id = 1, Name = "Lobby" } };
            var mappedList = new List<DestinationResponseDto> { new DestinationResponseDto { Id = 1, Name = "Lobby" } };

            _repo.Setup(r => r.GetAllAsync(null, null)).ReturnsAsync(list);
            _mapper.Setup(m => m.Map<IEnumerable<DestinationResponseDto>>(list)).Returns(mappedList);

            var result = await _service.GetAllAsync();

            Assert.Single(result);
            Assert.Equal("Lobby", ((List<DestinationResponseDto>)result)[0].Name);
        }

        // ==========================
        // GET BY ID
        // ==========================
        [Fact]
        public async Task GetByIdAsync_ShouldReturnMapped_WhenExists()
        {
            var dest = new Destination { Id = 1, Name = "Lobby" };
            var responseDto = new DestinationResponseDto { Id = 1, Name = "Lobby" };

            _repo.Setup(r => r.GetByIdAsync(1UL)).ReturnsAsync(dest);
            _mapper.Setup(m => m.Map<DestinationResponseDto>(dest)).Returns(responseDto);

            var result = await _service.GetByIdAsync(1UL);

            Assert.NotNull(result);
            Assert.Equal("Lobby", result.Name);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnNull_WhenNotExists()
        {
            _repo.Setup(r => r.GetByIdAsync(1UL)).ReturnsAsync((Destination?)null);

            var result = await _service.GetByIdAsync(1UL);

            Assert.Null(result);
        }

        // ==========================
        // UPDATE
        // ==========================
        [Fact]
        public async Task UpdateAsync_ShouldThrow_WhenNotExists()
        {
            var dto = new DestinationDto { Name = "Lobby" };
            _repo.Setup(r => r.GetByIdAsync(1UL)).ReturnsAsync((Destination?)null);

            await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.UpdateAsync(1UL, dto)
            );
        }

        [Fact]
        public async Task UpdateAsync_ShouldThrow_WhenNameDuplicate()
        {
            var dto = new DestinationDto { Name = "NewName" };
            var existing = new Destination { Id = 1, Name = "OldName" };
            var duplicate = new Destination { Id = 2, Name = "NewName" };

            _repo.Setup(r => r.GetByIdAsync(1UL)).ReturnsAsync(existing);
            _repo.Setup(r => r.GetByNameAsync("NewName")).ReturnsAsync(duplicate);

            await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.UpdateAsync(1UL, dto)
            );
        }

        [Fact]
        public async Task UpdateAsync_ShouldReturnMapped_WhenSuccess()
        {
            var dto = new DestinationDto { Name = "NewName", Area = "B", Floor = "2" };
            var existing = new Destination { Id = 1, Name = "OldName" };
            var updated = new Destination { Id = 1, Name = "NewName" };
            var responseDto = new DestinationResponseDto { Id = 1, Name = "NewName" };

            _repo.Setup(r => r.GetByIdAsync(1UL)).ReturnsAsync(existing);
            _repo.Setup(r => r.GetByNameAsync("NewName")).ReturnsAsync((Destination?)null);
            _mapper.Setup(m => m.Map<Destination>(dto)).Returns(updated);
            _repo.Setup(r => r.UpdateAsync(1UL, updated)).ReturnsAsync(updated);
            _mapper.Setup(m => m.Map<DestinationResponseDto>(updated)).Returns(responseDto);

            var result = await _service.UpdateAsync(1UL, dto);

            Assert.NotNull(result);
            Assert.Equal("NewName", result.Name);
        }

        // ==========================
        // GET POSITION
        // ==========================
        [Fact]
        public Task GetPositionByIdAsync_ShouldThrow_WhenNotExists()
        {
            _repo.Setup(r => r.GetPositionByIdAsync(1UL)).ReturnsAsync((DestinationPositionDto?)null);

            return Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.GetPositionByIdAsync(1UL)
            );
        }

        [Fact]
        public async Task GetPositionByIdAsync_ShouldReturnPosition_WhenExists()
        {
            var pos = new DestinationPositionDto { X = 10, Y = 20 };
            _repo.Setup(r => r.GetPositionByIdAsync(1UL)).ReturnsAsync(pos);

            var result = await _service.GetPositionByIdAsync(1UL);

            Assert.NotNull(result);
            Assert.Equal(10, result.X);
            Assert.Equal(20, result.Y);
        }
    }
}
