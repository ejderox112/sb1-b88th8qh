@echo off
REM Set ngrok authtoken for this process and run the demo
set NGROK_AUTHTOKEN=36wkiT8SIgD2oSuR4brIbnkOJEv_89Zar3HeSpT35p1Jckrk9
set NGROK_AUTHTOKEN=36wkiT8SIgD2oSuR4brIbnkOJEv_89Zar3HeSpT35p1Jckrk9
set NGROK_POOLING_ENABLED=true
java -cp "ngrok-java-demo/out;ngrok-java-demo/libs/*" com.example.App --pooling-enabled
pause
