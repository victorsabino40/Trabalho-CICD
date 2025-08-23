# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /usr/src/app
COPY pom.xml ./
RUN mvn -q -e -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -e -DskipTests package

# Run stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /usr/src/app/target/classes /app/classes
COPY --from=build /root/.m2/repository /app/m2repo
EXPOSE 8080 9095
ENV CLASSPATH=/app/classes:/app/m2repo/**
CMD ["java","EstoqueServer"]
