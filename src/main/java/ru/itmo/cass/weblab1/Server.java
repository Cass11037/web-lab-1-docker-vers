package ru.itmo.cass.weblab1;

import com.fastcgi.FCGIInterface;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

public class Server {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");
    public static void main(String[] args) {
        var fcgi = new FCGIInterface();
        System.err.println("FastCGI Server started <3");
        while (fcgi.FCGIaccept() >= 0) {
            handleRequest();
        }
    }

    private static void handleRequest() {
        long startTime = System.nanoTime();
        try {

            String postData = readPostData();

            Map<String, String> params = parseQueryString(postData);

            double x = Double.parseDouble(params.get("x"));
            double y = Double.parseDouble(params.get("y"));
            double r = Double.parseDouble(params.get("r"));

            boolean hit = checkHit(x, y, r);
            long executionTime = (System.nanoTime() - startTime) / 1_000_000;
            String currentTime = LocalDateTime.now().format((DATE_TIME_FORMATTER));
            sendSuccessResponse(x,y,r,hit,currentTime,executionTime);

        } catch (Exception e) {
            long executionTime = (System.nanoTime() - startTime) / 1_000_000;
            String reason = e.getMessage() != null ? e.getMessage() : "Invalid or missing parameters.";

            String jsonBody = String.format(
                    "{\"error\":\"%s\", \"executionTime\":%d}",
                    reason, executionTime
            );

            String cgiErrorResponse = "Status: 400 Bad Request\r\n" +
                    "Content-Type: application/json\r\n" +
                    "\r\n" +
                    jsonBody;

            System.out.print(cgiErrorResponse);
        } finally {
            System.out.flush();
        }
    }
    private static String readPostData() throws IOException {
        int contentLength = Integer.parseInt(System.getProperties().getProperty("CONTENT_LENGTH", "0"));

        if (contentLength <= 0) {
            throw new IllegalArgumentException("No POST data received.");
        }

        Reader in = new InputStreamReader(System.in, StandardCharsets.UTF_8);
        char[] buffer = new char[contentLength];
        in.read(buffer);
        return new String(buffer);
    }
    private static boolean checkHit(double x, double y, double r) {
        // 1-я четверть (ПРЯМОУГОЛЬНИК по SVG)
        if (x >= 0 && y >= 0) {
            return x <= (r / 2) && y <= r;
        }
        // 2-я четверть (ПУСТО)
        else if (x < 0 && y > 0) {
            return false;
        }
        // 3-я четверть (ЧЕТВЕРТЬ КРУГА по SVG)
        else if (x <= 0 && y <= 0) {
            return (x * x + y * y) <= (r * r);
        }
        // 4-я четверть (ТРЕУГОЛЬНИК по SVG)
        else if (x >= 0 && y <= 0) {
            // Гипотенуза проходит через точки (r/2, 0) и (0, -r).
            // Уравнение этой прямой: y = 2x - r.
            // Нам нужна область НАД этой линией.
            return y >= (2 * x - r);
        }

        // На случай, если точка не попала ни в одну из областей
        return false;
    }
    private static Map<String, String> parseQueryString(String qs) throws UnsupportedEncodingException {
        Map<String, String> result = new HashMap<>();
        if (qs == null || qs.isEmpty()) {
            return result;
        }
        for (String param : qs.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length > 1 && !pair[1].isEmpty()) {
                result.put(URLDecoder.decode(pair[0], "UTF-8"), URLDecoder.decode(pair[1], "UTF-8"));
            }
        }
        return result;
    }
    private static void sendSuccessResponse(double x, double y, double r, boolean hit, String currentTime, long executionTime) {
        String jsonBody = String.format(
                "{\"x\":%.2f, \"y\":%.2f, \"r\":%.2f, \"hit\":%b, \"currentTime\":\"%s\", \"executionTime\":%d}",
                x, y, r, hit, currentTime, executionTime
        );

        String cgiResponse = "Content-Type: application/json\r\n" +
                "\r\n" +
                jsonBody;

        System.out.print(cgiResponse);
    }
}