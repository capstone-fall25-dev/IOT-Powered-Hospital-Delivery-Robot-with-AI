using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Powered_Hospital_Delivery_Robot.Migrations
{
    /// <inheritdoc />
    public partial class AddIsActiveToCompartmentCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<ulong>(
                name: "patient_id",
                table: "task_stops",
                type: "bigint unsigned",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_task_stops_patient_id",
                table: "task_stops",
                column: "patient_id");

            migrationBuilder.AddForeignKey(
                name: "FK_task_stops_patients_patient_id",
                table: "task_stops",
                column: "patient_id",
                principalTable: "patients",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_task_stops_patients_patient_id",
                table: "task_stops");

            migrationBuilder.DropIndex(
                name: "IX_task_stops_patient_id",
                table: "task_stops");

            migrationBuilder.DropColumn(
                name: "patient_id",
                table: "task_stops");
        }
    }
}
