# ngrok-java-demo

Run a tiny Java app that opens an ngrok HTTP endpoint using NGROK_AUTHTOKEN from the environment.

## Prerequisites
- JDK 17+ on PATH (`java -version`)
- Maven 3.8+ on PATH (`mvn -v`)
- NGROK_AUTHTOKEN set (temporary or persistent)

## Quick start (PowerShell)
```powershell
# 1) Set your authtoken for this session
$env:NGROK_AUTHTOKEN="<YOUR_NGROK_AUTHTOKEN>"

# 2) Build and run
cd ngrok-java-demo
mvn -q -e -DskipTests exec:java
```

You should see output like:
```
ngrok url: https://<random>.ngrok-free.app
```
Open that URL in a browser to hit the in-memory listener. The console prints the request and replies with "Hello from ngrok!".

## Notes
- To make the token persistent across new shells:
```powershell
setx NGROK_AUTHTOKEN "<YOUR_NGROK_AUTHTOKEN>"
```
- If you prefer a packaged jar:
```powershell
mvn -q -DskipTests package
java -cp target/ngrok-java-demo-1.0.0.jar;"%USERPROFILE%\.m2\repository\com\ngrok\ngrok-java\1.1.1\ngrok-java-1.1.1.jar" com.example.App
```