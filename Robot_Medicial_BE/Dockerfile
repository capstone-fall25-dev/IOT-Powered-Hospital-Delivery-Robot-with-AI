# ================================
# Build Stage
# ================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy everything and restore dependencies
COPY . .
RUN dotnet restore "API_Powered Hospital Delivery Robot/API_Powered Hospital Delivery Robot.csproj"

# Build and publish release
RUN dotnet publish "API_Powered Hospital Delivery Robot/API_Powered Hospital Delivery Robot.csproj" -c Release -o /app/publish

# ================================
# Runtime Stage
# ================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 5000
ENTRYPOINT ["dotnet", "API_Powered Hospital Delivery Robot.dll"]
