package com.example;

public class EchoHandler {
    public static String handle(String input) {
        return "Echo: " + (input == null ? "" : input);
    }
}
