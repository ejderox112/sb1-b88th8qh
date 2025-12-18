# Migration Plan

- Session ID: 4d488ca9-7b18-4377-98c1-6423d566c9be
- Created: 2025-12-18 21:46:02
- Target branch: `appmod/java-migration-20251218214602`
- Programming language: java

## Summary
Workspace contains two Maven modules/projects with `pom.xml` files:
- `java-service` (maven.compiler.source/target = 21)
- `ngrok-java-demo` (maven.compiler.source/target = 21)

Both projects already target Java 21 in their `pom.xml`.

## Files to change (initial)
- None required to change Java target — both `pom.xml` files already set to Java 21.
- Focus: ensure build environment uses JDK 21, run build and tests, validate dependencies and CVEs.

## Build environment
- Detected JDKs:
  - Java 1.8.0_472 — C:\Users\cocobongo\.jdk\jdk-8\bin
  - Java 17.0.17 — C:\jdk-17\jdk-17.0.17+10\bin
  - Java 21.0.8 — C:\Program Files\Android\Android Studio\jbr\bin
- Chosen JDK for migration: Java 21 at `C:\Program Files\Android\Android Studio\jbr` (existing). Need to ensure `JAVA_HOME` points to its parent (not `bin`).
- Need to install new JDK: false

## Build tool
- Build tool: Maven (prefer maven when available)
- Maven wrapper present: not detected (will verify)
- MAVEN_HOME (detected): `C:\Users\cocobongo\.maven\maven-3.9.12\bin`

## Steps
1. Create progress.md and track steps (done)
2. Check git status and handle uncommitted changes per user preference (user approved auto-actions)
3. Create branch `appmod/java-migration-20251218214602`
4. Ensure `JAVA_HOME` set to chosen JDK; ensure Maven available
5. Run `mvn -U -B clean install` for projects (via tooling)
6. Validate CVEs for dependencies and apply fixes if needed
7. Run tests and iterate validation loop
8. Final commit and generate summary

