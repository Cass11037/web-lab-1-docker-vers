# ЭТАП 1: СБОРКА
FROM gradle:8.10-jdk17 AS build
# Исправлено: копируем текущую папку, а не родительскую
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle jar --no-daemon

# ЭТАП 2: ЗАПУСК
FROM eclipse-temurin:17-jre
EXPOSE 1337
RUN mkdir /app
WORKDIR /app
COPY --from=build /home/gradle/src/build/libs/*.jar /app/app.jar
ENTRYPOINT ["java", "-cp", "app.jar", "ru.itmo.sludnaya.weblab1.Server"]