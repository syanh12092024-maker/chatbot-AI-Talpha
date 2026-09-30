#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE7c — «Cài đặt › Model AI» theo BẢN VẼ 4: «Màn chỉ hiện thứ bot THẬT SỰ dùng». Vai «trả lời khách»
# hiện + thử bằng ĐƯỜNG CHỌN CỦA BOT (`src/chat/model.js#chonModel` — chính hàm `layModel` gọi), không bằng lớp v3 (lệch thật
# trên prod, đo 30/09: 3/4 team chưa có dòng cấu hình ⇒ bot gọi MODEL_CLOSER bằng KIMI_API_KEY trong khi lớp v3 báo «chưa có
# khoá»). Dự phòng thử theo lớp v3 (lớp sẽ dùng nó). «Thử một lượt» gọi đúng model + khoá MỘT lần, lỗi nhà model về HTTP 200.
# Chạy: ops/bin/nghiem-thu/ve7c.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — `chonModel`/`khoaCuaBot`/`goiMotLan` thật trên pool + mạng giả, CHẠY THẬT script
# màn (vm + DOM giả) gọi máy chủ thật. Không đo: nhà model thật trả lời thế nào (bấm «Thử» trên prod mới biết).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve7c-model.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 9 ]; ket "①chạy-thật-VE7c" $? "pass=$p fail=$f (đòi ≥9: hình prod · dán khoá+thử · 401→200 · bấm dồn · chưa lưu · quản lý · lỗi→câu · bot không gọi được · chonModel≡layModel)"
# ② một luật: `layModel` (bot) đi qua `chonModel` (màn) — ai tách lại hai luật thì màn lại nói khác bot
grep -q "const c = await chonModel(pool, ctx, { vaiTro, env });" src/chat/model.js; ket "②một-luật" $? "src/chat/model.js#layModel → chonModel"
# ③ máy chủ thật nối đường bot cho màn (thiếu thì màn nói «chưa đo» — đúng nhưng mù)
grep -q "chonModel(pool, { teamId: bc.teamId }, { vaiTro: 'chinh' })" v3/chay-that.js && grep -q "khoaCuaBot(pool, { teamId: bc.teamId, nhaCungCap: nha })" v3/chay-that.js
ket "③nối-đường-bot" $? "v3/chay-that.js duongBot"
# ④ câu màn khai về bot CŨ: «KHÔNG gửi độ ngẫu nhiên» — đo lại trên mã (closer + llm facade); có ai thêm thì câu phải đổi
! grep -nq "temperature" src/closer.js src/llm.js; ket "④câu-bot-cũ" $? "grep temperature src/closer.js src/llm.js = 0"
# ⑤ thước liền kề — kể cả các ca của `layModel` trên CSDL hộp cát (đường chat thật đi qua tệp vừa tách)
for t in v3/test/b/model-man-hinh.test.mjs v3/test/b/ll6-cai-dat.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/he-kieu.test.mjs \
         v3/test/b/trang-parse-duoc.test.mjs v3/test/b/audit-ghi.test.mjs v3/test/b/model-cau-hinh.test.mjs v3/test/b/model-goi-mot-lan.test.mjs \
         test/l2-m1-nhac-truong.test.js test/journey-chat-e2e.test.js test/ngon-ngu-nhuong-model.test.js test/l2-m2-handler.test.js; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "⑤thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve7b.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "⑥cổng-trước" $_r "ve7b.sh (kèm ve7a · ve2b · ve6c · ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
