#!/usr/bin/env bash
# Hồi quy GSP2 trên hộp cát: không đo prod, không gửi tin/ghi POS.
# DATABASE_URL_V3 phải trỏ PostgreSQL thử; mỗi tệp ca tự tạo DB riêng theo pid.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test \
  test/gsp2-*.test.mjs v3/test/b/gsp2-*.test.mjs \
  test/ll15d-marketer-san-pham.test.mjs v3/test/b/ll15d-marketer-man.test.mjs

# Đảo-vá trong bản sao; không bao giờ đột biến cây chung.
gsp_root="$PWD"
gsp_tmp=$(mktemp -d "${TMPDIR:-/tmp}/gsp2-mutation.XXXXXX")
trap 'rm -rf "$gsp_tmp"' EXIT
cp -R src v3 test db ops "$gsp_tmp/"
cp package.json "$gsp_tmp/"
ln -s "$gsp_root/node_modules" "$gsp_tmp/node_modules"
gsp_file="$gsp_tmp/src/products/chuyen-ban-sao.js"
cp "$gsp_file" "$gsp_tmp/original.js"
for mutation in goc shop bo_qua don_vi; do
  cp "$gsp_tmp/original.js" "$gsp_file"
  python3 - "$gsp_file" "$mutation" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text()
old, new = {
 'goc': ('banSao.doiSoatGoc === goc', 'true'),
 'shop': ('String(banSao.doiSoatShop) === String(shop)', 'true'),
 'bo_qua': ('if (d === "bo_qua") return goc == null;', 'if (d === "bo_qua") return true;'),
 'don_vi': ('Number(v) / (HE_SO_TE[String(te || "").toUpperCase()] || 1)', 'Number(v)'),
}[sys.argv[2]]
assert s.count(old) == 1, old
p.write_text(s.replace(old, new))
PY
  if (cd "$gsp_tmp" && node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test test/gsp2-chuyen-ban-sao.test.mjs > "$gsp_tmp/$mutation.log" 2>&1); then
    echo "Đột biến $mutation còn sống: test chưa bắt được"; exit 1
  fi
  if ! rg -q '^✖ GSP2 · (quyết định|PostgreSQL)' "$gsp_tmp/$mutation.log"; then
    cat "$gsp_tmp/$mutation.log"; exit 1
  fi
  echo "Đã bắt đột biến $mutation trên bản sao tạm"
done
cp "$gsp_tmp/original.js" "$gsp_file"
cp "$gsp_tmp/v3/src/ui/san-pham/kho-goc.js" "$gsp_tmp/kho-original.js"
cp "$gsp_tmp/v3/src/ui/san-pham/trang/san-pham.html" "$gsp_tmp/ui-original.html"
for mutation in trang_thai vai noi day_ban_chep; do
  cp "$gsp_tmp/original.js" "$gsp_file"
  cp "$gsp_tmp/kho-original.js" "$gsp_tmp/v3/src/ui/san-pham/kho-goc.js"
  cp "$gsp_tmp/ui-original.html" "$gsp_tmp/v3/src/ui/san-pham/trang/san-pham.html"
  python3 - "$gsp_tmp" "$mutation" <<'PY'
import sys
from pathlib import Path
root = Path(sys.argv[1]); name = sys.argv[2]
if name == 'trang_thai':
 p = root / 'src/products/chuyen-ban-sao.js'; s = p.read_text()
 old = 'else trangThai = chuaQuyet.length ? "cho_doi_soat" : "xong";'
 new = 'else trangThai = "xong";'
elif name == 'vai':
 p = root / 'v3/src/ui/san-pham/kho-goc.js'; s = p.read_text()
 a = s.index('export async function viecChuyen('); b = s.index('\n}', a)
 old = s[a:b]; new = old.replace('  batBuocVai(bc, ...VAI_SUA_DUOC);\n', '')
 assert old != new
elif name == 'noi':
 p = root / 'v3/src/ui/san-pham/trang/san-pham.html'; s = p.read_text()
 old = "if (!c.daTao && !c.gocId && n && n.loai === 'noi')"
 new = "if (false)"
else:
 p = root / 'v3/src/ui/san-pham/trang/san-pham.html'; s = p.read_text()
 old = '    delete CHON_CHUYEN[v.pageId]; await taiChuyen(); await taiGoc(); veChuyen();'
 new = "    await goiGhi('/api/san-pham/day-ban-chep', { method: 'POST', body: '{}' });\n" + old
assert s.count(old) == 1, old
p.write_text(s.replace(old, new))
PY
  if [[ "$mutation" == trang_thai ]]; then gsp_test=test/gsp2-chuyen-ban-sao.test.mjs; else gsp_test=v3/test/b/gsp2-chuyen-man.test.mjs; fi
  if (cd "$gsp_tmp" && node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$gsp_test" > "$gsp_tmp/$mutation.log" 2>&1); then
    echo "Đột biến $mutation còn sống"; exit 1
  fi
  if ! rg -q '^✖ GSP2' "$gsp_tmp/$mutation.log"; then cat "$gsp_tmp/$mutation.log"; exit 1; fi
  echo "Đã bắt đột biến $mutation trên bản sao tạm"
done
