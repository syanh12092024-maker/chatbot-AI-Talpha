# NHẬT KÝ PHIẾU VA-R1 — Bộ não không bắn HTTP thật (RF-1) · worker đọc van + nguonDangMo (RF-2) · guard đủ cờ (RF-3)

> Thợ fable · 23/08/2026 · base khai `cb4b8b7`, HEAD thật lúc khởi công `d195c6f` (sau
> VA-R2 ✅) · làn 🟥 · nghiệm thu `ops/bin/nghiem-thu/va-r1.sh` rc=0 (12/12 phép) · gate
> RVA: 17 cổng rc=0 · suite 352/352 · repro tổng-thể-1 🔴=0 · repro MẢNG-2 S1/S3/S4 ✅.

## 0 · Mục ⑦ — ĐÃ TRA (output máy)

```
$ grep -n 'RF-1\b\|RF-2\b\|RF-3\b' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
224: | C1 bộ-não-bắn-HTTP | RF-1·RF-2·RF-3 | handler-v3.js · queue/worker.js | VA-R1 🟥 opus |
(không có SO-NO.md / tra_no.py / CLAUDE.md gốc — cùng VA-R3/R2)
```

Không ai đụng file của phiếu trước đó (bàn giao: «VA-R1 chưa ai đụng file nào»).

## 1 · Đo lại nguyên liệu

- `src/pancake.js:92` gọi `fetch` TOÀN CỤC trần, `pkFetchPage` truyền `init.method = false`
  cho GET (đo ở S4 — bản cổng đầu dùng `??` đọc thành "FALSE" và chặn cả ĐỌC; sửa `||`).
- Repro S4 gọi thẳng `executeTool` (tools.js, cấm sửa) rồi gán `globalThis.fetch = bẫy` ⇒
  cổng đặt ở tầng gọi (worker/handler) KHÔNG chạm tới. Chỗ duy nhất trong đất được phép
  đứng «ngoài» mọi caller là chính `globalThis.fetch` — cài ACCESSOR (get/set): gán sau đó
  chỉ thay phần trong, cổng vẫn bọc ngoài (đo: test R1-1 gán fetch giả rồi vẫn bị chặn).
- `cuaDangMo()` (channels/messenger/index.js:53) KHÔNG export ⇒ chép luật 1 dòng ở
  `vanGuiDangMo()`; harness `test/l2-m1-nhac-truong.test.js:314-318` mở van bằng cách
  đặt/xoá biến trong `process.env` ⇒ lớp trước-bộ-não PHẢI đọc process.env (không tra .env).
- `db/ket-noi.js#docEnv` không export ⇒ chép 8 dòng thành `docEnvTuyetDoi` ở `nap.js` (§9).
- Ghi chú thợ cũ (bàn giao 1b): S4b của l2-m1 cần `nguonDangMo()=true` với `V3_NAP_DEV=1`
  trên `aicloser_v3` localhost ⇒ chốt theo HOST, không theo tên DB. Đo: l2-m1.sh ③b xanh.

## 2 · Thi hành

| RF   | Việc                                                                                                                                                                                                                                                              | File          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| RF-1 | `lapCongHttpGhi()` cài khi nạp module: host thuộc van (`pages.fm`, `*.pages.fm` trừ `pos.pages.fm`, `graph.facebook.com`) + verb ≠ GET/HEAD/OPTIONS + `vanGuiDangMoTuyetDoi()===false` ⇒ ném `LoiCuaGuiDong`, ghi `congHttpGhi.daChan` (token che). GET luôn qua. | handler-v3.js |
| RF-1 | Bước 7: `!deps.cua && !vanGuiDangMo()` ⇒ ném `LoiCuaGuiDong` TRƯỚC `chayCloser` ⇒ nhánh `chan_guard` sẵn có, 0 token.                                                                                                                                             | handler-v3.js |
| RF-2 | `chayMotVong`: cùng điều kiện ⇒ chốt `chan_guard` + `tin_chan_guard` nhật ký ngay, không đọc lịch sử, không gọi não.                                                                                                                                              | worker.js     |
| RF-2 | `nguonDangMo()`: READONLY (đọc `.env` tuyệt đối) ≠ '1' ⇒ mở; ='1' ⇒ mở CHỈ khi `V3_NAP_DEV=1` VÀ `dbLaSandboxCucBo()` (host `DATABASE_URL_V3` ∈ localhost/127.0.0.1/::1; không parse được ⇒ đóng). `lyDoNguonDong` in cả host DB.                                 | nap.js        |
| RF-3 | guard nhận `orderCreated`/`isOrderSummary = !!state.orderCreatedThisTurn` (khuôn v2 handler.js:436-437).                                                                                                                                                          | handler-v3.js |

**Giả định/tradeoff nói ra (bẫy #11/#13):**

- «Cửa được TIÊM = harness tự gánh van»: lớp trước-bộ-não và lớp worker chỉ áp khi
  `deps.cua` vắng (cửa thật). Giá: test tiêm cửa nhưng để bộ não thật chạy sẽ không bị lớp
  này chặn — nhưng cổng HTTP ghi (lớp cuối) vẫn chặn mọi POST ra pages.fm khi van đóng.
- Cổng HTTP là SIDE-EFFECT toàn cục khi import `handler-v3.js`. Chấp nhận vì đây là lớp
  an toàn luật 1; có `congHttpGhi.daLap` để test đọc, không có hàm gỡ (cố ý — gỡ van là
  việc của người vận hành bằng biến env, không phải của code).
- Hai luật van trong một file (`vanGuiDangMo` process.env · `vanGuiDangMoTuyetDoi` .env):
  lớp tuyệt đối chỉ ĐÓNG THÊM, không mở thêm; khai rõ ở docstring.

## 3 · Thước theo luật mới (bẫy #27) — `refute-MANG-2.repro.mjs` ngoài pathspec

- S3 trước in `❌` VÔ ĐIỀU KIỆN (minh hoạ guard thuần) ⇒ thêm phép đo THẬT qua
  `xuLyMotTin` với spy `kiemTinRa` bắt ctx: ✅ khi `orderCreated===true && isOrderSummary===true
&& lyDo==='tra_loi'`.
- S4 tách GHI/ĐỌC (phiếu ④#1 «số lượt HTTP GHI = 0», ④#5 đối chứng GET vẫn chạy): ❌ chỉ khi
  GHI>0; in thêm `congHttpGhi.daChan` (6 POST notes bị cổng chặn, 6 GET settings tới bẫy).
- S2 (F4 ảnh trơ) · S5 (F5 thử lại N5) GIỮ NGUYÊN và vẫn ❌ — mức NÊN, ngoài phiếu, §9.

## 4 · Bằng chứng

```
$ bash ops/bin/nghiem-thu/va-r1.sh → ═══ TỔNG: 12 phép · 0 ĐỎ ═══ rc=0
   S1: chayCloser chạy 0 lượt · chan_guard      S4: tới bẫy 6 (ĐỌC 6 · GHI 0) · cổng chặn 6
   S3: orderCreated=true isOrderSummary=true → xong/tra_loi
   RF-2: DB 169.58.33.8 → false · cwd=/tmp env vắng READONLY → true|false · vắng cả hai → false
         · localhost (S4b) → true
   R1-1: POST/PUT/PATCH/DELETE pages.fm|graph → CHẶN · GET pages.fm ×2, POST pos.pages.fm,
         POST api.moonshot.ai → QUA · R1-2 van mở: POST pages.fm qua
   hồi quy 8 file (l2-m1 mock, l2-m2, l2-m3, l1-m2): fail=0 · file cấm đụng: 0
$ for f in ops/bin/nghiem-thu/{l*,va-*}.sh → 17 cổng rc=0 (tách dòng)
$ node --experimental-test-module-mocks --test test/l0-* … test/va-* → 352 pass / 0 fail / 0 skip
$ refute-tong-the-1 🔴=0 · refute-MANG-2 ❌=2 (F4, F5 — NÊN)
```

## 5 · Ngoài phạm vi → §9 (đã append)

F4 ảnh trơ khi guard chặn chữ · F5 N5 thử lại 3 lượt · `docEnv` chép từ ket-noi.js ·
`cuaDangMo` chép luật · F6 recordBlocked · F7/F8 GHI-NỢ của verdict MẢNG-2.
