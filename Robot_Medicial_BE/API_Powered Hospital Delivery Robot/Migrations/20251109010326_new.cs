using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Powered_Hospital_Delivery_Robot.Migrations
{
    /// <inheritdoc />
    public partial class @new : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<float>(
                name: "x_coordinate",
                table: "destinations",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "y_coordinate",
                table: "destinations",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "x_coordinate",
                table: "destinations");

            migrationBuilder.DropColumn(
                name: "y_coordinate",
                table: "destinations");
        }
    }
}
