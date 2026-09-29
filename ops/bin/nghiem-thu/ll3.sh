#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL3 — đích Page: cụm «Tất cả page» + cụm «Luật chung», màn còn lại thành TAB (CR-28-09c).
# Chạy: ops/bin/nghiem-thu/ll3.sh        (rc=0 là đạt)
# ① bộ ca cụm · ② thước menu (dieu-huong · ll1 tới-được) · ③ HK10 · ④ menu thật theo vai · ⑤ cổng LL1 + LL2 (kèm UI-HT).
# Tầm đo: sổ cụm + mã khung đọc TĨNH; khung vẽ tab trên trình duyệt thật đo bằng ảnh chụp ở nhật ký phiếu.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay v3/test/b/ll3-cum.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "①bộ-ca-cụm" $? "pass=$p fail=$f (đòi ≥5: sổ cụm · Page hai dòng · tên cụm · tới được · khung)"
for t in dieu-huong ll1-nam-dich; do o=$(chay v3/test/b/$t.test.mjs); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước-menu" $? "$t fail=$ff"; done
o=$(chay v3/test/b/he-kieu.test.mjs); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③HK10" $? "he-kieu fail=$ff"
kq=$(node --input-type=module -e '
process.env.V3_KHOA_VE ||= Buffer.alloc(32, 1).toString("base64");
const mh = await import("./v3/src/ui/chung/man-hinh.js"); const { VAI } = await import("./v3/src/auth/boi-canh.js");
const p = (v) => (mh.menuCua([v]).find((n) => n.ma === "page")?.man || []).filter((m) => !m.an).map((m) => m.tenMenu || m.ten).join("+");
console.log(`QUAN_TRI=${p(VAI.QUAN_TRI)} MARKETER=${p(VAI.MARKETER)}`);' 2>/dev/null | tail -1)
echo "   đích Page trên thanh bên: $kq"
echo "$kq" | grep -q "QUAN_TRI=Tất cả page+Luật chung MARKETER=Kịch bản của page+Câu trả lời sẵn"
ket "④menu-thật" $? "quản trị hai dòng mang tên cụm · marketer đúng tên màn"
for g in ll1 ll2; do bash "ops/bin/nghiem-thu/$g.sh" >/dev/null 2>&1; ket "⑤cổng-trước" $? "$g.sh"; done
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
