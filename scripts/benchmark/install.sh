#!/bin/bash
set -euo pipefail
if [ ! -f /.dockerenv ]; then echo "Run this installer only through the disposable Docker benchmark harness." >&2; exit 2; fi
mkdir -p /evidence
step() {
 local label="$1"; shift
 local start end code
 start=$(date +%s%3N)
 set +e
 "$@" >"/evidence/$label.log" 2>&1
 code=$?
 set -e
 end=$(date +%s%3N)
 printf '%s\t%s\t%s\t%s\n' "$label" "$start" "$end" "$code" >> /evidence/phases.tsv
 echo "$label $((end-start))ms exit=$code"
 if [ "$code" -ne 0 ]; then tail -35 "/evidence/$label.log"; exit "$code"; fi
}
date -u +%FT%TZ > /evidence/start.txt
step system-packages bash -c 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl git xz-utils libatomic1 python3 python3-venv ffmpeg libnss3 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 fonts-liberation'
step node bash -c 'cd /tmp && curl -fSL https://nodejs.org/dist/v26.12.1/node-v26.12.1-linux-x64.tar.xz -o node.tar.xz && curl -fSL https://nodejs.org/dist/v26.12.1/SHASUMS256.txt -o sums && awk '\''$2=="node-v26.12.1-linux-x64.tar.xz"{print $1"  node.tar.xz"}'\'' sums | sha256sum -c - && tar -xJf node.tar.xz -C /usr/local --strip-components=1 && rm node.tar.xz'
step clone git clone https://github.com/kujolang/videoops-factory.git /factory
cd /factory
git rev-parse HEAD > /evidence/revision.txt
step npm-ci npm ci
step setup npm run setup
step doctor npm run doctor -- --json
step verify npm run verify
step browser node_modules/.bin/hyperframes browser ensure
step render-and-viewer node /probe.mjs
node --version > /evidence/node.txt
ffmpeg -version > /evidence/ffmpeg.txt
