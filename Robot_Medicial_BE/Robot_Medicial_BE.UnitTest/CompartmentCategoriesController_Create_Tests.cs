using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Dynamic;
using Xunit;

namespace Robot_Medicial_BE.UnitTest.Controllers
{
    public class CompartmentCategoriesController_Create_Tests : IDisposable
    {
        private readonly RobotManagerContext _context = null!;
        private CompartmentCategoriesController _controller = null!;

        public CompartmentCategoriesController_Create_Tests()
        {
            var uniqueDbName = "Cat_Create_TestDB_" + Guid.NewGuid().ToString("N");
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
            _context.CompartmentCategories.AddRange(
                new CompartmentCategory { Id = 1, Name = "Thuốc viên", Description = "Viên nén" },
                new CompartmentCategory { Id = 2, Name = "Thuốc nước", Description = "Siro" }
            );
            _context.SaveChanges();
        }

        private dynamic ToExpando(object? obj)
        {
            if (obj == null) return null!;
            var expando = new ExpandoObject();
            var dict = (IDictionary<string, object?>)expando;
            foreach (var prop in obj.GetType().GetProperties())
                dict.Add(prop.Name, prop.GetValue(obj));
            return expando;
        }

        private string GetMessage(object? value)
            => value?.GetType().GetProperty("message")?.GetValue(value)?.ToString() ?? string.Empty;

        // SỬA CHỖ NÀY: await result.Result thay vì result.ExecuteResult
        private ActionResult GetActionResult(System.Threading.Tasks.Task <ActionResult>  Result)
            =>  Result.Result;

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC01_ValidDto_Returns201Created()
        {
            var dto = new CompartmentCategoryCreateDto
            {
                Name = "Ống truyền dịch",
                Description = "Túi dịch truyền"
            };

            var result = await _controller.Create(dto);
            var actionResult = result;

            var created = Assert.IsType<CreatedAtActionResult>(actionResult);
            Assert.Equal("GetById", created.ActionName);
            Assert.NotNull(created.RouteValues?["id"]);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC02_ValidDto_NameIsTrimmed()
        {
            var dto = new CompartmentCategoryCreateDto
            {
                Name = " Bơm kim tiêm ",
                Description = " Kim tiêm vô trùng "
            };

            var result = await _controller.Create(dto);
            var created = Assert.IsType<CreatedAtActionResult>(result);
            dynamic data = ToExpando(created.Value);

            Assert.Equal("Bơm kim tiêm", (string)data.Name);
            Assert.Equal("Kim tiêm vô trùng", (string)data.Description);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC03_DuplicateName_ReturnsConflict()
        {
            var dto = new CompartmentCategoryCreateDto { Name = " Thuốc viên " };

            var result = await _controller.Create(dto);
            var conflict = Assert.IsType<ConflictObjectResult>(result);
            var message = GetMessage(conflict.Value);
            Assert.Equal("Danh mục 'Thuốc viên' đã tồn tại.", message);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC04_EmptyName_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryCreateDto { Name = "" };
            var result = await _controller.Create(dto);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC05_NullName_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryCreateDto { Name = null! };
            var result = await _controller.Create(dto);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC06_NameTooShort_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryCreateDto { Name = "A" };
            var result = await _controller.Create(dto);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC07_NameExactly100Chars_Accepted()
        {
            var longName = new string('A', 100);
            var dto = new CompartmentCategoryCreateDto { Name = longName };
            var result = await _controller.Create(dto);
            Assert.IsType<CreatedAtActionResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC08_Name101Chars_Rejected()
        {
            var longName = new string('A', 101);
            var dto = new CompartmentCategoryCreateDto { Name = longName };
            var result = await _controller.Create(dto);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC09_Description500Chars_Accepted()
        {
            var longDesc = new string('X', 500);
            var dto = new CompartmentCategoryCreateDto { Name = "Test", Description = longDesc };
            var result = await _controller.Create(dto);
            Assert.IsType<CreatedAtActionResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC10_SpacesOnlyName_Rejected()
        {
            var dto = new CompartmentCategoryCreateDto { Name = "   " };
            var result = await _controller.Create(dto);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC11_RecordActuallySavedInDb()
        {
            var dto = new CompartmentCategoryCreateDto { Name = "New Cat" };
            await _controller.Create(dto);
            var count = await _context.CompartmentCategories.CountAsync();
            Assert.Equal(3, count); // 2 cũ + 1 mới
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC12_ReturnedObjectHasIdNameDescription()
        {
            var dto = new CompartmentCategoryCreateDto { Name = "Test Return" };
            var result = await _controller.Create(dto);
            var created = Assert.IsType<CreatedAtActionResult>(result);
            dynamic data = ToExpando(created.Value);
            Assert.True((ulong)data.Id > 0);
            Assert.Equal("Test Return", (string)data.Name);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC13_IdAutoIncrement_Correct()
        {
            await _controller.Create(new CompartmentCategoryCreateDto { Name = "Cat1" });
            await _controller.Create(new CompartmentCategoryCreateDto { Name = "Cat2" });
            var last = await _context.CompartmentCategories.OrderByDescending(c => c.Id).FirstAsync();
            Assert.Equal(4UL, last.Id);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC14_NoExceptionOnValidData()
        {
            var dto = new CompartmentCategoryCreateDto { Name = "Safe" };
            await _controller.Create(dto);
            Assert.True(true);
        }

        [Fact]
        public async System.Threading.Tasks.Task  Create_TC15_PerformanceFast_Under300ms()
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            await _controller.Create(new CompartmentCategoryCreateDto { Name = "Fast" });
            sw.Stop();
            Assert.True(sw.ElapsedMilliseconds < 300);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context?.Dispose();
        }
    }
}