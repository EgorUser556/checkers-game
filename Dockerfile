# --- Stage 1: Build frontend ---
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build backend ---
FROM maven:3.9-eclipse-temurin-17-alpine AS backend-build
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B
COPY backend/src ./src

# Copy frontend build into Spring Boot static resources
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static

RUN mvn package -DskipTests -B

# --- Stage 3: Runtime ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=backend-build /app/backend/target/*.jar app.jar

# Render sets PORT environment variable
ENV PORT=8080
EXPOSE 8080

CMD java -jar app.jar --server.port=$PORT
