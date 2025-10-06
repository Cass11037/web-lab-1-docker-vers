
# ЭТАП 1: СБОРКА ФРОНТЕНДА (Node.js)
# Используем образ Node.js для установки npm-зависимостей и сборки клиента.
FROM node:20 AS frontend-builder

WORKDIR /app

# Копируем package.json и package-lock.json для кэширования зависимостей
COPY package*.json ./
RUN npm ci

# Копируем остальной исходный код фронтенда (папку src, конфиги)
COPY . .

# Запускаем скрипт сборки из package.json.
# Это создаст папку /app/dist с готовыми файлами.
RUN npm run build



# ЭТАП 2: СБОРКА БЭКЕНДА (Gradle)
# Собираем Java-приложение.

FROM gradle:8.10-jdk17 AS backend-builder

WORKDIR /home/gradle/src

# Копируем исходный код Java-проекта
COPY --chown=gradle:gradle . .

RUN rm -rf ./src/main/resources/static/*
# Копируем скомпилированный фронтенд из этапа 'frontend-builder'
# в папку статических ресурсов Gradle/Spring Boot.
# Теперь фронтенд будет упакован внутрь JAR-файла.
COPY --from=frontend-builder /app/build/dist ./src/main/resources/static/
RUN gradle jar --no-daemon



# ЭТАП 3: ФИНАЛЬНЫЙ ОБРАЗ ДЛЯ ЗАПУСКА
# Используем легковесный образ только со средой выполнения Java.
FROM eclipse-temurin:17-jre

EXPOSE 1337

RUN mkdir /app
WORKDIR /app
COPY --from=backend-builder /home/gradle/src/build/libs/*.jar /app/app.jar
ENTRYPOINT ["java", "-DFCGI_PORT=1337", "-jar", "app.jar"]

# ЭТАП 1: СБОРКА
#FROM gradle:8.10-jdk17 AS build
#COPY --chown=gradle:gradle . /home/gradle/src
#WORKDIR /home/gradle/src
#RUN gradle jar --no-daemon

# ЭТАП 2: ЗАПУСК
#FROM eclipse-temurin:17-jre
#EXPOSE 1337
#RUN mkdir /app
#WORKDIR /app
#COPY --from=build /home/gradle/src/build/libs/*.jar /app/app.jar
#ENTRYPOINT ["java", "-DFCGI_PORT=1337", "-jar", "app.jar"]