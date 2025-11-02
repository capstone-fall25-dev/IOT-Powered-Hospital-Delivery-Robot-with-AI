# ================================
# Build stage
# ================================
FROM oven/bun:1 AS build
WORKDIR /app

# Copy toàn bộ mã nguồn vào container
COPY . .

# Cài dependencies
RUN bun install
RUN bun run build

# ================================
# Serve stage
# ================================
FROM nginx:alpine

# Copy file build ra Nginx serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Mở cổng 80 cho web
EXPOSE 80

# Chạy nginx foreground
CMD ["nginx", "-g", "daemon off;"]
