using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddShippingInfoToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Stores_PrestataireId",
                table: "Stores");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_PrestataireId",
                table: "Stores",
                column: "PrestataireId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Stores_PrestataireId",
                table: "Stores");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_PrestataireId",
                table: "Stores",
                column: "PrestataireId");
        }
    }
}
