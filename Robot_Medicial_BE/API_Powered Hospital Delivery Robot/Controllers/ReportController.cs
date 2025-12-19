using API_Powered_Hospital_Delivery_Robot.Helpers;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;

namespace RobotManagerApi.Controllers
{
    /// <summary>
    /// Quản lý báo cáo nhiệm vụ và xuất Excel
    /// </summary>
    [ApiController]
    [Route("api/report")]
    public class ReportController : ControllerBase
    {
        private readonly string _connectionString = "Server=160.187.229.40;Port=3306;Database=robotmanager;Uid=root;Pwd=1239;";

        /// <summary>
        /// Báo cáo nhiệm vụ theo trạng thái và lọc theo ngày (có thể xuất Excel)
        /// </summary>
        [HttpGet("task-status-dynamic")]
        public async Task<IActionResult> GetTaskStatusReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] bool exportExcel = false)
        {
            var whereClause = "";
            var parameters = new List<MySqlParameter>();

            if (fromDate.HasValue || toDate.HasValue)
            {
                var conditions = new List<string>();
                if (fromDate.HasValue)
                {
                    conditions.Add("t.created_at >= @fromDate");
                    parameters.Add(new MySqlParameter("@fromDate", fromDate.Value.Date));
                }
                if (toDate.HasValue)
                {
                    conditions.Add("t.created_at < @toDate");
                    parameters.Add(new MySqlParameter("@toDate", toDate.Value.Date.AddDays(1)));
                }
                whereClause = "WHERE " + string.Join(" AND ", conditions);
            }

            var sql = $@"
                SELECT
                    COALESCE(r.code, 'TỔNG CỘNG') AS Robot,
                    t.status AS Status,
                    COUNT(*) AS TaskCount
                FROM robots r
                LEFT JOIN tasks t ON t.robot_id = r.id
                {whereClause}
                GROUP BY r.code, t.status

                UNION ALL

                SELECT
                    'TỔNG CỘNG' AS Robot,
                    status AS Status,
                    COUNT(*) AS TaskCount
                FROM tasks t
                {whereClause}
                GROUP BY status

                ORDER BY Robot = 'TỔNG CỘNG', Robot, Status";

            var rawData = new List<TaskStatusItem>();

            await using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new MySqlCommand(sql, conn);
            foreach (var p in parameters) cmd.Parameters.Add(p);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                rawData.Add(new TaskStatusItem
                {
                    Robot = reader.GetString(0),
                    Status = reader.IsDBNull(1) ? "unknown" : reader.GetString(1),
                    TaskCount = reader.GetInt32(2)
                });
            }

            var allStatuses = rawData
                .Select(x => x.Status)
                .Distinct()
                .OrderBy(x => x)
                .ToList();

            var pivotData = new List<Dictionary<string, object>>();
            var robots = rawData.Select(x => x.Robot).Distinct().ToList();

            foreach (var robot in robots)
            {
                var row = new Dictionary<string, object> { ["Robot"] = robot };
                int total = 0;
                foreach (var status in allStatuses)
                {
                    var count = rawData
                        .Where(x => x.Robot == robot && x.Status == status)
                        .Sum(x => x.TaskCount);
                    row[status] = count;
                    total += count;
                }
                row["Tổng task"] = total;
                pivotData.Add(row);
            }

            if (!exportExcel)
                return Ok(pivotData);

            // Xuất Excel - tên sheet dưới 31 ký tự
            using var workbook = new XLWorkbook();

            var fromStr = fromDate?.ToString("dd-MM-yyyy") ?? "all";
            var toStr = toDate?.ToString("dd-MM-yyyy") ?? "all";
            var sheetName = fromStr == toStr ? $"Status {fromStr}" : $"Status {fromStr}_to_{toStr}";
            if (sheetName.Length > 31) sheetName = sheetName.Substring(0, 31);

            var ws = workbook.Worksheets.Add(sheetName);

            ws.Cell(1, 1).Value = "Robot";
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Fill.BackgroundColor = XLColor.LightGreen;

            int col = 2;
            foreach (var status in allStatuses)
            {
                ws.Cell(1, col).Value = status;
                ws.Cell(1, col).Style.Font.Bold = true;
                ws.Cell(1, col).Style.Fill.BackgroundColor = XLColor.LightBlue;
                col++;
            }
            ws.Cell(1, col).Value = "Tổng task";
            ws.Cell(1, col).Style.Font.Bold = true;
            ws.Cell(1, col).Style.Fill.BackgroundColor = XLColor.Orange;

            int currentRow = 2;
            foreach (var item in pivotData)
            {
                ws.Cell(currentRow, 1).Value = XLCellValue.FromObject(item["Robot"]);
                col = 2;
                foreach (var status in allStatuses)
                {
                    var value = item.ContainsKey(status) ? item[status] : 0;
                    ws.Cell(currentRow, col).Value = XLCellValue.FromObject(value);
                    if ((int)value > 0) ws.Cell(currentRow, col).Style.Font.Bold = true;
                    col++;
                }
                ws.Cell(currentRow, col).Value = XLCellValue.FromObject(item["Tổng task"]);
                ws.Cell(currentRow, col).Style.Font.Bold = true;

                if (item["Robot"].ToString() == "TỔNG CỘNG")
                    ws.Row(currentRow).Style.Fill.BackgroundColor = XLColor.Yellow;

                currentRow++;
            }

            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            var fileName = $"Task_Status_{fromStr}_to_{toStr}_{DateTimeHelper.Now():yyyyMMdd_HHmmss}.xlsx";

            // Bắt buộc có dòng này để hiện Save As
            Response.Headers["Content-Disposition"] = $"attachment; filename=\"{fileName}\"";

            return File(stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }

        /// <summary>
        /// Báo cáo nhiệm vụ theo ngày và lọc theo khoảng thời gian (có thể xuất Excel)
        /// </summary>
        [HttpGet("task-timeline-dynamic")]
        public async Task<IActionResult> GetTaskTimelineReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] bool exportExcel = false)
        {
            var whereClause = "";
            var parameters = new List<MySqlParameter>();

            if (fromDate.HasValue || toDate.HasValue)
            {
                var conditions = new List<string>();
                if (fromDate.HasValue)
                {
                    conditions.Add("t.created_at >= @fromDate");
                    parameters.Add(new MySqlParameter("@fromDate", fromDate.Value.Date));
                }
                if (toDate.HasValue)
                {
                    conditions.Add("t.created_at < @toDate");
                    parameters.Add(new MySqlParameter("@toDate", toDate.Value.Date.AddDays(1)));
                }
                whereClause = "WHERE " + string.Join(" AND ", conditions);
            }

            var sql = $@"
                SELECT
                    COALESCE(r.code, 'TỔNG CỘNG') AS Robot,
                    DATE(t.created_at) AS TaskDate,
                    COUNT(*) AS TaskCount
                FROM robots r
                LEFT JOIN tasks t ON t.robot_id = r.id
                {whereClause}
                GROUP BY r.code, DATE(t.created_at)

                UNION ALL

                SELECT
                    'TỔNG CỘNG' AS Robot,
                    DATE(created_at) AS TaskDate,
                    COUNT(*) AS TaskCount
                FROM tasks t
                {whereClause}
                GROUP BY DATE(created_at)

                ORDER BY Robot = 'TỔNG CỘNG', Robot, TaskDate";

            var rawData = new List<TaskReportItem>();

            await using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new MySqlCommand(sql, conn);
            foreach (var p in parameters)
                cmd.Parameters.Add(p);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                rawData.Add(new TaskReportItem
                {
                    Robot = reader.GetString(0),
                    TaskDate = reader.IsDBNull(1) ? null : reader.GetDateTime(1),
                    TaskCount = reader.GetInt32(2)
                });
            }

            var allDates = rawData
                .Where(x => x.TaskDate.HasValue)
                .Select(x => x.TaskDate!.Value.ToString("yyyy-MM-dd"))
                .Distinct()
                .OrderBy(x => x)
                .ToList();

            var pivotData = new List<Dictionary<string, object>>();
            var robots = rawData.Select(x => x.Robot).Distinct().ToList();

            foreach (var robot in robots)
            {
                var row = new Dictionary<string, object> { ["Robot"] = robot };
                int total = 0;
                foreach (var date in allDates)
                {
                    var count = rawData
                        .Where(x => x.Robot == robot && x.TaskDate.HasValue &&
                                   x.TaskDate.Value.ToString("yyyy-MM-dd") == date)
                        .Sum(x => x.TaskCount);
                    row[date] = count;
                    total += count;
                }
                row["Tổng task"] = total;
                pivotData.Add(row);
            }

            if (!exportExcel)
                return Ok(pivotData);

            using var workbook = new XLWorkbook();

            var fromStr = fromDate?.ToString("dd-MM-yyyy") ?? "all";
            var toStr = toDate?.ToString("dd-MM-yyyy") ?? "all";
            var sheetName = fromStr == toStr ? $"Timeline {fromStr}" : $"Timeline {fromStr}_to_{toStr}";
            if (sheetName.Length > 31) sheetName = sheetName.Substring(0, 31);

            var ws = workbook.Worksheets.Add(sheetName);

            ws.Cell(1, 1).Value = "Robot";
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Fill.BackgroundColor = XLColor.LightGreen;

            int col = 2;
            foreach (var date in allDates)
            {
                ws.Cell(1, col).Value = date;
                ws.Cell(1, col).Style.Font.Bold = true;
                ws.Cell(1, col).Style.Fill.BackgroundColor = XLColor.LightBlue;
                col++;
            }
            ws.Cell(1, col).Value = "Tổng task";
            ws.Cell(1, col).Style.Font.Bold = true;
            ws.Cell(1, col).Style.Fill.BackgroundColor = XLColor.Orange;

            int currentRow = 2;
            foreach (var item in pivotData)
            {
                ws.Cell(currentRow, 1).Value = XLCellValue.FromObject(item["Robot"]);
                col = 2;
                foreach (var date in allDates)
                {
                    var value = item.ContainsKey(date) ? item[date] : 0;
                    ws.Cell(currentRow, col).Value = XLCellValue.FromObject(value);
                    if ((int)value > 0) ws.Cell(currentRow, col).Style.Font.Bold = true;
                    col++;
                }
                ws.Cell(currentRow, col).Value = XLCellValue.FromObject(item["Tổng task"]);
                ws.Cell(currentRow, col).Style.Font.Bold = true;

                if (item["Robot"].ToString() == "TỔNG CỘNG")
                    ws.Row(currentRow).Style.Fill.BackgroundColor = XLColor.Yellow;

                currentRow++;
            }

            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            var fileName = $"Task_Timeline_{fromStr}_to_{toStr}_{DateTimeHelper.Now():yyyyMMdd_HHmmss}.xlsx";

            // Bắt buộc có dòng này để hiện Save As
            Response.Headers["Content-Disposition"] = $"attachment; filename=\"{fileName}\"";

            return File(stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }

        /// <summary>
        /// Class hỗ trợ cho báo cáo trạng thái nhiệm vụ
        /// </summary>
        private class TaskStatusItem
        {
            public string Robot { get; set; } = "";
            public string Status { get; set; } = "";
            public int TaskCount { get; set; }
        }

        /// <summary>
        /// Class hỗ trợ cho báo cáo timeline nhiệm vụ
        /// </summary>
        private class TaskReportItem
        {
            public string Robot { get; set; } = "";
            public DateTime? TaskDate { get; set; }
            public int TaskCount { get; set; }
        }
    }
}