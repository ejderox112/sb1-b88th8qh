package com.example;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class App {
    public static void main(final String[] args) throws IOException {
        System.out.println("Starting simple HTTP server on port 8080");
        try (final var server = new ServerSocket(8080)) {
            while (true) {
                try (Socket socket = server.accept()) {
                    BufferedWriter out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));
                    out.write("HTTP/1.1 200 OK\r\n");
                    out.write("Content-Type: text/plain; charset=utf-8\r\n");
                    out.write("Content-Length: 18\r\n");
                    out.write("\r\n");
                    out.write("Hello from Java 21\n");
                    out.flush();
                } catch (IOException e) {
                    System.err.println("Connection handling failed: " + e.getMessage());
                }
            }
        }
    }
}
