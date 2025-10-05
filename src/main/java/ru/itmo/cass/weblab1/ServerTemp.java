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
import java.util.Locale;
import java.util.Map;

public class ServerTemp {
    private static final String JSON_RESPONSE_TEMPLATE =
            "{\"x\":%.2f, \"y\":%.2f, \"r\":%.2f, \"hit\":%b, \"currentTime\":\"%s\", \"executionTime\":%.4f}";
    private static final String DATE_TIME_FORMAT_PATTERN = "yyyy-MM-dd HH:mm:ss";
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern(DATE_TIME_FORMAT_PATTERN);
    public static void main(String[] args) {
        var fcgi = new FCGIInterface();

        System.err.println("Server started <3");

        while (fcgi.FCGIaccept() >= 0) {
            handleRequest();
        }
    }

    private static void handleRequest() {
        long startTime = System.nanoTime();

        try {
            String postData = readPostData();
            Map<String, String> params = parseQuery(postData);
            double x = Double.parseDouble(params.get("x"));
            double y = Double.parseDouble(params.get("y"));
            double r = Double.parseDouble(params.get("r"));
            boolean hit = checkHit(x, y, r);
            String currentTime = LocalDateTime.now().format(DATE_TIME_FORMATTER);
            double executionTimeMs = (double)(System.nanoTime() - startTime) / 1_000_000.0;
            sendSuccessResponse(x, y, r, hit, currentTime, executionTimeMs);
        } catch (Exception e) {
            double executionTimeMs = (System.nanoTime() - startTime) / 1_000_000.0;
            sendErrorResponse(e, executionTimeMs);
        } finally {
            System.out.flush();
        }
    }
    private static String readPostData() throws IOException {
        int contentLength = Integer.parseInt(System.getProperties().getProperty("CONTENT_LENGTH", "0"));
        if (contentLength <= 0) {
            throw new IllegalArgumentException("No POST data received or Content-Length is zero.");
        }
        try (Reader in = new InputStreamReader(System.in, StandardCharsets.UTF_8)) {
            char[] buffer = new char[contentLength];
            int totalBytesRead = 0;
            while (totalBytesRead < contentLength) {
                int bytesRead = in.read(buffer, totalBytesRead, contentLength - totalBytesRead);
                if (bytesRead == -1) {
                    break;
                }
                totalBytesRead += bytesRead;
            }
            return new String(buffer, 0, totalBytesRead);
        }
    }
    private static void sendSuccessResponse(double x, double y, double r, boolean hit, String currentTime, double executionTimeMs) {
        String jsonBody = String.format(Locale.US,
                JSON_RESPONSE_TEMPLATE,
                x, y, r, hit, currentTime, executionTimeMs
        );

        String cgiResponse = "Content-Type: application/json\r\n" +
                "\r\n" +
                jsonBody;

        System.out.print(cgiResponse);
    }
    private static void sendErrorResponse(Exception e, double executionTimeMs) {
        String reason = e.getMessage() != null ? e.getMessage() : "Invalid or missing parameters.";
        String jsonBody = String.format(Locale.US, "{\"error\":\"%s\", \"executionTime\":%.4f}", reason, executionTimeMs);

        String cgiErrorResponse = "Status: 400 Bad Request\r\n" +
                "Content-Type: application/json\r\n" +
                "\r\n" +
                jsonBody;

        System.out.print(cgiErrorResponse);
    }
    private static boolean checkHit(double x, double y, double r) {
        if (x >= 0 && y >= 0) {
            return y <= (-2 * x + r);
        }
        if (x <= 0 && y <= 0) {
            return (x * x + y * y) <= (r * r);
        }

        if (x >= 0 && y <= 0) {
            return (x<= r/2) && y >= -r;
        }

        return false;
    }


    private static Map<String, String> parseQuery(String qs) throws UnsupportedEncodingException {
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
}