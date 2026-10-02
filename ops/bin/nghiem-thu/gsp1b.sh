#!/usr/bin/env bash
# Hồi quy bắt buộc SKU; DB thử riêng từng tiến trình, không ghi ra kênh ngoài.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test \
  test/gsp1b-*.test.mjs v3/test/b/gsp1b-*.test.mjs test/ve8a-gop-mon.test.mjs \
  test/ll15d-marketer-san-pham.test.mjs v3/test/b/ll15d-marketer-man.test.mjs
gsp_root="$PWD"
gsp_tmp=$(mktemp -d "${TMPDIR:-/tmp}/gsp1b-mutation.XXXXXX")
trap 'rm -rf "$gsp_tmp"' EXIT
cp -R src test db "$gsp_tmp/"
cp package.json "$gsp_tmp/"
ln -s "$gsp_root/node_modules" "$gsp_tmp/node_modules"
python3 - "$gsp_tmp/src/products/san-pham-goc.js" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text()
a = s.index('    const khongSku = mon.filter')
b = s.index('    let g;', a)
s = s[:a] + '    const khoa = chuanSku(sku);\n    const so = khoa && /^[0-9]{1,4}$/.test(khoa) ? khoa : null;\n' + s[b:]
p.write_text(s)
PY
if (cd "$gsp_tmp" && node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test test/gsp1b-sku.test.mjs > "$gsp_tmp/sku.log" 2>&1); then
  echo 'Đột biến tin SKU thân còn sống'; exit 1
fi
if ! rg -q '^  ✖ (thân SKU lệch|món không SKU)' "$gsp_tmp/sku.log"; then cat "$gsp_tmp/sku.log"; exit 1; fi
echo 'Đã bắt đột biến tin SKU thân trên bản sao tạm'
