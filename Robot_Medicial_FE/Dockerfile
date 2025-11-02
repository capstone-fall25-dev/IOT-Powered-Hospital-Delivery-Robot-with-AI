# ================================
# Build stage
# ================================
FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install
RUN bun dev

# ================================
# Serve stage
# ================================
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
