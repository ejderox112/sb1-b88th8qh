package com.example;

public class Utils {
    public static String greet(String name) {
        return "Hello, " + (name == null ? "world" : name) + " from Java 17 module";
    }
}
