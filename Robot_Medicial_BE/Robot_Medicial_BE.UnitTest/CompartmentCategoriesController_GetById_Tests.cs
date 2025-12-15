using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Dynamic;
using Xunit;

namespace Robot_Medicial_BE.UnitTest.Controllers
{

    public class CompartmentCategoriesController_GetById_Tests : IDisposable
    {
        // ====================================================================
        // ========================= CÁC TRƯỜNG PRIVATE ========================
        // ====================================================================
        private readonly RobotManagerContext _context = null!;
        private CompartmentCategoriesController _controller = null!;

        // ====================================================================
        // =========================== CONSTRUCTOR ============================
        // ====================================================================
        /// <summary>
        /// Constructor: Khởi tạo InMemory Database và Controller
        /// Tạo tên DB duy nhất để tránh xung đột
        /// </summary>
        public CompartmentCategoriesController_GetById_Tests()
        {
            // Tạo tên database duy nhất cho mỗi lần chạy test
            var uniqueDatabaseName = "CompartmentCategories_GetById_TestDB_" + Guid.NewGuid().ToString("N");

            // Cấu hình DbContext dùng InMemoryDatabase
            var options = new DbContextOptionsBuilder<RobotManagerContext>()
                .UseInMemoryDatabase(databaseName: uniqueDatabaseName)
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            // Khởi tạo context
            _context = new RobotManagerContext(options);

            // Khởi tạo controller
            _controller = new CompartmentCategoriesController(_context);

            // Seed dữ liệu chuẩn bị cho tất cả test case
            SeedData();
        }

        // ====================================================================
        // ========================== HÀM SEED DATA ===========================
        // ====================================================================
        /// <summary>
        /// Hàm tạo dữ liệu mẫu cho toàn bộ test suite
        /// Tạo 3 danh mục với số lượng ngăn chứa khác nhau:
        /// - Id 10: "Thuốc viên" → 3 ngăn
        /// - Id 20: "Bơm kim tiêm" → 0 ngăn, Description = null
        /// - Id 30: "Ống truyền dịch" → 1 ngăn
        /// </summary>
        private void SeedData()
        {
            // --------------------- Tạo danh mục ---------------------
            var categoryList = new[]
            {
                new CompartmentCategory
                {
                    Id = 10,
                    Name = "Thuốc viên",
                    Description = "Dạng viên nén, viên nang cứng"
                },
                new CompartmentCategory
                {
                    Id = 20,
                    Name = "Bơm kim tiêm",
                    Description = null // cố tình null để test
                },
                new CompartmentCategory
                {
                    Id = 30,
                    Name = "Ống truyền dịch",
                    Description = "Túi dịch truyền tĩnh mạch"
                }
            };

            // --------------------- Tạo ngăn chứa ---------------------
            var compartmentList = new[]
            {
                // 3 ngăn cho danh mục Id = 10
                new RobotCompartment { Id = 1, RobotId = 101, CompartmentCode = "A1", Status = "unlocked", IsActive = true, CategoryId = 10 },
                new RobotCompartment { Id = 2, RobotId = 102, CompartmentCode = "A2", Status = "unlocked", IsActive = true, CategoryId = 10 },
                new RobotCompartment { Id = 3, RobotId = 103, CompartmentCode = "A3", Status = "locked",   IsActive = true, CategoryId = 10 },
                
                // 1 ngăn cho danh mục Id = 30
                new RobotCompartment { Id = 4, RobotId = 104, CompartmentCode = "D1", Status = "unlocked", IsActive = true, CategoryId = 30 }
            };

            // Thêm vào context và lưu
            _context.CompartmentCategories.AddRange(categoryList);
            _context.RobotCompartments.AddRange(compartmentList);
            _context.SaveChanges();
        }

        // ====================================================================
        // ======================= HÀM HỖ TRỢ GET MESSAGE ======================
        // ====================================================================
        /// <summary>
        /// Hàm hỗ trợ lấy message từ object trả về (NotFound, BadRequest, v.v.)
        /// Dùng reflection để tìm property "message" hoặc "Message"
        /// </summary>
        private string GetMessageFromResult(object? value)
        {
            if (value == null) return string.Empty;
            var type = value.GetType();
            var messageProperty = type.GetProperty("message") ?? type.GetProperty("Message");
            if (messageProperty != null)
            {
                var msg = messageProperty.GetValue(value);
                return msg?.ToString() ?? string.Empty;
            }
            return value.ToString() ?? string.Empty;
        }

        // ====================================================================
        // ===================== HÀM SIÊU QUAN TRỌNG: FIX RUNTIME BINDER =======
        // ====================================================================
        /// <summary>
        /// Chuyển anonymous object thành ExpandoObject để dynamic hoạt động
        /// Đây là cách duy nhất để dynamic truy cập được property của anonymous type
        /// </summary>
        private dynamic ToExpando(object? obj)
        {
            if (obj == null) return null!;

            var expando = new ExpandoObject();
            var dictionary = (IDictionary<string, object?>)expando;

            foreach (var property in obj.GetType().GetProperties())
            {
                dictionary.Add(property.Name, property.GetValue(obj));
            }

            return expando;
        }

        // ====================================================================
        // ========================== 15 TEST CASES ĐÃ SỬA 100% XANH ============
        // ====================================================================

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC01_ExistingId10_ReturnsOkObjectResult()
        {
            var result = await _controller.GetById(10);
            Assert.IsType<OkObjectResult>(result.Result);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC02_ExistingId10_ReturnsCorrectId()
        {
            var result = await _controller.GetById(10);
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            dynamic data = ToExpando(okResult.Value);
            Assert.Equal(10UL, (ulong)data.Id);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC03_ExistingId10_ReturnsCorrectName()
        {
            var result = await _controller.GetById(10);
            dynamic data = ToExpando(((OkObjectResult)result.Result!).Value);
            Assert.Equal("Thuốc viên", (string)data.Name);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC04_ExistingId10_ReturnsCorrectDescription()
        {
            var result = await _controller.GetById(10);
            dynamic data = ToExpando(((OkObjectResult)result.Result!).Value);
            Assert.Equal("Dạng viên nén, viên nang cứng", (string)data.Description);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC05_ExistingId10_ReturnsCount3()
        {
            var result = await _controller.GetById(10);
            dynamic data = ToExpando(((OkObjectResult)result.Result!).Value);
            Assert.Equal(3, (int)data.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC06_NonExistingId999_ReturnsNotFound()
        {
            var result = await _controller.GetById(999);
            Assert.IsType<NotFoundObjectResult>(result.Result);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC07_NotFoundMessageContainsId999()
        {
            var result = await _controller.GetById(999);
            var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
            var message = GetMessageFromResult(notFound.Value);
            Assert.Equal("Không tìm thấy danh mục ngăn chứa có Id = 999", message);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC08_Id20_ReturnsNullDescription()
        {
            var result = await _controller.GetById(20);
            dynamic data = ToExpando(((OkObjectResult)result.Result!).Value);
            Assert.Null(data.Description);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC09_Id20_ReturnsCount0()
        {
            var result = await _controller.GetById(20);
            dynamic data = ToExpando(((OkObjectResult)result.Result!).Value);
            Assert.Equal(0, (int)data.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC10_Id30_ReturnsCount1()
        {
            var result = await _controller.GetById(30);
            dynamic data = ToExpando(((OkObjectResult)result.Result!).Value);
            Assert.Equal(1, (int)data.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC11_Id0_ReturnsNotFound()
        {
            var result = await _controller.GetById(0);
            Assert.IsType<NotFoundObjectResult>(result.Result);
        }

        

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC12_VeryLargeId_ReturnsNotFound()
        {
            var result = await _controller.GetById(999999999UL);
            Assert.IsType<NotFoundObjectResult>(result.Result);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC13_ReturnsExactlyFourProperties()
        {
            var result = await _controller.GetById(10);
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            // Lấy properties từ object gốc (anonymous type) trước khi convert sang ExpandoObject
            var originalObject = okResult.Value;
            var properties = originalObject?.GetType().GetProperties() ?? Array.Empty<System.Reflection.PropertyInfo>();
            Assert.Equal(4, properties.Length);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC14_MultipleCallsSameId_ReturnsSameResult()
        {
            var r1 = await _controller.GetById(10);
            var r2 = await _controller.GetById(10);
            var v1 = ((OkObjectResult)r1.Result!).Value?.ToString();
            var v2 = ((OkObjectResult)r2.Result!).Value?.ToString();
            Assert.Equal(v1, v2);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_TC15_PerformanceFast_Under200ms()
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            await _controller.GetById(10);
            sw.Stop();
            Assert.True(sw.ElapsedMilliseconds < 200, $"Thực tế: {sw.ElapsedMilliseconds}ms");
        }

        // ====================================================================
        // ============================ DISPOSE ===============================
        // ====================================================================
        /// <summary>
        /// Dọn dẹp tài nguyên sau khi test xong
        /// </summary>
        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context?.Dispose();
        }
    }
}