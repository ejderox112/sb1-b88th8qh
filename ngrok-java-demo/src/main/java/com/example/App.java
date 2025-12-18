package com.example;

import com.ngrok.Session;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;

public class App {
    public static void main(final String[] args) throws IOException {
        // TODO: Replace YOUR_NGROK_TOKEN_HERE with your actual token from https://dashboard.ngrok.com/get-started/your-authtoken
        // Enable pooling so multiple endpoints can be online simultaneously.
        final var sessionBuilder = Session.withAuthtoken("36wkiT8SIgD2oSuR4brIbnkOJEv_89Zar3HeSpT35p1Jckrk9")
            .poolingEnabled(true)
            .metadata("my session");
        final Charset utf8 = Charset.forName("UTF-8");

        try (final var session = sessionBuilder.connect()) {
            final var listenerBuilder = session.httpEndpoint().metadata("my listener");

            try (final var listener = listenerBuilder.listen()) {
                System.out.println("ngrok url: " + listener.getUrl());
                final var buf = ByteBuffer.allocateDirect(1024);

                while (true) {
                    final var conn = listener.accept();
                    buf.clear();
                    conn.read(buf);
                    System.out.println(utf8.decode(buf));

                    buf.clear();
                    buf.put("HTTP/1.0 200 OK\n\nHello from ngrok!".getBytes(utf8));
                    buf.flip();
                    conn.write(buf);
                    conn.close();
                }
            }
        }
    }
}
