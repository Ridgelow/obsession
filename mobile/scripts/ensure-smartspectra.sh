#!/usr/bin/env bash
# Ensures SmartSpectra.xcframework is present for Xcode SPM binaryTarget.
# Xcode sometimes resolves the package graph without downloading the zip.
set -euo pipefail
VERSION="${SMARTSPECTRA_VERSION:-3.3.0}"
URL="https://github.com/Presage-Security/SmartSpectra-Swift/releases/download/v${VERSION}/SmartSpectra.xcframework.zip"
CHECKSUM_EXPECTED="${SMARTSPECTRA_CHECKSUM:-ff255eb40cd7bd40c96d21f0886bfdc3902050a891481ef219ff437b8ba34b80}"

DD_ROOT="${HOME}/Library/Developer/Xcode/DerivedData"
ART_DIR=$(find "$DD_ROOT" -type d -path '*/SourcePackages/artifacts/smartspectra-swift/SmartSpectra' 2>/dev/null | head -1 || true)
if [[ -z "${ART_DIR}" ]]; then
  echo "No SmartSpectra artifacts dir yet — open/resolve the Xcode package graph first:"
  echo "  cd ios && xcodebuild -resolvePackageDependencies -workspace Obsession.xcworkspace -scheme Obsession"
  exit 0
fi

if [[ -d "${ART_DIR}/SmartSpectra.xcframework" ]]; then
  echo "SmartSpectra.xcframework already present at ${ART_DIR}"
  exit 0
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
echo "Downloading SmartSpectra ${VERSION}…"
curl -L --fail -o "$TMP/SmartSpectra.xcframework.zip" "$URL"
ACTUAL=$(shasum -a 256 "$TMP/SmartSpectra.xcframework.zip" | awk '{print $1}')
if [[ "$ACTUAL" != "$CHECKSUM_EXPECTED" ]]; then
  echo "Checksum mismatch: expected $CHECKSUM_EXPECTED got $ACTUAL" >&2
  exit 1
fi
unzip -q -o "$TMP/SmartSpectra.xcframework.zip" -d "$ART_DIR"
echo "Installed → ${ART_DIR}/SmartSpectra.xcframework"
