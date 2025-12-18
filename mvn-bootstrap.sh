#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAVEN_DIR="$ROOT_DIR/.maven/apache-maven-3.9.12"

if [ ! -d "$ROOT_DIR/.maven" ]; then
  mkdir -p "$ROOT_DIR/.maven"
fi

if [ ! -d "$MAVEN_DIR" ]; then
  echo "Downloading Maven..."
  ZIP="$ROOT_DIR/.maven/maven.zip"
  curl -L -o "$ZIP" "https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip"
  unzip -o "$ZIP" -d "$ROOT_DIR/.maven"
  rm "$ZIP"
fi

echo "Maven bootstrap complete. Use $MAVEN_DIR/bin/mvn to run Maven."
