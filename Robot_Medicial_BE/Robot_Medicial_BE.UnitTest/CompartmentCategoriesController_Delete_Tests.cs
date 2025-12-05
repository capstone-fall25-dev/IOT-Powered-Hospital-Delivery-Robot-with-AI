using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace Robot_Medicial_BE.UnitTest.Controllers
{
    public class CompartmentCategoriesController_Delete_Tests : IDisposable
    {
        private readonly RobotManagerContext _context = null!;
        private CompartmentCategoriesController _controller = null!;

        public CompartmentCategoriesController_Delete_Tests()
        {
            var uniqueDbName = "Cat_Delete_TestDB_" + Guid.NewGuid().ToString("N");
            var options = new DbContextOptionsBuilder<RobotManagerContext>()
                .UseInMemoryDatabase(uniqueDbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new RobotManagerContext(options);
            _controller = new CompartmentCategoriesController(_context);

            SeedData();
        }

        private void SeedData()
        {
            // Danh mục không có ngăn chứa → được phép xóa
            var emptyCat1 = new CompartmentCategory { Id = 100, Name = "Danh mục trống 1" };
            var emptyCat2 = new CompartmentCategory { Id = 200, Name = "Danh mục trống 2" };

            // Danh mục có ngăn chứa → KHÔNG được phép xóa
            var usedCat = new CompartmentCategory { Id = 300, Name = "Danh mục đang dùng" };

            _context.CompartmentCategories.AddRange(emptyCat1, emptyCat2, usedCat);

            // 3 ngăn chứa thuộc danh mục Id = 300
            _context.RobotCompartments.AddRange(
                new RobotCompartment { Id = 1, RobotId = 999, CompartmentCode = "X1", Status = "unlocked", IsActive = true, CategoryId = 300 },
                new RobotCompartment { Id = 2, RobotId = 999, CompartmentCode = "X2", Status = "locked", IsActive = true, CategoryId = 300 },
                new RobotCompartment { Id = 3, RobotId = 888, CompartmentCode = "Y1", Status = "unlocked", IsActive = false, CategoryId = 300 }
            );

            _context.SaveChanges();
        }

        private string GetMessage(object? value)
            => value?.GetType().GetProperty("message")?.GetValue(value)?.ToString() ?? string.Empty;

        // ====================================================================
        // ========================== 15 TEST CASES ===========================
        // ====================================================================

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC01_ExistingEmptyId_Returns200Ok()
        {
            var actionResult = await _controller.Delete(100);
            Assert.IsType<OkObjectResult>(actionResult);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC02_ExistingEmptyId_ReturnsSuccessMessage()
        {
            var actionResult = await _controller.Delete(100);
            var ok = Assert.IsType<OkObjectResult>(actionResult);
            var message = GetMessage(ok.Value);
            Assert.Equal("Đã xóa danh mục ngăn chứa thành công.", message);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC03_ExistingEmptyId_RecordActuallyDeleted()
        {
            await _controller.Delete(200);
            var exists = await _context.CompartmentCategories.AnyAsync(c => c.Id == 200);
            Assert.False(exists);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC04_UsedCategory_ReturnsBadRequest()
        {
            var actionResult = await _controller.Delete(300);
            Assert.IsType<BadRequestObjectResult>(actionResult);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC05_UsedCategory_ReturnsCorrectErrorMessage()
        {
            var actionResult = await _controller.Delete(300);
            var bad = Assert.IsType<BadRequestObjectResult>(actionResult);
            var message = GetMessage(bad.Value);
            Assert.Equal("Không thể xóa danh mục này vì đang có ngăn chứa robot sử dụng.", message);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC06_NonExistingId_ReturnsNotFound()
        {
            var actionResult = await _controller.Delete(999999);
            Assert.IsType<NotFoundObjectResult>(actionResult);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC07_NotFoundMessageCorrect()
        {
            var actionResult = await _controller.Delete(999999);
            var notFound = Assert.IsType<NotFoundObjectResult>(actionResult);
            var message = GetMessage(notFound.Value);
            Assert.Equal("Không tìm thấy danh mục ngăn chứa có Id = 999999", message);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC08_IdZero_ReturnsNotFound()
        {
            var actionResult = await _controller.Delete(0);
            Assert.IsType<NotFoundObjectResult>(actionResult);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC09_DeleteTwice_FirstSuccessSecondNotFound()
        {
            await _controller.Delete(100);
            var second = await _controller.Delete(100);
            Assert.IsType<NotFoundObjectResult>(second);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC10_DeleteEmptyCategory_OtherCategoriesUnaffected()
        {
            await _controller.Delete(100);
            var cat200 = await _context.CompartmentCategories.FindAsync(200UL);
            var cat300 = await _context.CompartmentCategories.FindAsync(300UL);
            Assert.NotNull(cat200);
            Assert.NotNull(cat300);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC11_DeleteEmptyCategory_CompartmentsCountUnchanged()
        {
            var beforeCount = await _context.RobotCompartments.CountAsync();
            await _controller.Delete(100);
            var afterCount = await _context.RobotCompartments.CountAsync();
            Assert.Equal(beforeCount, afterCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC12_DeleteUsedCategory_CompartmentsStillExist()
        {
            await _controller.Delete(300); // sẽ trả BadRequest, không xóa
            var count = await _context.RobotCompartments.CountAsync(c => c.CategoryId == 300);
            Assert.Equal(3, count);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC13_NoExceptionOnValidDelete()
        {
            await _controller.Delete(200);
            Assert.True(true);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC14_NoExceptionOnInvalidDelete()
        {
            await _controller.Delete(999);
            Assert.True(true);
        }

        [Fact]
        public async System.Threading.Tasks.Task Delete_TC15_PerformanceFast_Under200ms()
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            await _controller.Delete(100);
            sw.Stop();
            Assert.True(sw.ElapsedMilliseconds < 200, $"Thực tế: {sw.ElapsedMilliseconds}ms");
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context?.Dispose();
        }
    }
}