#!/usr/bin/env bash
# Verify that the sherpa-onnx WASM VAD version pinned in download-wasm-vad.sh
# resolves to a real tarball on SourceForge. Hard-fails on HTTP 404,
# soft-skips on network errors so offline commits aren't blocked.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOWNLOAD_SCRIPT="${SCRIPT_DIR}/download-wasm-vad.sh"

if [[ ! -f "$DOWNLOAD_SCRIPT" ]]; then
  echo "error: cannot find $DOWNLOAD_SCRIPT" >&2
  exit 1
fi

VERSION=$(grep -E '^PINNED_VERSION="[^"]+"' "$DOWNLOAD_SCRIPT" | sed -E 's/^PINNED_VERSION="([^"]+)".*/\1/')

if [[ -z "${VERSION:-}" ]]; then
  echo "error: failed to extract PINNED_VERSION from $DOWNLOAD_SCRIPT" >&2
  exit 1
fi

URL="https://sourceforge.net/projects/sherpa-onnx.mirror/files/v${VERSION}/sherpa-onnx-wasm-simd-v${VERSION}-vad.tar.bz2/download"

echo "Checking sherpa-onnx WASM VAD v${VERSION}..."

CURL_EXIT=0
HTTP_CODE=$(curl --silent --head --location --output /dev/null --write-out "%{http_code}" --max-time 10 "$URL") || CURL_EXIT=$?

if [[ $CURL_EXIT -ne 0 ]]; then
  echo "warning: could not reach SourceForge (curl exit ${CURL_EXIT}); skipping version check" >&2
  exit 0
fi

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "ok: v${VERSION} exists"
  exit 0
fi

echo "error: sherpa-onnx v${VERSION} not found (HTTP ${HTTP_CODE})" >&2
echo "       URL: ${URL}" >&2
echo "       Update PINNED_VERSION in scripts/download-wasm-vad.sh" >&2
exit 1
