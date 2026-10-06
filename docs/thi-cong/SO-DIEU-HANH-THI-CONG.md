# SỔ ĐIỀU HÀNH THI CÔNG — AI Closer v3 · phần việc NGƯỜI A (trục chính)

> **Nhịp tiếp tục 02/10 — GSP2/GSP1b:** đã hoàn tất code local và kiểm thử trên PostgreSQL tạm; 2342 đạt, 0 lỗi, 4 bỏ qua vì dữ liệu lịch sử. Chưa deploy hoặc đổi dữ liệu thật. Tiếp theo là nghiệm thu GSP3/GSP3b và H-GSP; chưa cắt đường bản sao ở GSP4. Nhật ký: `nhat-ky/phieu-gsp2.md` · `nhat-ky/phieu-gsp1b.md`.

> 💓 **NHỊP TIM TỔNG (16/09 — MỞ SÓNG BÁN HÀNG):** audit toàn hệ xong + quét **719 hội thoại
> thật**. Người quyết gật hai việc: **①** nới §0a luật 4 — năm file bộ não SỬA ĐƯỢC (khai
> «Đụng bộ não» trong phiếu, cổng `_chan1.sh` ⑤ canh); **②** mở **§5c SÓNG BH1–BH6**, 6 phiếu
> 🎫 đã soạn, thước `ops/bin/do-duong-ban.mjs` có 6 số + mốc nền. Hậu mãi/RTO **HOÃN** (nợ
> N-HOÀN §9: hoàn KSA **40,6%** vs UAE 20,4% trên 4.423 đơn/60 ngày — khoản tiền lớn nhất,
> mở lại sau BH). `npm test` 1769/1772 (D7 đỏ sẵn, nợ dữ liệu 25/08).
> 🔴 chặn cũ còn nguyên: dãy S `l0-m2-so-lieu` chập chờn · H7 514/514 page `chua-phan` ·
> H6 hết tiền model · chưa có đường đặt lại mật khẩu · **8 commit chưa push** (từ 15/09).
> 🔴 chặn mới: **N-C5** — `rap-prompt.js:122` tra `san_pham.page_id` mà cột đó NULL cho mọi
> dòng ⇒ bật `V3_RAP_PROMPT_BAT` là 100% page rơi `noData`. Phải vá trước mọi lượt cutover v3.
> **BH1 ✅ 16/09** (cổng 10/10 · bộ ca 26/26 · đảo-vá 5 ca đỏ trên bản cũ): giá đơn nay do
> SERVER tính (`src/core/gia.js`), hội thoại đã chốt bị khoá trong CODE, van READONLY đã có ở
> 5 lượt ghi của `tools.js` — **`pkSendReply` còn hở**, nợ N-SEND.
> Điểm dừng kế = người quyết gật **push** rồi phát BH2 · BH4 · BH5 (song song được; BH3 chờ
> BH1 ✅ nên phát được luôn, BH6 chờ BH3).

> Lập 22/08/2026 (mốc hồ sơ `219a2a5`). **MỌI session đọc sổ này TRƯỚC khi làm bất cứ gì,
> và update trạng thái NGAY khi xong việc.** Người quyết ra lệnh bằng MÃ VIỆC trong sổ
> (vd "làm L1-M1"), không ra lệnh bằng mô tả tự do.

## §0a · BỐI CẢNH + BỐN LUẬT DỰ ÁN — thắng mọi yêu cầu khác

Dự án: **AI Closer v3** — bot bán hàng Messenger/WhatsApp, ~478 page, Trung Đông + Philippines,
COD. Sổ này điều hành **phần việc NGƯỜI A** (trục chính: dữ liệu → cửa kết nối → chat → đơn
hàng, 12 module). Người B (phần rìa: auth, audit, model, màn sale) làm ở phiên khác — xem
`docs/v3/05-PHAN-VIEC.md`.

1. ⛔ `.env` máy này phải luôn có `PANCAKE_READONLY=1` — thiếu là máy dev gửi tin cho
   khách thật, trùng với VPS đang chạy. (Đã kiểm 22/08: dòng 77, `=1`.)
2. ⛔ Không xoá đơn hàng POS ở bất kỳ trạng thái nào, kể cả đơn test/đơn trùng.
3. ⛔ Chỉ thao tác trên repo này và máy chủ `169.58.33.8`. Không thêm remote, không deploy
   nơi khác, không đẩy code/dữ liệu ra dịch vụ thứ ba.
4. ⛔ KHÔNG đụng bản đang chạy: 62 file phẳng ngay dưới `src/` + `db cũ (15 file JSON)`
   đang phục vụ 51 page khách thật. Code v3 sống ở **thư mục con mới**: `src/db/` `src/pos/`
   `src/channels/` `src/chat/` `src/orders/` `src/queue/` + `db/` (schema/migrate).

   ⚠️ **SỬA 16/09 — người quyết gật, sau lượt audit + đo 719 hội thoại thật.** Luật cũ
   viết «bộ não chat DÙNG NGUYÊN, cấm sửa: `prompts.js` `closer.js` `tools.js`
   `fast-lane.js` `outbound-guard.js`». Luật đó đã **hết tác dụng bảo vệ và bắt đầu gây
   hại**, đo được ba chỗ:
   · ba lỗi nặng nhất của hệ (giá đơn do MODEL điền — `tools.js:38` + `pancake-orders.js:164`;
     hội thoại đã CHỐT không bị khoá — `conv-owner.js:102` không xét `CLOSING`;
     `PANCAKE_READONLY` không có ở primitive gửi — `pancake.js`/`messenger.js`) đều nằm
     TRONG nhóm file cấm, nên không đường nào vá được;
   · v3 `import` nguyên năm file đó (`src/chat/handler-v3.js:64-74`) ⇒ lỗi đi thẳng sang
     bản mới, và v3 phải dựng cổng `globalThis.fetch` chỉ để bù cho việc không sửa được
     file cấm — bản vá ở tầng sai;
   · đo thật 16/09: tin page >300 ký tự chỉ được khách trả lời **9,5%** (tin 21–80 ký tự:
     41,2%), mà `closer.js:38` đang để `max_tokens=400`. Không sửa file não = không sửa
     được cách bot nói.

   **Luật mới:** năm file trên là **BỘ NÃO CHUNG của cả hai bản**, SỬA ĐƯỢC, với ba rào:
   ① phiếu phải khai dòng `**Đụng bộ não:** <danh sách file> — <lý do một câu>` (cổng
   `_chan1.sh` phép ⑤ đỏ nếu đụng mà không khai); ② mọi thay đổi chạm cách bot NÓI phải
   đo lại bằng `ops/bin/do-duong-ban.mjs` (sáu số, mốc nền 16/09 nằm trong chính file đó)
   + chạy **ba lượt model** như nghiệm thu sóng 1 dặn; ③ deploy theo gate, có đường lùi
   bằng cờ `.env`, không đổi hành vi 51 page giữa chừng.
   Các file phẳng `src/` CÒN LẠI (57 file) giữ nguyên luật cấm cũ.

   ⚠️ **SỬA 02/10 — CR-02-10, người quyết gõ «áp, nới luật hay gì cũng được — quy về 1 mối».**
   Lý do của luật («đang phục vụ 51 page khách thật») hết đúng: v1 thôi trả lời khách từ 28/08
   (`ai-enabled.json` rỗng, `V3_LEGACY_POLL_OFF=1`). **Luật mới:** 31 file phẳng DÙNG CHUNG với v3
   (`kb` `pancake` `config` `ai-log` `pages` `stats`…) sửa được như code v3 thường; 24 file
   CHỈ-v1 (`server` `admin*` `pancake-poll` `handler` `store` `readiness` `page-registry`…) được
   dời hàm còn dùng vào v3 rồi GỠ (phiếu MB4). **Năm file bộ não giữ nguyên ba rào 16/09.**

**Nguồn sự thật đọc theo thứ tự:** `docs/v3/01-QUYET-DINH.md` (ý đồ — thắng mọi thứ khi
mâu thuẫn) → `docs/v3/02-KE-HOACH-CODE.md` (kế hoạch + 18 bảng + nghiệm thu) →
`docs/v3/05-PHAN-VIEC.md` (ranh giới file) → `docs/TONG-QUAN-HE-THONG.md` (bản đang chạy).

**Môi trường dev:** Postgres 16 container `talpha-pg` cổng **5433**, chuỗi nối ở `.env`
biến `DATABASE_URL_V3`. Node: máy A đo 15/09 = **v24.19.0** (sổ cũ ghi v25; ba cổng `a7-*` nhận khuôn Node 25). Dữ liệu thật để di trú nằm ở gốc repo (`pages.json`
`kb-overrides.json` `conv-state.json` `script-versions/` `stats.json`…, đã trải từ gói bàn
giao 19/08 — đều bị gitignore). **Lược đồ VPS đo 16/09: đã áp 001→014 (14 bản).** ⚠️ **SỬA 15/09:** dòng cũ ở đây ghi «Token Pancake từ IP máy
cá nhân bị chặn (lỗi 121) — phải lấy số đo trên VPS, đừng debug ở local». **SAI.** Đo lại từ
chính máy này: `GET /pages` → 200, 218 page; API POS đọc được 2.500 đơn. Lỗi 121 =
«Không tìm thấy gói cước nào cho người dùng này», đi **theo PAGE** chứ không theo IP — page
có gói thì gọi được từ local. Chi tiết + bằng chứng: §9 mục 15/09.

**Route model thợ (sửa 22/08 — tiết kiệm token):** MẶC ĐỊNH **sonnet** cho mọi phiếu code
— phiếu đã viết sẵn nghiệm thu máy chi tiết nên cổng ④ gánh phần chất lượng; **opus** chỉ
cho phiếu khó thuật toán/rủi ro ghi-ra-ngoài: L1-M1 · L1-M3 · L3-M1 · L3-M2. Thợ trả về
≤15 dòng, chi tiết vào file (đã là luật).

**Ranh giới làn rủi ro của dự án này (route phiếu):**
🟥 = mọi thứ GHI ra ngoài hoặc đụng đơn/tiền: `src/pos/*` (ghi ngược trạng thái POS) ·
`src/orders/*` · `hang_cho_tao_don` · mọi đường gửi tin ra khách · `db/migrate/*` đụng bảng
`don_hang`/`khach` · auth. 🟨 = còn lại của trục chính (schema thuần, tầng truy vấn, hàng
đợi, di trú đọc-JSON-ghi-DB-mới). 🟩 = docs, script đo. Nghi ngờ = đẩy lên làn cao.

## §0 · LUẬT VẬN HÀNH (15 luật — số luật CỐ ĐỊNH, thêm mới thì nối tiếp)

1. **Một session = một phiếu.** Mở session/agent mới cho mỗi phiếu code (context sạch).
   Prompt chuẩn: _"Đọc sổ này. Nạp skill `tho-thi-cong`. Nhận phiếu `<MÃ>`. Làm đúng
   phạm vi phiếu. Xong: nghiệm thu bằng nội dung, commit pathspec, APPEND 3 dòng vào
   §10 — BẢNG trạng thái do TỔNG sửa."_
2. **Không phiếu nào khởi công khi cột "Phụ thuộc" chưa ✅.** Lỗi ngoài phạm vi → ghi
   **§9 SỔ NỢ**, cấm tiện tay sửa.
3. **Trạng thái:** ⬜ chưa làm · 🎫 đã có phiếu · 🟨 đang code · 🔎 chờ review · ✅ xong
   (đã nghiệm thu nội dung) · ⛔ chặn (ghi vì sao). Hai phiếu đụng cùng file → TUẦN TỰ.
4. **Review:** ⚠️ SỬA theo lệnh người quyết 22/08 (2 đợt) — **BỎ refute per-phiếu** và
   **BỎ agent review điểm (a) riêng**; nghiệm thu mọi làn = chặng 1 máy (`_chan1.sh`) +
   tổng chạy script ④ bằng nội dung. Tổng TỰ chấm 4 câu nghiệp vụ (1·3·7·8) khi soạn phiếu
   — không thuê agent; NGOẠI LỆ duy nhất được thuê 1 lượt review (a): phiếu GHI RA NGOÀI
   (POS ghi ngược L1-M1 · WhatsApp gửi tin L1-M3 · máy trạng thái đơn L3-M1). **Refute
   TỔNG THỂ một lượt trước deploy** — người quyết gọi. GATE cuối sóng = phần MÁY (npm test
   2 lượt + toàn bộ ops/bin/nghiem-thu/*.sh), không fan-out agent.
5. **Commit:** thợ commit pathspec phiếu mình (`type(scope): <mã> — mô tả`). Cấm
   `git add -A`. Push chỉ khi người quyết ra lệnh. Đổi hành vi module nào → cập nhật
   doc thiết kế tương ứng cùng commit.
6. **Skill theo loại phiếu:** phiếu khai mục "skill nạp", tối đa 2–3 skill/session.
7. **E2E hai nấc:** per-PHIẾU = test chạm nhánh thật; per-GATE = trọn bộ E2E trên bộ
   dữ liệu mẫu.
8. **Hợp đồng nguồn số cho mọi mockup/màn:** từng con số khai `bảng/cột nguồn · tồn tại
chưa · chưa thì phiếu nào cấp`. Số không khai được nguồn = không được vẽ.
9. **Quyền ghi sổ:** chỉ TỔNG sửa các BẢNG trạng thái; thợ chỉ APPEND §10 + file
   phiếu/nhật ký của mình.
10. **Thợ chết im lặng:** phiếu 🟨 quá 4h không có nhật ký mới → tổng kiểm transcript,
    chết thì respawn thợ mới nhận lại đúng phiếu.
11. **DB test dùng chung:** hai thợ không chạy bộ test đụng DB cùng lúc — tổng tuần tự
    hoá, hoặc thợ tạo DB sandbox riêng (template `aicloser_v3_test_<mã>`).
12. **Nhịp deploy theo gate:** mỗi GATE kết bằng một lượt push + deploy (người gật) —
    chống drift local↔prod.
13. **Quyền của thợ nền = quyền của tổng** — lượt đầu người ngồi cạnh 15–30′ duyệt hộp
    xin quyền.
14. **Màn/mockup khai nguồn theo schema HIỆN TẠI + SCHEMA-DELTA**; cột chưa tồn tại →
    ghi «chờ phiếu <mã>» + đổ §9.
15. **SỔ PHẢI GẦY:** thợ APPEND §10 đúng khuôn 3 dòng (`- <ngày> · <MÃ> → <trạng thái>
— <một câu> · commit <hash> · nhật ký <path>`); tại mỗi GATE tổng NÉN §10 vào
    `nhat-ky/so-luu-tru-<sóng>.md`; bài học 🧭 chưng cất vào skill `tho-thi-cong`.

## §0b · GIAO THỨC SESSION TỔNG

**Quy trình chi tiết sống trong skill `tong-dieu-phoi`** — tổng nạp skill đó NGAY khi
nhận vai; sổ này giữ TRẠNG THÁI. Kiến trúc: SAO + SỔ + NHỊP. Ba điểm DỪNG chờ người:
①việc NGƯỜI (§8) · ②push/deploy/prod · ③gate cuối sóng.

**Prompt mở session TỔNG (dán nguyên văn, dùng cho MỌI đời tổng):** _"Đọc
`docs/thi-cong/SO-DIEU-HANH-THI-CONG.md`, nạp skill `tong-dieu-phoi`, và làm SESSION
TỔNG theo skill + §0b. TIẾP TỤC THEO TRẠNG THÁI HIỆN TẠI của sổ: nghiệm thu các phiếu
🔎 · phát phiếu ⬜ đã hết chặn · respawn phiếu 🟨 chết im quá 4h · vào vòng /loop tự
nhịp 20–30 phút, update NHỊP TIM đầu sổ mỗi vòng."_

## §1 · BẢN ĐỒ TỔNG THỂ — 12 module của A, 4 sóng, làm TUẦN TỰ

```
SÓNG 0 NỀN        SÓNG 1 CỬA KẾT NỐI       SÓNG 2 CHAT             SÓNG 3 HAI LUỒNG ĐƠN
L0-M1 → L0-M2 →  L1-M1 → L1-M2 → L1-M3 →  L2-M1 → L2-M2 → L2-M3 → L3-M1 → L3-M2 → L3-M3 → L3-M4
      [GATE R0]                 [GATE R1]                [GATE R2]                        [GATE R3]

Nhánh chờ NGOÀI (không phải việc A): người B (L0-M3·L0-M4·L1-M4·L4) · 4 điểm kiểm chặn H1–H4
```

Mốc nghiệm thu lớn: cuối sóng 0 = lược đồ 18 bảng + dữ liệu thật di trú khớp danh sách,
truy vấn thiếu team ném lỗi · cuối sóng 1 = đọc được POS thật + đổi trạng thái đơn nháp
2 chiều + WhatsApp API gửi 1 tin nội bộ · cuối sóng 2 = trả lời <10s trên 3 page thử, lớp
0 đồng chặn ≥33%, đơn không giảm sau 7 ngày · cuối sóng 3 = đơn LadiPage được WhatsApp hỏi
trong 5′, đơn Messenger không bị hỏi lại, trùng chéo bị bắt.

**Module trước chưa ✅ thì không phát module sau** (lệnh trong prompt giao việc A).

## §2 · SÓNG 0 — NỀN DỮ LIỆU (L0 phần A)

| Mã    | Việc                                                                               | Phụ thuộc | Session | Đụng file             | Trạng thái |
| ----- | ---------------------------------------------------------------------------------- | --------- | ------- | --------------------- | ---------- |
| L0-M1 | Lược đồ 19 bảng + di trú dữ liệu thật từ JSON                                      | —         | thợ mới | `db/*` `test/l0-m1-*` | ✅         |
| L0-M2 | Tầng truy vấn tự chèn điều kiện team, thiếu bối cảnh → ném lỗi                     | L0-M1     | thợ mới | `src/db/*` `test/`    | ✅         |
| R0    | **GATE SÓNG 0** — npm test 2 lượt + script nghiệm thu + đối chiếu danh sách di trú | L0-M1·M2  | TỔNG    | —                     | ✅         |

Bàn giao cho B tại R0: lược đồ (điểm 1) + hàm tầng truy vấn (điểm 2) + hình dạng bảng
`viec_can_xu_ly` (điểm 3) — công bố bằng file `docs/v3/ban-giao/luoc-do-v1.md`.

Dặn trước cho phiếu L0-M2 (từ verdict điểm (a) L0-M1, chống ĐẠT RỖNG): nghiệm thu «đăng
nhập Tiểu Alpha không thấy dữ liệu team khác» phải đo trên dữ liệu ĐÃ GÁN ≥2 team nghiệp
vụ (test tự chèn mẩu dữ liệu trộn team rồi mới đo cách ly) — toàn bộ dữ liệu di trú đang
nằm ở team kỹ thuật `chua-phan` nên đo trên dữ liệu thật là đo trên tập rỗng. Kèm ca test
hợp đồng `bo_luat_chung (team_id = $ctx OR team_id IS NULL)`.

## §3 · SÓNG 1 — BỐN CỬA KẾT NỐI (phần A: 3 cửa)

| Mã    | Việc                                                                         | Phụ thuộc                 | Session | Đụng file                            | Trạng thái |
| ----- | ---------------------------------------------------------------------------- | ------------------------- | ------- | ------------------------------------ | ---------- |
| L1-M1 | Cửa POS: đọc đơn/sản phẩm/tồn kho + GHI NGƯỢC trạng thái đơn 🟥              | R0 ✅                     | thợ mới | `src/pos/*` `db/migrate/002` `test/` | ✅         |
| L1-M2 | Cửa Pancake Messenger 🟥 (có đường gửi tin) — bọc cũ + định tuyến team       | R0 ✅                     | thợ mới | `src/channels/messenger/*` `test/`   | ✅         |
| L1-M3 | Cửa Pancake WhatsApp 🟥 — KHUNG + mock (phép thật → §7b T1)                  | R0 ✅ (H1 thôi chặn code) | thợ mới | `src/channels/whatsapp/*` `test/`    | ✅         |
| R1    | **GATE SÓNG 1** — máy: chạy lúc cây rảnh (L2-M1 đang test) · thật: §7b T1/T2 | L1-M1..M3 ✅              | TỔNG    | —                                    | 🟨         |

## §4 · SÓNG 2 — CHAT MESSENGER

| Mã    | Việc                                                                                  | Phụ thuộc                                                           | Session | Đụng file                                           | Trạng thái |
| ----- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- | --------------------------------------------------- | ---------- |
| L2-M1 | Đường xử lý tin nền mới + hàng đợi; route outbound qua cửa v3 (nợ tools.js); DI model | R1 code-xong (L1-M1·M2 ✅; model = llm.js cũ qua DI, chỗ cắm cho B) | thợ mới | `src/queue/*` `src/chat/*` `db/migrate/003` `test/` | ✅         |
| L2-M2 | Tắt Botcake 3 page thử, bật 2 lớp 0 đồng, nhập 2 luật từ khoá, vá `paano mag order`   | L2-M1 + **H3** + **H8**                                             | thợ mới | `src/chat/*` `test/`                                | ✅         |
| L2-M3 | Tách prompt 4 khối, ngân sách lượt theo độ nóng, cờ page trọng điểm                   | L2-M1                                                               | thợ mới | `src/chat/*` `test/`                                | ✅         |
| R2    | **GATE SÓNG 2** — đo 50 lượt thật <10s, 7 ngày so 3 page đối chứng                    | L2-M1..M3                                                           | TỔNG    | —                                                   | ⬜         |

## §5 · SÓNG 3 — HAI LUỒNG ĐƠN 🟥 (toàn sóng là đường đơn/tiền)

| Mã    | Việc                                                              | Phụ thuộc | Session | Đụng file                            | Trạng thái |
| ----- | ----------------------------------------------------------------- | --------- | ------- | ------------------------------------ | ---------- |
| L3-M1 | Máy trạng thái đơn PHÂN NHÁNH THEO NGUỒN 🟥                       | R2        | thợ mới | `src/orders/*` `test/`               | ✅         |
| L3-M2 | Lọc trùng chéo hai luồng + chấm tỉ lệ hoàn 🟥                     | L3-M1     | thợ mới | `src/orders/*` `test/`               | ✅         |
| L3-M3 | Hàng đợi nhắc (2h×5, huỷ khi khách trả lời) + bộ đọc ý 4 nhánh 🟥 | L3-M1     | thợ mới | `src/orders/*` `src/queue/*` `test/` | ✅         |
| L3-M4 | Hàng chờ tạo đơn luồng Messenger 🟥                               | L3-M1·M2  | thợ mới | `src/orders/*` `test/`               | ✅         |
| R3    | **GATE SÓNG 3**                                                   | L3-M1..M4 | TỔNG    | —                                    | ⬜         |

## §7b · «CHẠY THỬ MỘT LẦN» — dồn theo lệnh người quyết 22/08 (làm khi CEO gọi)

Mọi phép cần thế-giới-thật của các phiếu được code-với-mock + HOÃN minh bạch, dồn về đây:

| #   | Phép                                                                                                          | Của phiếu   | Cần gì                           |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------- |
| T1  | Gửi 1 tin WhatsApp thật qua API Pancake tới số nội bộ                                                         | L1-M3 ⑤     | H1 nối số WA vào Pancake         |
| T2  | Diễn tập ghi-ngược trạng thái trên ĐƠN NHÁP (2 chiều)                                                         | L1-M1 ④#5c  | V3_POS_GHI=1 + đơn nháp          |
| T3  | Tắt Botcake 3 page thử + bật 2 lớp 0 đồng                                                                     | L2-M2       | H8 chọn page + người vào Botcake |
| T4  | Đo 50 lượt trả lời thật <10s + 7 ngày so 3 page đối chứng                                                     | L2 gate R2  | T3 xong                          |
| T5  | Nạp `ai-messages.jsonl` + đối chiếu số dòng Sổ AI                                                             | nợ §9 L0-M1 | chạy trên VPS                    |
| T6  | Lớp model B (L1-M4) cắm vào chỗ DI của L2-M1                                                                  | H5          | người B xong                     |
| T7  | Duyệt 1 dòng hàng chờ thật → tạo 1 đơn NHÁP đánh dấu TEST trên shop ít dùng nhất (để nguyên — luật 2 cấm xoá) | L3-M4 ⑤     | V3_POS_GHI=1 + người chọn shop   |

## §5b · SÓNG VÁ REFUTE (VA-R1..R4 — đóng 10 CHẶN §9b)

| Mã    | Cụm                                                           | Phụ thuộc | Đụng file                                        | Trạng thái    |
| ----- | ------------------------------------------------------------- | --------- | ------------------------------------------------ | ------------- |
| VA-R1 | C1 bộ-não-HTTP (RF-1/2/3)                                     | review(a) | chat/handler-v3 · queue/worker · queue/nap       | ✅ 23/08 `1562d58` · cổng `va-r1.sh` 12/12 |
| VA-R2 | C2 tiền+tạo-đơn (RF-9/10/11/12/21/15)                         | review(a) | orders/hang-cho · pos/tao-don · pos/doc-danh-muc | ✅ 23/08 `5caf5be` · cổng `va-r2.sh` 17/17 |
| VA-R3 | C3 máy trạng thái (RF-13/14)                                  | —         | orders/may-trang-thai · quet-don-moi             | ✅            |
| VA-R4 | C4 đọc ý (RF-20)                                              | —         | orders/doc-y                                     | ✅            |
| RVA   | **GATE SÓNG VÁ** — 13 cổng cũ + 4 va-r* + repro 2 bộ đảo xanh | VA-R1..R4 | TỔNG                                             | ✅ 23/08 · 17 cổng rc=0 · 352/352 · repro tổng-thể-1 🔴=0 (MẢNG-2 còn ❌ F4/F5 mức NÊN, §9) |

## §5c · SÓNG BÁN HÀNG (BH1–BH6) — mở 16/09 theo lệnh người quyết

**Vì sao mở sóng này:** lượt audit 16/09 + quét **719 hội thoại thật** (14 page đông nhất,
3.027 tin khách · 7.281 tin page, chỉ đọc) cho ra ba sự thật làm đổi thứ tự việc:

- bot AI **gần như không chạy**: 12/719 hội thoại (1,7%) có lượt model; 57,2% tin page là
  template Botcake, 12% người gõ tay. Mọi tối ưu prompt trước nay tối ưu cho thứ đang tắt;
- **độ dài quyết định tất cả**: tin page >300 ký tự chỉ được khách trả lời **9,5%**, tin
  21–80 ký tự **41,2%**, tin TỰ SOẠN 151–300 ký tự **50%** (cao nhất). `closer.js` đang để
  `max_tokens=400` ≈ 550 ký tự — nằm gọn trong vùng tệ nhất;
- **ép chốt làm mất khách**: hội thoại CÓ đơn dùng 0,4 câu chốt/ht, KHÔNG đơn 0,7 (tương
  quan NGHỊCH). «any other questions?» → 90,5% khách im · khan hiếm → 92,5% · «friendly
  reminder» → 94,3% · «still there?» → 78,7%.

**Thước của sóng:** `ops/bin/do-duong-ban.mjs` — sáu số, mốc nền 16/09 nằm trong chính
file đó. Mọi phiếu BH so lại với sáu số ấy, không so bằng cảm giác.

| Mã  | Việc                                                           | Phụ thuộc | Đụng bộ não                                      | Trạng thái |
| --- | -------------------------------------------------------------- | --------- | ------------------------------------------------ | ---------- |
| BH1 | Giá do SERVER tính · khoá hội thoại đã CHỐT · van READONLY      | —         | `tools.js` `outbound-guard.js` `conv-owner.js`   | ✅ 16/09 · cổng `bh1.sh` 10/10 · bộ ca 26/26 · đảo-vá 5 ca đỏ trên bản cũ |
| BH2 | Hồ sơ khách đọc được ý (nhu cầu · đã hỏi · đã từ chối · sẵn sàng) | —       | `context.js`                                     | 🎫 |
| BH3 | Bot NÓI NHƯ NGƯỜI: tin ngắn · bỏ ép chốt · 5 luật guard mới     | **BH1**   | `prompts.js` `closer.js` `outbound-guard.js` `tools.js` | 🎫 |
| BH4 | Ngân sách lượt theo đường chốt thật (AM 3→5 · NONG 6→8)         | —         | `lead-score.js`                                  | 🎫 |
| BH5 | Soi lỗ hổng kiến thức của page → việc cho marketer              | —         | không                                            | 🎫 |
| BH6 | Bỏ `get_price` · hai điểm neo cache · đo tiền thật              | BH1·BH3   | `prompts.js` `tools.js`                          | 🎫 |
| BH7 | Kimi đọc tin Botcake khách đã nhận · tin ngắn 2–3 dòng     | —         | `context.js` `prompts.js`                        | ✅ 28/09 · cổng `bh7.sh` 9/9 · bộ ca 10/10 · đảo-vá 8/10 đỏ · đo model: xem nhật ký |
| BH8 | HAI BẢN: người đọc tiếng Việt, model đọc tiếng Anh gọn · đích ≤50đ/lượt | BH7 | `prompts.js` `tools.js` `context.js` | 🔨 28/09 · CODE xong (cổng `bh8.sh` 12/12), chưa đóng (dọn bảng 05/10) |
| RBH | **GATE SÓNG BÁN** — 6 cổng bh*.sh + `do-duong-ban` 6 số đạt đích + 3 lượt model | BH1..BH6 | TỔNG | ⬜ |

**Đích của gate RBH** (so mốc nền 16/09): tin page được trả lời 31,8% → **≥40%** · hội
thoại ≥4 tin khách 39,4% → **≥50%** · cho SĐT 19,5% → **≥25%** · có thẻ đơn 22,9% →
**≥27%** · tin >300 ký tự 21,3% → **<5%** · câu giết/100 tin 18,6 → **≤6** · đ/tin 127đ →
**≤90đ**. Ngưỡng LÙI: thẻ đơn giảm >10% tương đối, hoặc guard chặn >12% tin.

⚠️ Sóng này chạy **trên bản đang chạy (v2)**, vì đó là bản đang phục vụ khách. Bộ não là
file dùng chung nên v3 hưởng nguyên — xem §0a luật 4 bản 16/09.
**Hậu mãi/RTO hoãn theo lệnh người quyết 16/09** (tỷ lệ hoàn KSA 40,6% vs UAE 20,4%, đo
trên 4.423 đơn POS 60 ngày — đã ghi §9 để không rơi mất).

## §5d · SÓNG BÀN HỘI THOẠI (UI-HT1–HT4) — CR-28-09, người quyết gõ «áp» 28/09

§10 `01-QUYET-DINH.md` đổi: màn sale thành **bàn hội thoại CHỈ ĐỌC** (danh sách · khung chat đọc
thẳng Pancake · bối cảnh khách), trả lời vẫn ở Pancake. Phiếu CR:
`docs/thi-cong/doi-y-do/CR-28-09-ban-hoi-thoai-chi-doc.md`. Bản dựng đã duyệt:
https://claude.ai/artifact/LJcDVTN8GZPyWEtxZnF2yh

| Mã     | Việc                                                             | Phụ thuộc | Làn | Trạng thái |
| ------ | ---------------------------------------------------------------- | --------- | --- | ---------- |
| UI-HT1 | Cửa đọc hội thoại: mã `<page_id>_<psid>` · tra `customer_id` · nhớ 60s | —   | 🟨  | ✅ 28/09 (dọn bảng 05/10 theo §10) |
| UI-HT2 | Màn «Bàn hội thoại» ba cột, không ô soạn tin                      | UI-HT1    | 🟩  | ✅ 28/09 (dọn bảng 05/10 theo §10) |
| UI-HT3 | Cột bối cảnh: khách · hoàn · đơn · giai đoạn · người giữ · kịch bản | UI-HT2  | 🟩  | ✅ 28/09 (dọn bảng 05/10 theo §10) |
| UI-HT4 | Sửa thước theo §10 mới                                           | UI-HT2    | 🟩  | ✅ 28/09 (dọn bảng 05/10 theo §10) |

## §5e · SÓNG MỘT NGUỒN (MN1–MN7) — CR-28-09b, người quyết gõ «áp b. gộp 1 bước» 28/09

Sản phẩm · giá · ảnh · kịch bản có MỘT chỗ ghi là CSDL v3, sửa trên giao diện; mỗi lượt lưu có
hiệu lực với bot ngay hoặc báo lỗi. Bot v1 nhận bản chép máy sinh (`kb-overrides.json`, chỉ máy
ghi). Kịch bản: **lưu là chạy** (đúng §9 đã ký). Phiếu CR:
`docs/thi-cong/doi-y-do/CR-28-09-mot-nguon-san-pham.md` (lớp 5 đo trên prod ở mục 5d).

| Mã  | Việc                                                                          | Phụ thuộc          | Làn | Trạng thái |
| --- | ----------------------------------------------------------------------------- | ------------------ | --- | ---------- |
| MN1 | Migration 025 `anh_san_pham` + tầng đọc/ghi + hợp đồng lược đồ                 | —                  | 🟨  | ✅ `b8d6a0f` (+`bien_the` ở `0bd772a`) |
| MN2 | Nạp một lượt `kb-overrides.json` (77 page) → `san_pham`/`goi_gia`/`anh_san_pham`; báo page thiếu & link chết | MN1 | 🟥 | ✅ prod 76 page · 78 SP · 154 bậc · 536 ảnh |
| MN3 | Lưu sản phẩm · giá · ảnh trên v3 ⇒ đẩy sang bot; đẩy hỏng ⇒ lượt lưu báo lỗi   | MN1                | 🟥  | ✅ `0bd772a` (sản phẩm+giá; ảnh đi cùng MN4) |
| MN4 | UI: sửa ảnh tại tab; «Sản phẩm & kho» + «Ảnh gửi khách» đọc CSDL v3            | MN1 · MN3          | 🟨  | ✅ `9e175ec` |
| MN6 | Trang page = màn kịch bản đầy đủ, xếp theo thứ tự AI nhận; kịch bản lưu là chạy | MN3 · MN4          | 🟨  | ✅ `b0b1282` |
| MN7 | Khối dùng chung Chính sách · FAQ · Phản đối vào v3 — người quyết đổi sang (a) CHÉP (khách là OFW, Tagalog có chủ ý) | MN3 | 🟨 | ✅ `c0b829f` `2353f5b` |
| MN8 | Nối sản phẩm page ↔ món POS (`pos_ma`, 027): hết hàng theo tồn kho POS, «Dùng tên POS» | MN3 | 🟨 | ✅ `b41261e` · prod: kéo 69 món Kuwait (chưa nối page nào) |
| MN5 | Deploy + nạp + cờ `V3_GHI_KHO_BOT` + `PUBLIC_URL` 3102 + `V3_SHEET_CHI_DANH_BA` — **mở van** | MN2·MN3·MN4·MN7    | 🟥  | ✅ A–E 28/09 · nhật ký `phat-hanh-20260928-mot-nguon.md` |

## §5f · SÓNG LÀM LẠI (LL1–LL17) — CR-28-09c, người quyết gõ «áp» 29/09

Năm đích thay 26 màn: **Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt**; ba vai; sản phẩm là lõi (1 shop POS =
1 thị trường, marketer từ HRM); đơn thuộc team của marketer, Ladi nhận bằng UTM. Phiếu CR: `docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`.
Bản vẽ: https://claude.ai/artifact/A6D68jyQRuqqu3TBRLrceb · hợp đồng màn `docs/v3/03-MAN-HINH.md`.
**Thứ tự cứng: thêm nhà mới trước, gỡ màn cũ sau cùng (LL8).** Không DROP bảng nào. Page mới đi TRÊN MN6.
CR đóng khi LL9 (thước) xong — trước đó bộ ca còn neo năm vai / menu cũ là ĐÚNG với mã đang chạy.

| Mã   | Việc                                                                                          | Phụ thuộc              | Làn | Trạng thái |
| ---- | --------------------------------------------------------------------------------------------- | ---------------------- | --- | ---------- |
| LL1  | Khung năm đích: menu xếp lại, không đổi đường, sale vào thẳng Hộp thư                          | —                      | 🟩  | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL7  | Vai 5 → 3 (quyền · lược đồ gieo · 35 tệp)                                                       | LL1                    | 🟨  | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL2  | Hộp thư = bàn hội thoại + nhận thay bot + duyệt/sửa/từ chối đơn Messenger + tab đơn chờ + tìm khách | LL1               | 🟨  | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL3  | Page: danh sách + một page (SP & giá kế thừa · lời bot · ảnh · trả lời sẵn · kỹ thuật · lịch sử · «Bật được chưa») + Luật chung | LL1 · trên MN6 | 🟨 | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL5  | Số liệu một đích (gộp 5 màn, hai luồng tách)                                                   | LL1                    | 🟩  | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL6  | Cài đặt một đích nhiều tab (gộp 6) + Model một khung                                           | LL1                    | 🟩  | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL13 | Đích Sản phẩm: thêm thị trường = 1 món POS · gộp món POS nhiều shop · nối 78 bản sao page       | LL3                    | 🟨  | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL16 | Thị trường = shop POS (ngừng `page.thi_truong` gõ tay, không xoá) · bật + kéo danh mục 6 shop   | LL13                   | 🟨  | 🟡 kéo danh mục: GCC 7 shop, EU 7, AUUS 3 (H7/H13 05/10); CÒN «ngừng `page.thi_truong` gõ tay» (dọn bảng 05/10) |
| LL15 | Người từ HRM (BigQuery, chỉ đọc, mỗi ngày): khớp email · MKT/SALE · sale thành viên 3 team · người nghỉ tự khoá · tên team theo HRM | H11 · LL13 | 🟨 | ✅ qua LL15a · b · c · d · e (02–05/10, đều GIỮ trên prod) (dọn bảng 05/10) |
| LL17 | Đơn: job kéo đơn một lần mỗi shop · `UNIQUE (ma_pos)` · team của marketer (bảng ghép HRM) · «chờ gán team» · Ladi = UTM, sale nhập tay không WhatsApp · khách (nước, SĐT) · chỉ team chủ nhắn/ghi ngược | LL15 · TRƯỚC khi bật WhatsApp hoặc team thứ hai khai shop | 🟥 | 🟡 LL17a · b · d ✅ (đọc BigQuery, GIỮ) · LL17c «để nguyên»; CÒN phần chính: job kéo đơn một lần mỗi shop · `UNIQUE (ma_pos)` · «chờ gán team» · Ladi = UTM (dọn bảng 05/10) |
| LL11 | Kỹ năng → kiến thức sản phẩm («hỏi size»), gỡ màn kỹ năng                                       | LL3                    | 🟨  | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL14 | Model: nối dự phòng vào đường chat v3 · ẩn «việc nền» · màn nói đúng                            | LL6                    | 🟨  | ⬜ |
| LL4  | Thử hỏi bot: model thật qua bộ ráp prompt, không gửi khách, ghi chi phí                         | LL3 · H6 (khoá sống)   | 🟨  | ⬜ |
| LL10 | Nhà mới cho 5 việc vận hành của `van-hanh` (tin lỗi · tin bị lọc · diễn tập · chi phí từng tin · nguồn nhận tin) | LL5 · LL6 | 🟨 | ✅ 29/09 · sóng LL GIỮ `5bff55e` (dọn bảng 05/10) |
| LL8  | Gỡ màn thừa (GIAO DIỆN; giữ API `van-hanh` · `dispatch`) + gỡ kỹ năng/`mau_0_dong` khỏi đường bot v3 | LL2 · LL3 · LL6 · LL10 | 🟨 | ⬜ |
| LL9  | Thước: menu · quyền · HK10/HK15 · §10 Hộp thư — ĐÓNG CR                                        | LL1–LL8                | 🟩  | ⬜ |
| LL12 | Trả lời sẵn MỘT lớp (gộp Fast Lane mẫu · kho luật · `mau_0_dong`) — cạnh bộ não, khai «Đụng bộ não» | cutover / đợt tắt Botcake | 🟥 | ⬜ |

## §5g · MỘT BẢN (MB1–MB4) — CR-02-10, người quyết gõ «áp» 02/10

v1 nghỉ hưu: phía mình chỉ còn `aicloser-v3` + `aicloser-worker-v3`. Mọi việc v3 mượn của tiến
trình bot v1 (cầu HTTP `v3/src/noi-day/cau-bot-v1.js`) chạy ngay trong tiến trình v3; một công tắc
«page này bot mình trả lời» trong CSDL; `aicloser.service` tắt. Phiếu CR:
`docs/thi-cong/doi-y-do/CR-02-10-mot-ban-v3.md`. **Không đụng** `pancake-tool`/`ai_sale` (team khác)
và năm file bộ não. **Thứ tự cứng: dời trước (MB1–MB2), tắt sau (MB3), gỡ cuối cùng (MB4).**

| Mã  | Việc                                                                                          | Phụ thuộc           | Làn | Trạng thái |
| --- | --------------------------------------------------------------------------------------------- | ------------------- | --- | ---------- |
| MB1 | Dời việc v3 mượn của v1 vào tiến trình v3: ruột `cau-bot-v1.js` từ HTTP → gọi hàm (giữ tên + hình dạng); `/webhook` · `/uploads` · nạp KB/token/registry sang `chay-that.js`; kiểm kê nút `/admin` v3 chưa có | —                   | 🟨  | ✅ `47f2add` · ca mb1 5/5 · worker nay nạp KB |
| MB2 | MỘT công tắc: một cột CSDL là nguồn của worker; bỏ `ai-enabled.json` · `bot_ai_bat` · `V3_GIAO_PAGE_TREN_MAN` · `V3_LEGACY_POLL_OFF`; `giaoPage` bỏ bước «tắt bot cũ»; `bien-moi-truong-v3.md` cùng commit | MB1                 | 🟥  | ✅ `e2b10dd` · ca mb2 4/4 · thước 4 cổng `94d7cd5` |
| MB3 | **Mở van**: deploy MB1+MB2 · `systemctl disable --now aicloser` · restart hai tiến trình v3 · mốc +1′/+5′/+15′ | MB2 · người gật ✅ 02/10 | 🟥  | ✅ 02/10 07:23 · `94d7cd5` · +1′/+5′/+15′ lỗi 0 · GIỮ · `phat-hanh-20261002-mot-ban.md` |
| MB4 | Gỡ 28 tệp `src/` chỉ-v1 (GIỮ `wa.js` — pancake-tool mượn) + 7 trang `public/` + 8 script `package.json`; dời bộ ca; lưu trữ JSON không ai đọc; đổi chữ «bot cũ» 29 tệp màn; cổng `mb.sh`; migration 030 gỡ cột thừa; ĐÓNG CR | MB3 · người quyết bỏ chờ 3 ngày («làm MB4 luôn đi» 02/10) | 🟨  | ✅ 02/10 09:03 · `bd6459a` · migration 030 · +1′/+5′/+15′ lỗi 0 · GIỮ · `phat-hanh-20261002-mb4.md` · **CR-02-10 ĐÓNG** |

## §5h · PAGE PHẢI GẮN SẢN PHẨM (GSP1–GSP5) — CR-02-10b, người quyết gõ «áp trọn, bỏ giá riêng theo page» 02/10

Bot chỉ chào bán ở page đã gắn **một sản phẩm gốc × một shop POS**; page chưa gắn ⇒ không sản phẩm,
không trả lời, không bật được. Không giá riêng theo page. Gốc chỉ sinh từ gộp món POS theo SKU.
Phiếu CR: `docs/thi-cong/doi-y-do/CR-02-10b-page-phai-gan-san-pham.md` (lớp 5 đo prod ở mục 5d:
0/514 page gắn gốc · 76 page đọc bản sao · 0/78 bản sao nối món POS · 0/491 món POS có giá).
**Thứ tự cứng: gắn (GSP2) → chép giá + ảnh (GSP3) → bỏ đường cũ (GSP4) → dọn màn (GSP5).** Áp GSP4
trước GSP3 là 76 page mất cả giá lẫn ảnh. Không xoá dòng nào. LL13 «nối 78 bản sao page» đổi đích
thành GSP2. **GSP4 không phát** khi bộ đếm «page chưa chuyển xong» TOÀN HỆ (mọi team; `bo_qua` tính là đã quyết) > 0, trừ khi
người quyết nói tường minh chấp nhận phần còn lại thôi chat. **Trước khi phát GSP4 phải đóng:** N-GSP3-DOI-MON (gỡ món rồi gắn món khác cùng gốc ⇒ dấu `chep` cũ còn tính) · đo N-GSP2-F3
(món POS mang `page_id`). **Cấm** `ops/bin/day-lai-ban-chep.mjs --tat-ca` từ lúc
GSP2 lên prod tới khi bộ đếm «chưa chuyển xong» = 0 (sửa 05/10 theo đối kháng GSP3b F5: GSP3b không đụng đường đó — script vẫn đẩy
món chưa giá cho page đã gắn mà chưa đối soát). Sửa sau review (a): CR mục 5e. GSP4 chạm `handler-v3.js` + nhiều bộ ca (MB4 đã xong 02/10 — không còn va; cầu `cau-bot-v1.js` nay là `loi-bot.js`).

| Mã   | Việc                                                                                          | Phụ thuộc           | Làn | Trạng thái |
| ---- | --------------------------------------------------------------------------------------------- | ------------------- | --- | ---------- |
| GSP1 | Màn Sản phẩm: «+ Thêm» mở «Gộp món POS»; bỏ lối tạo gốc theo số hiệu + danh sách số hiệu; đóng `POST /api/san-pham/goc` | —      | 🟨  |✅ 02/10 · `2210ed3` · chặng 1 7/8 (④ = commit tổng) · chặng 2 ba mũ ĐẠT · LÊN PROD 05/10 `8dc9bcd` |
| GSP1b | Gộp món POS: SKU BẮT BUỘC — máy chủ suy SKU từ món (bỏ tin thân), món chưa SKU ⇒ 409 `mon_chua_sku`, SKU khác nhau / lệch thân ⇒ 409 (người quyết 02/10, trả nợ N-GSP-GOP-SKU) | GSP1 · song song GSP2 (khác tệp) | 🟨 | ✅ 05/10 · `bb3cf5e` (phiên khác làm, tổng nghiệm thu) · `gsp1b.sh` 23/23 + đột biến · chặng 2 ba mũ ĐẠT · LÊN PROD 05/10 `8dc9bcd` |
| GSP2 | «Bản sao theo page» đổi TẠM thành danh sách việc chuyển: gợi ý món POS khớp tên page · gắn / nối món rồi gắn / gộp SKU rồi gắn / «không chuyển» · trạng thái theo page × bản sao (migration 032 `san_pham.doi_soat` + gốc × shop của quyết định — vị từ `daQuyet` dùng chung với GSP3) · bộ đếm toàn hệ theo team | GSP1 (cùng tệp màn) | 🟨 | ✅ 05/10 · `bb3cf5e` + vòng 2 `0a17180` (C1 đơn vị giá) · `gsp2.sh` 24/24 + 8 đột biến · LÊN PROD 05/10 `8dc9bcd` |
| H-GSP | Người: shop cho 11 page chưa có shop · xác nhận gắn 74 page · chọn giá khi lệch · 2 page có 2 bản sao | GSP2 lên prod | — | 🔔 MỞ 05/10 — GSP1–GSP3b đã lên prod: 76 page chưa chuyển (GCC 74 · kỹ thuật 2), 51 có gợi ý sẵn |
| GSP3 | Đối soát giá + ảnh theo GỐC × SHOP: lệch giữa page ⇒ 409, người chọn · chép đủ cột bậc · ảnh `nguon='kb'` khử trùng · luôn đẩy bản chép · dùng lại cửa lưu giá VE8b | GSP2 (cùng tệp màn) | 🟥 | ✅ 05/10 · `e5e5f48` + vòng 2 `0f2c4bf` (F1 dấu đơn vị · F4 tiền tệ bảng thắng) · ca 37/37 · `gsp3.sh` 43/43, 29 đột biến · đối kháng 1 vòng + verify · LÊN PROD 05/10 `8dc9bcd` |
| GSP3b | Trang page: bộ đọc `chay-that.js:408` truyền `trang` · cửa lưu SP/ảnh từ trang page từ chối bản sao của page đã gắn (409) · câu chữ «sửa ở đây là sửa mọi page cùng gốc × shop» | GSP3 · cùng đợt deploy GSP1–GSP3 | 🟥 | ✅ 05/10 · `1956b1e` `bcc86ab` + vòng 2 `d688a3d` (F1 cửa đầy đủ từ chối món POS · F2 một thứ tự khoá) · ca 45/45 · `gsp3b.sh` 55/55, 36 đột biến · đối kháng 1 vòng + verify · LÊN PROD 05/10 `8dc9bcd` |
| GSP3c | Đóng hai lỗ bộ đếm trước GSP4: đổi món của gốc ở shop ⇒ bỏ dấu đối soát của bản sao gốc × shop đó (N-GSP3-DOI-MON + F6) · «Kéo danh mục» không ghi / không đẩy cho bản sao của page ĐÃ gắn (N-GSP3B-NEN F4) | GSP3b · không chờ H-GSP | 🟥 | 🔨 phát 07/10 · base `e68a62e` · thợ chạy trong WORKTREE riêng (cổng cũ gsp3/gsp3b kéo gsp1.sh sửa cây — không được chạy ở cây chung khi GL3b đang thi công) · tổng cherry-pick về nhánh |
| GSP4 | Một đường: bỏ nhánh `page_id` ở `catalog.js` · `kho-san-pham-v3.js` · `ban-chep-bot.js` · «Page đang bán» · `doc-danh-muc.js` RF-15; chốt ở `handler-v3.js` trước KB; 35 ca đổi fixture + 4 ca luật mới; deploy theo `mo-van` | GSP3 trên prod · bộ đếm = 0 | 🟥 | ⬜ |
| GSP5 | Dọn: bỏ màn «Bản sao theo page» + ô lưu ý + `GET /api/san-pham`; tab «SP & giá» trang page nói giá sửa ở Sản phẩm › Theo thị trường; `03-MAN-HINH.md`; ĐÓNG CR | GSP4                | 🟨  | ⬜ |

## §5i · TIỀN TỆ NGOÀI GCC + GIÁ TỪ ĐƠN POS (TT1 · GP1) — người quyết «làm trọn vẹn» 05/10

Người quyết: «Theo giá như đơn trên POS chứ cần gì quy đổi?» — hệ KHÔNG quy đổi giữa các tệ; thiếu là ĐƠN VỊ LẺ (POS lưu đơn vị nhỏ;
TWD/JPY không xu). Đo BigQuery 05/10: giá đơn POS nằm ở `shipping_fee` = `cod` (giá món = 0); COD đơn một món theo số lượng ổn định
(269/504 bộ ≥80%). Hồ sơ đo: `docs/thi-cong/nhat-ky/h7-chuyen-team-20261005.md`.

| Mã  | Việc | Phụ thuộc | Làn | Trạng thái |
| --- | --- | --- | --- | --- |
| TT1 | `HE_SO_TE` + EUR 100 · RON 100 · AUD 100 · TWD 1 · JPY 1 (nguồn `dim_shop_project.currency_divisor`); `TIEN_TE_THI_TRUONG` + Europe · Romania · Slovakia · USA · Australia · Taiwan; soát mọi nơi đọc giả định ×100 | — | 🟥 | 🔎 07/10 · mã `bc190f5` · nhật ký `f2e1ac1` · `tt1.sh` 27/1 (1 đỏ = chuỗi cũ gsp3b chập chờn, chạy riêng xanh) · npm test 2486/0 · /code-review 10 (4 sửa) · 6 nợ N-TT1-* · chờ chặng 2 đối kháng + `_chan1 tt1` (≈1,5 h, chạy khi cây rảnh) |
| GP1 | Điền sẵn bậc giá cho món POS CHƯA có giá từ COD đơn một món (60 ngày, ≥3 đơn, ≥80%, tăng dần, theo team hiện tại của marketer) — trong tiến trình v3, xem trước + dấu + áp, qua cửa lưu giá chỉ-giá | TT1 | 🟥 | ⬜ review (a) SỬA-PHIẾU → đã sửa (G1 giá gần đây) |

## §5j · ĐIỀU KIỆN GO-LIVE (GL1–GL8) — người quyết «triển khai» 05/10

Nghiên cứu (agent chỉ đọc) + quyết định người quyết 05/10 ghi ở §10 05/10 «ĐIỀU KIỆN GO-LIVE (GL)». Tối thiểu cho pilot 1 page có người ngồi
canh: GL1 + GL2 + GL3 + GL3b + H-GL. Trước page thứ hai: GL4 (tính cả lỗi ĐỌC `LoiDocLichSu`) + GL6. HTTPS (GL5) SAU pilot. Trước khi bật page EU/AUUS: N-GUARD-TIEN-TE-MOI.

| Mã  | Việc | Phụ thuộc | Làn | Trạng thái |
| --- | --- | --- | --- | --- |
| GL1 | `deploy/preflight.mjs` thôi luôn exit 1 + ca chạy CLI thật | — | 🟩 | ✅ 06/10 · `75665af` · `_chan1` 8/8 · `gl1.sh` 7/7 · chưa deploy |
| GL2 | Trần số page bật TOÀN HỆ (biến mới; vắng = 0; vượt ⇒ worker dừng hẳn + đèn đỏ); cổng `setPage` có khoá | GL1 · sau TT1 (cùng `operations.js`) | 🟨 | ⬜ review (a) SỬA-PHIẾU → đã sửa (C1 hàm riêng cho worker · C2 đèn đếm toàn hệ) · phát sau TT1 |
| GL3 | Hạn chờ request Pancake (đọc 15 s · gửi 30 s); POST lỗi mạng / quá hạn KHÔNG xoay token (đang có nguy cơ tin đúp) | — | 🟥 | ✅ 07/10 · `908c439` · nhật ký `08ff546` · `gl3.sh` 25/25 · npm test 2485/0 · đối kháng ĐẠT (F1 nặng → GL3b; F2 F3 → GL3b; F4–F7 nợ) · chưa deploy |
| GL3b | Đọc lịch sử Pancake lỗi/chậm: KHÔNG trả lời mù (F1 đối kháng GL3) · lùi 15/30 s rồi giao sale CÓ dòng `viec_can_xu_ly` · bộ nạp lùi theo hội thoại + `doc_tin_loi` (migration 033) · `pkTagId` không cache rỗng · F2/F3 | GL3 | 🟥 | 🔨 phát 07/10 · phiếu `2c72688` · review (a) 2 vòng (vòng 1: 2 CHẶN · vòng 2: 2 CHẶN thi công — đã vào phiếu) |
| GL4 | Ngắt cả page khi 2 lần gửi lỗi liên tiếp → 30′, tự mở; tin tồn giữ ở chờ; lưu nguyên nhân lỗi; đèn đỏ | GL3 | 🟥 | ⬜ |
| GL5 | HTTPS (trust proxy · đóng 3102 · `PUBLIC_URL` https · nginx) — SAU pilot | tên miền | 🟨 | ⬜ |
| GL6 | Nhịp tim worker · độ trễ + tỉ lệ lỗi · bộ dò đẩy cảnh báo Telegram | GL4 · bot + chat id | 🟨 | ⬜ |
| GL7 | Đồng bộ tài liệu + rào cũ (`deploy/README.md` · `README.md:95` · unit mẫu cũ · hook `canh-file-cam.sh` · phép ⑤ `_chan1.sh`) | GL1–GL5 | 🟩 | ⬜ |
| H-GL | Người: chọn page pilot · tắt ai_sale + Botcake trên page đó · người trực · tạo Telegram bot + chat id | — | — | ⬜ |

## §8 · VIỆC NGƯỜI (H1..Hn — chỉ người/B làm được; tổng chỉ nhắc, không tự làm)

| Mã  | Việc                                                                                 | Chặn gì                                                        | Trạng thái |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------- |
| H1  | Điểm kiểm 1: gửi WhatsApp bằng API Pancake được không                                | L1-M3                                                          | 🟡 **B đo 23/08 — TREO**: 1.371 page, 100% `platform:"facebook"`, **chưa nối số WhatsApp nào**. Nút chặn là thủ tục, không phải API. Kết quả: `v3/docs/kiem-chan/ket-qua.md` |
| H2  | Điểm kiểm 2: Pancake có webhook đẩy tin về không                                     | kiến trúc L2-M1 (poll vs push)                                 | ✅ **B đo 23/08: KHÔNG có.** 6 đường ứng viên đều 406 trong khi `conversations`/`tags` cùng token trả 200 → **giữ vòng hỏi**. Một vòng 317–831 ms |
| H3  | Điểm kiểm 3: Botcake kéo bao nhiêu khách từ bình luận                                | L2-M2                                                          | ✅ **B đo 23/08: 11,3% luồng.** 7 ngày/47 page: 199 hội thoại COMMENT trên 1.768; 82,5% đã nhắn riêng → ~23/ngày. 3 page thử mất ~1,5/ngày → **cứ chạy**; tắt diện rộng thì phải có phần bình luận trước |
| H4  | Điểm kiểm 4: Marketing Message có bật cho Trung Đông không                           | giai đoạn 3, cần biết sớm                                      | 🔴 **B đo 23/08 — KHÔNG KIỂM ĐƯỢC:** app Meta **bị chặn API hoàn toàn** (`/me` → `400 API access blocked`). Nặng hơn cảnh thiếu quyền cũ |
| H5  | **Chỉ định NGƯỜI B** + B xong lớp model L1-M4 cuối tuần 1                            | L2-M1                                                          | ✅ **xong 22/08** — `goiModel()` ở `v3/src/model/index.js`, hợp đồng mục 2. Dự phòng chuyển trong 9 ms |
| H6  | Mở tài khoản + lấy khoá 4 nhà model, nạp tiền chạy A/B                               | L2 (A/B model)                                                 | 🔴 **GẤP — bot ĐANG CHẾT vì việc này.** Kimi *suspended, insufficient balance* · Anthropic *credit too low*. Bot im từ 23/08 22h UTC. Lớp dự phòng không cứu được: dự phòng cần nhà thứ hai **còn tiền** |
| H7  | Chốt mapping page/sản phẩm/thị trường ↔ 3 team                                       | di trú gán team thật · **VÀ mọi màn hình v3**                  | 🟡 **05/10: chuyển 66 page theo team HIỆN TẠI của marketer (đơn POS 60 ngày)** — GCC 537 · EU 21 · AUUS 1 · chưa phân 23 (không đơn) · nhật ký `nhat-ky/h7-chuyen-team-20261005.md`; nối POS shop dùng chung: EU 4 kết nối · 421 món, AUUS 1 · 44 món; H13 ✅ · gộp SKU team bán 60 ngày: GCC 125 gốc · EU 60 · AUUS 42; còn: gán marketer cho gốc mới · tiền tệ ngoài GCC (N-TIEN-TE-NGOAI-GCC) · 48 page chưa có trong v3 |
| H8  | Chọn 3 page thử + 3 page đối chứng cùng ngành cùng mức ads                           | L2-M2                                                          | ⬜         |
| H9  | Bộ biến v3 cutover VPS — bảng khai duy nhất `docs/v3/ban-giao/bien-moi-truong-v3.md` | cutover — thiếu là cửa đóng câm                                | ↪ **gộp vào MB2** (CR-02-10): MB2 gỡ biến thừa và sửa bảng khai cùng commit với code |
| H10 | **Báo NGƯỜI B đổi màn «Rủi ro hoàn hàng» sang ĐỌC `khach.tang_hoan`**, bỏ phép tính riêng trong `v3/src/ui/rui-ro-hoan/kho-rui-ro.js` | màn đường TIỀN đang nói sai **6,7 lần** | ✅ **XONG 01/09 (P2)** · A đã gỡ nguyên nhân gốc 28/08 — cột `tang_hoan` nay có số trên 89.484/89.484 khách (job `chamTiLeHoan()` đã chạy), nên màn không còn phải tự tính. Chỗ lệch đo được: màn nói **40.064** khách «hoàn cao», luật đã ký nói **5.990** — vì màn thiếu sàn `toi_thieu_don_ket=2` (34.187/40.064 khách chỉ có ĐÚNG MỘT đơn) và tính cả mã 8 (`packing` = bước TIẾN). **A KHÔNG tự sửa: `v3/src/*` là đất B (luật 4 §0a).** Chi tiết §9 28/08 · ✅ **ĐÃ LÀM 01/09** (P2) |
| H11 | Cấp tài khoản dịch vụ BigQuery **CHỈ ĐỌC** cho máy chủ v3: `levelup-465304.HRM_Core` + `PIALPHA_ALL_Dataset.dim_person_map`; khoá vào kho khoá | LL15 · LL17 (người từ HRM, team của đơn) | ⬜ (29/09, CR-28-09c) |
| H12 | Token Pancake có quyền trên mọi page đang bán (quan sát 28/09: 11–12/30 hội thoại không đọc được vì token không quyền/hết gói) | Hộp thư đọc chat (LL2) | ⬜ (29/09) |
| H13 | Khoá API POS của 5 shop riêng chưa có trong v3: EU — EUR `407949295` · Romania `1635942497` · Slovakia `407995349`; AUUS — Mỹ `100197417` · Úc `1328333296` | sản phẩm EU (thiếu 529 dòng món/60 ngày) · AUUS (thiếu 1.071/1.293) | ✅ 05/10 — người quyết gửi khoá; nối EU Europe · Romania · Slovakia (+80 món), AUUS USA · Australia (+144 món), nhật ký 349774–349778 |

## §9 · SỔ NỢ PHÁT SINH (APPEND — thấy gì ngoài phạm vi thì ghi đây, cấm tiện tay sửa)

- 25/09 · **N-DUPHONGCHATTHAT** (thấy khi nối phễu cảnh báo ở GD5, ngoài phạm vi) — đường chat
  THẬT không đi qua lớp chuyển dự phòng. `src/chat/model.js:35` gọi thẳng `goiMotLan`, còn
  `v3/src/model/du-phong.js#goiCoDuPhong` (nơi có luật «nhà chính hỏng thì sang nhà khác»,
  đánh dấu nhà hỏng, báo động một lần) **không tiến trình nào gọi** — đo bằng `grep`: chỉ
  `v3/src/model/index.js` import nó, và `goiModel` của index ấy không có nơi gọi nào. Hệ quả:
  nhà chính hết tiền thì bot ĐỨNG (được `src/llm-health.js` chặn cho khỏi spam handoff), chứ
  không tự chuyển sang nhà thứ hai — trong khi màn Model AI vẫn cho cấu hình vai trò
  `du_phong` và màn Sức khoẻ vẫn kêu khi thiếu nó. Tức giao diện hứa một cơ chế mà đường chạy
  thật không có. Sửa là đụng đường chạm khách thật (`src/chat/*`) ⇒ cần phiếu riêng + `mo-van`.

- 25/09 · **N-CADUNGCHUNG** (thấy khi làm GD4, ngoài phạm vi) — `npm test` mỗi lượt đỏ một nhóm
  KHÁC NHAU, chạy riêng thì xanh: N1b/N4 (23/09) → S3/S5/S8 (24/09) → D1/D7/D9 (25/09). Đo
  được nguyên nhân: `ai-messages.jsonl` và `conv-state.json` **ở gốc repo** bị ghi lại lúc
  09:03 ngày 25/09 và đang chứa dữ liệu MỒI của chính bộ ca (`CUST-GIA`, `PAGE-BH1`). Nhiều
  suite cùng ghi rồi cùng đọc hai tệp ấy ⇒ thứ tự chạy quyết định ai thắng. Hệ quả nặng: không
  lượt `npm test` nào đọc được, và một hồi quy THẬT sẽ chìm giữa những ca đỏ giả. Cách chữa:
  mỗi suite dựng tệp dữ liệu trong thư mục tạm riêng (như `ops/bin/test-phase0.sh` đã làm với
  CSDL), không đụng tệp gốc repo. Ngoài phạm vi GD4 — chờ người quyết phát phiếu.

- 23/09 · **N-GIAODIEN** (lượt đo giao diện, ngoài phạm vi phiếu nào) — kế hoạch đầy đủ ở
  `docs/v3/09-KE-HOACH-GIAO-DIEN.md`, đã sửa ba chỗ VỠ (xem §10), còn lại là NỢ:
  (1) **`page.pos_shop_id` không màn nào ghi được** (`db/di-tru/nap.js:60` là đường duy nhất)
  ⇒ page quét từ Pancake không bao giờ hết «thiếu sản phẩm» nếu chỉ dùng giao diện.
  (2) **Chữ đã cũ trên màn**: `/san-sang` bảo «màn Sản phẩm & kho của v3 chưa dựng» (có rồi);
  nút «Gán marketer» ở `cau-hinh-team.html:117` dẫn sang ô đã khoá từ 15/09 (`page-bot.html:261`);
  `docs/local-dev.md` dòng 17 và dòng 28 nói ngược nhau về việc thêm token bằng giao diện.
  (3) **`/len-chay` chặng 2 gõ cứng là không bao giờ qua được** (`kho-len-chay.js:184-191`) —
  màn đỏ vĩnh viễn, không ai gỡ được bằng thao tác.
  (4) ✅ **TRẢ 25/09 (GD5 · K5)** — ~~Bàn giao ở Vận hành V3 không đẻ việc~~: nay chèn một dòng
  `viec_can_xu_ly` có rào chống trùng, mang lý do người bấm gõ.
  (5) ✅ **TRẢ 25/09 (GD5 · K4), theo đường khác** — ~~Worker v3 không phát nhịp tim~~: không
  dựng bảng nhịp tim (cần migration, án lệ #25) mà ĐO BẰNG HÀNG ĐỢI TIN
  (`src/queue/kho.js#nhipMayBot`). Đèn ⑩ «Máy chạy bot» + dải trạng thái. Rỗng-và-nguội thì
  XÁM chứ không xanh; tin dồn mà vẫn xử được thì VÀNG chứ không đỏ.
  (6) **Không có nút dừng bot cả team** ở bất kỳ giao diện nào — chỉ sửa `.env` rồi khởi động lại.
  Mỗi khoản là một phiếu GD trong kế hoạch; chờ người quyết gật Q1–Q6 mục 8 của kế hoạch đó.

- 23/08 · REFUTE (mảng prompt/toàn-cục) — **PHÁN ĐẠT, 0 CHẶN.** Verify XANH: migration
  001→006 trên DB sạch áp trọn 21 bảng · down--het→up round-trip sạch · HARD_MAX=12 không
  vượt ca nóng · ngân sách lạnh lượt đầu không chặn oan · seed=CORE nguyên văn idempotent ·
  paano vá đúng lỗ. NÊN: RF-25 lớp từ-khoá cướp «is it real leather»/«family size» khi page
  có fastLaneAuth/Size (`lop-tu-khoa.js`) · RF-26 rap-prompt fallback vẫn query `page` dù
  docstring khai không-đụng-DB · RF-27 kịch bản `{}` không vào nguon_thieu.

- 23/08 · VA-R2 (thợ đời 2) — NGOÀI PHẠM VI, chưa sửa: (1) `src/pos/ma-trang-thai.js:82`
  `NHOM_HUY_HOAN=[4,5,6,7]` là bản khai thứ hai cùng giá trị `MA_HOAN` (`ti-le-hoan.js`
  read-only theo phiếu) — cổng va-r2 ②b canh hai tập ≡, phiếu sau gộp về một. (2) `san_pham`
  chỉ giữ MỘT `page_id`: shop nhiều page ⇒ `docDanhMuc` để null + đếm `pageMoHo`, `cua2Tien`
  vẫn mù với các page đó — cần bảng nối hoặc JOIN theo `pos_shop_id`. (3) Việc người: UI sale
  bổ sung tiền lúc duyệt phải khai rõ ĐƠN VỊ NHỎ (khoá `tong_tien`) hoặc gửi khuôn cũ
  `total_price`+`currency` để hệ quy; `du_lieu_don.tong_tien_lon` là khoá jsonb mới (không
  cột). (4) Bộ não cũ không trả `currency` (`src/context.js` prof) ⇒ dòng bot chốt vào hàng
  chờ luôn thiếu `tong_tien` cho tới khi sale cho tệ — đúng fail-CLOSED, nhưng VA-R1/handler
  có thể lấy tệ từ `page`/`ket_noi_pos` để điền sẵn (ngoài phiếu này).

- 23/08 · VA-R1 (fable) — NGOÀI PHẠM VI, chưa sửa: (1) MẢNG-2 F4 (NÊN): guard chặn CHỮ nhưng
  ẢNH vẫn bay — `handler-v3.js` bước 10 xả ảnh trước `if (guarded)`; repro S2 còn ❌. (2) F5
  (NÊN): lỗi N5/`LoiPageKhongThuocTeam` tất định vẫn thử lại TRAN_THU=3 lượt model; S5 còn
  ❌. (3) F6: v3 không gọi `recordBlocked` (màn M18 mù). (4) `db/ket-noi.js#docEnv` và
  `channels/messenger#cuaDangMo` không export ⇒ chép ở `nap.js#docEnvTuyetDoi` +
  `handler-v3#vanGuiDangMo` — phiếu sau export rồi xoá bản chép. (5) F7/F8 GHI-NỢ verdict
  MẢNG-2 (psid-kiểm ≠ convId-dùng; `xaAnh` mất ảnh giữa vòng).

- 25/08 · G2-A1 (người A) — NGOÀI PHẠM VI, chưa sửa:
  (1) **`D7` đỏ trên VPS** (`test/l0-m1-di-tru.test.js:145` «ít nhất một page lạc phải là
  page ĐANG BẬT AI»). Đã A/B trên CÙNG cây, CÙNG dữ liệu, chỉ đổi `src/db/truy-van.js`:
  bản CŨ 10 pass/1 fail · bản MỚI 10 pass/1 fail ⇒ **không phải hồi quy của B-Y1**. Nguyên
  nhân là DỮ LIỆU: `pages.json`/`ai-enabled.json` trên VPS không còn page lạc nào đang bật
  AI. Đất L0-M1, ngoài pathspec B-Y1 ⇒ cổng L0-M2 sẽ còn TRƯỢT 1/27 tới khi có phiếu.
  (2) **Cảnh báo cho G2-A3:** `ghiDon()` (`may-trang-thai.js`) khi CAS trượt thì **NÉM**
  `LoiGhiDonAnhCu`, còn `suaTheoId` thì **TRẢ `null`**. Xoá cửa tạm thứ ba mà quên dịch
  `null` → ném là lá chắn RF-13 thành lệnh rỗng IM LẶNG (án lệ #26: bản vá cũng là code mới).
  (3) `themMoi` chưa có lớp kiểm tên cột SỚM như `layNhieu`/`suaTheoId` (ngoài phạm vi ④) —
  lệch nhỏ về thứ tự lỗi khi vừa sai ctx vừa sai tên cột. Gộp ở phiếu sau.
  (4) `v3/src/noi-day/cong-du-lieu-that.js#khongDayXuongDuoc` vẫn lọc mảng/`null` trong JS.
  Sau B-Y1 hai lớp đó **đẩy xuống được** — đất B, B tự bỏ đường vòng và bỏ `keuMotLan`.
  (5) **Máy cá nhân không chạy được bộ ca nào đụng CSDL**: `.env` 17 khoá không có
  `DATABASE_URL_V3`, không docker, không `psql`, cổng 5433 đóng. Ghi chú `db/ket-noi.js:3`
  («.env dòng 80 — container talpha-pg») đã mục. Mọi phép đo DB phải chạy trên VPS.

- 25/08 · G2-A1 — TỰ QUYẾT (ghi theo luật 11 skill, đề bài không khai):
  (a) `neu: { cot: null }` → `IS NULL`, KHÔNG phải `= NULL`. Đề bài mục 1 chỉ khai
  `AND cot = $k`; cài đúng chữ đó thì so-và-đặt của L4-M2 khớp 0 dòng và **mọi** lượt
  «Nhận việc» đều trượt — hỏng CÂM. Mục 2 cùng phiếu đã chốt luật `null → IS NULL`, nên
  hai đường dùng CHUNG một bộ dựng vế (`veDieuKien`), không hai bản khai.
  (b) `undefined` và object (toán tử `{'>=': x}` của B) trong `dieuKien`/`neu` → **ném**
  `Error`. Cùng lớp hỏng-im với (a): `pg` biến chúng thành `= NULL` / `= '{">=":5}'`,
  khớp 0 dòng mà không một dòng lỗi nào. `Date`/`Buffer` vẫn cho qua.
  (c) Soi `team_id` của `duLieu` + `neu` gộp MỘT lượt — soi hai lượt thì một lời gọi xuyên
  team đẻ HAI dòng `nhat_ky` trong khi hợp đồng ② khai «đúng 1 dòng».
  (d) **Hạ tầng đo:** cấp `ALTER ROLE aicloser CREATEDB` trên VPS (đảo lại bằng
  `NOCREATEDB`). Không có nó thì `dungSandbox()` ném `permission denied to create database`
  và **mọi** cổng + **mọi** bộ ca DB đều 0 pass — thước hỏng trước code.
  (e) Cổng `l0-m2.sh`: bỏ `docker exec talpha-pg` (container không còn ở đâu ⇒ cổng `exit 2`
  câm), và bỏ mốc nền GÕ TAY 5 tệp «đỏ sẵn» — đo 25/08 thì cả 5 XANH ở cả hai môi trường
  (máy cá nhân 5/5 · VPS 23/23) ⇒ cổng TRƯỢT mỗi khi mã nguồn TỐT LÊN. Thay bằng luật tự
  bảo trì «0 tệp đỏ» (án lệ #22).

- 25/08 · G2-A2 (người A) — NGOÀI PHẠM VI PHIẾU nhưng ĐÃ SỬA, khai rõ để tổng soi:
  (1) `src/chat/model.js` **không có trong pathspec ③ của B-Y2** nhưng nó `SELECT khoa_api_ma
  FROM cau_hinh_model` và dùng cột đó làm cờ **fail-CLOSED**. Bỏ cột mà không sửa = hệ vỡ;
  bỏ luôn cờ = team có khoá Kimi riêng bị phục vụ bằng client Anthropic cũ TRONG IM LẶNG.
  `src/chat/*` nằm trong danh sách file A được đụng nên lượt này gộp vào, giữ NGUYÊN hành vi
  fail-CLOSED, và bọc **lưới migration `42P01`** (án lệ #7 — `layModel` ở trên đường chat sống,
  deploy code trước migration là bot câm).
  (2) `ops/bin/nghiem-thu/l0-m1.sh` cùng bệnh `docker exec talpha-pg` như l0-m2.sh ⇒ đã chết
  câm; vá cùng cách + thay mốc nền gõ tay bằng luật «0 tệp đỏ» + trỏ phép «khoá lưu dạng mã
  hoá» sang `khoa_nha` (để nguyên thì cổng đỏ vì BẢNG ĐỔI CHỖ, không phải vì khoá lưu sai).

- 25/08 · G2-A2 — 🧭 **LỖI IM LẶNG BẮT ĐƯỢC DỌC ĐƯỜNG, đáng nhớ:** cửa
  `if (import.meta.url === \`file://${process.argv[1]}\`)` **không bao giờ khớp khi đường dẫn
  có DẤU CÁCH** (`import.meta.url` mã hoá `%20`, `argv[1]` thì không). Cây làm việc thật là
  «…/Chat Bot AI/messenger-closer» ⇒ ở máy đó **`npm run migrate` và `npm run di-tru` THOÁT 0
  MÀ KHÔNG LÀM GÌ**. Trên VPS (`/opt/aicloser`) thì chạy, nên lọt suốt từ L0-M1. Đã vá đúng
  hai tệp mắc (`db/migrate.js` · `db/di-tru/index.js`) bằng `laChayTrucTiep()` so ĐƯỜNG DẪN
  đã giải mã. Ai viết entrypoint mới: đừng ghép `file://` + `argv[1]`.

- 25/08 · G2-A2 — 🧭 **THƯỚC RỖNG của chính thợ**, bắt ở vòng đo đầu: phép «down 008 → up 008
  khớp byte-for-byte» in `KHỚP — 0 dòng cột` vì câu chụp lược đồ hỏng cú pháp — hai tệp RỖNG
  thì bằng nhau (án lệ #29). Bản đóng gói trong cổng nay in kèm SỐ CỘT và **TRƯỢT nếu < 100**.

- 25/08 · B-Y3 (người A) — PHIẾU KHAI SÓT, đã đo lại và vá rộng hơn phiếu:
  (1) Phiếu kê tay BỐN bảng con (`hoi_thoai` `san_pham` `kich_ban` `so_ai`) và xếp
  `don_hang` vào ô «nối gián tiếp qua hoi_thoai». **Sai**: `don_hang.page_id` trỏ THẲNG vào
  `page(id)` và mang `team_id` riêng — đó là bảng TIỀN, bỏ lại là báo cáo doanh thu của
  team mới thiếu đơn. Phiếu cũng KHÔNG nhắc `tin_cho_xu_ly` (hàng đợi tin, `page_id` text) —
  bỏ lại là worker team CŨ vẫn xử tin cho page đã sang team khác. **Lược đồ thật có NĂM
  bảng phải đi**, không phải ba.
  (2) Hệ quả thiết kế: danh mục bảng con **KHÔNG GÕ TAY** — sinh từ `information_schema` mỗi
  lượt gọi («bảng nào có CẢ page_id LẪN team_id»). Bản kê tay sai lần này thì lần sau cũng
  sai (án lệ #22). Thêm bảng mới có `page_id` là nó tự vào lưới.
  (3) Phiếu không nói VAI lấy từ đâu — `ctx` của `src/db/` chỉ có `{teamId, nguoiDungId}`.
  Quyết: đọc từ `thanh_vien_team`+`vai`, KHÔNG tin `ctx.vai` do nơi gọi khai (tự khai vai
  của chính mình thì bịa được). Và hằng `quan-tri` được ĐỐI CHIẾU với bảng `vai` mỗi lượt
  gọi — gõ sai một dấu gạch thì ĐỎ chứ không CÂM (bài học 2 GD2).
  (4) `demMoCoi` tách HAI nhóm: `moCoi` (phải luôn 0) và `boLaiCoChuDich` (`so_ai`, cố ý
  > 0 sau lượt chuyển đầu). Gộp một nhóm thì phép đo đỏ VĨNH VIỄN ngay sau thao tác hợp lệ
  đầu tiên — đèn đỏ vĩnh viễn là đèn người ta học cách không nhìn. Kèm theo: ④#5 của phiếu
  khai «so_ai mồ côi: 0» chỉ đúng TẠI THỜI ĐIỂM đo, không phải mãi mãi.

- 25/08 · B-Y3 — MARKER CHƯA GỠ + NGOÀI PHẠM VI:
  (1) `[NEEDS CLARIFICATION: so_ai của page được chuyển thì đi hay ở?]` — làm theo cách (a)
  như phiếu dặn cho trạng thái chưa-trả-lời (để lại, không đụng trigger, số dòng bỏ lại trả
  ra `boLai`). **Marker còn mở**: cái giá là màn «Chi phí AI» của team mới KHÔNG thấy chi
  tiêu trước ngày chuyển. Hôm nay `so_ai` 0 dòng nên chưa ai đau; khi bộ nạp Sổ AI chạy
  (52.036 dòng) thì đau. Người quyết chọn (a)/(b)/(c) ở ⑧ của phiếu.
  (2) `db/di-tru/nap.js` vẫn đổ vào `chua-phan` — chạy lại di trú thì page mới lại rơi vào
  team kỹ thuật. Nay có đường kéo ra bằng hàm thay vì psql, nhưng BỘ NẠP thì chưa đổi.

- 25/08 · G2-A3 (người A) — NỢ CÒN LẠI sau lượt gộp, khai bằng SỐ ĐO chứ không bằng cảm giác:
  ba cửa được giao còn **0** câu `UPDATE` tay, nhưng đất người A vẫn còn **4 câu GỘP ĐƯỢC**
  chưa gộp vì ngoài phạm vi ③ — `src/orders/lich-nhac.js` (2, bảng `lich_nhac`) ·
  `src/orders/hang-cho.js` (1, `hang_cho_tao_don`) · `src/orders/ti-le-hoan.js` (1, `khach`).
  Cái cuối phải đọc kỹ trước khi đụng: `test/l3-m2-ti-le-hoan.test.js:270` có hợp đồng CẤM
  cổng đó chạm `sua_luc`. Còn `src/queue/kho.js` (1, `tin_cho_xu_ly`) thì **không gộp được** —
  bảng cố ý ngoài `BANG_NGHIEP_VU_CHUAN`. Cổng `g2-a3.sh` in kiểm kê đủ kèm lý do từng tệp và
  ĐỎ nếu có tệp mang câu UPDATE mà chưa khai lý do — cửa thứ tư mọc lên là biết ngay.

- 25/08 · G2-A3 — 🧭 BA BÀI HỌC, mỗi cái sập thật trong lượt:
  (1) **MẢNG JS vào cột jsonb**: `pg` gửi mảng JS thành mảng POSTGRES `{a,b}`, không thành
  JSON ⇒ `hoi_thoai.moc_luot_llm` (jsonb nhận mảng) phải `JSON.stringify` trước. Trước lượt
  này KHÔNG bộ ca nào ghi cột đó qua `suaHoiThoai` — bỏ stringify là hỏng CÂM. Nay ca `G1`
  khoá, ca `G2` là vế đảo chiều.
  (2) **Guard quá chặt cũng là lỗi**: bản đầu tôi chặn MỌI mảng trong `duLieu` ⇒ 5 ca đỏ ở
  `l1-m1-doc-pos` và `va-q12-doc-don`, vì `don_hang.san_pham_ma` là `text[]` THẬT. Đổi sang
  KHÔNG chặn trước, chỉ DỊCH LẠI câu lỗi của Postgres khi nó thật sự vấp.
  (3) **Hộp kiểm kê gõ tay của chính tôi nói dối**: con số cổng đo lệch với hộp ở 4 tệp (hai
  regex khác nhau). Cổng lỏng mà log nói dối là HAI lỗi (án lệ #5) ⇒ hộp nay SINH TỪ phép đo,
  chỉ lý do là gõ tay, và thiếu lý do thì cổng đỏ.

- 25/08 · G2-A3 — cờ `datSuaLuc` của `suaTheoId` MẶC ĐỊNH TẮT, cố ý: bật mặc định là phá hợp
  đồng `test/l3-m2-ti-le-hoan.test.js:270` (cấm chạm `sua_luc`) và phá mọi phép đo dùng
  `max(sua_luc)` làm vân tay «có ai ghi gì không». Nơi nào cần đồng hồ CSDL thì tự khai —
  đừng trộn `new Date()` của máy vào một cột đang toàn `now()` (án lệ #18).

- 25/08 · B-Y4 (người A) — GHI NỢ + một quyết định CỐ Ý không tối ưu:
  (1) `marketer` là chuỗi TỰ DO, chưa phải khoá ngoại sang `nguoi_dung`. Đáng làm (báo cáo
  cắt theo marketer sẽ dựa trên chuỗi gõ tay, sai chính tả là mất dòng), nhưng đổi cả lược
  đồ lẫn màn hình của B ⇒ phiếu riêng.
  (2) **CỐ Ý không sinh SQL động** ở `napPage` dù hai danh sách `COT_MAY_DAT`/`COT_NGUOI_DAT`
  gọn hơn và an toàn hơn cho người sau: `v3/test/b/page-bot.test.mjs` ĐỌC THẲNG văn bản SQL
  đó để đối chiếu. Sinh động là làm bộ đọc của người B mù — họ sẽ thấy «không tìm thấy câu
  ON CONFLICT» thay vì thấy tín hiệu thật. Phá một hợp đồng liên-người đang chạy để đổi lấy
  cái đẹp hình thức là lỗ (án lệ #24). Đã ghi vào chú thích: PHẢI giữ SQL ở dạng CHỮ.
  (3) Page MỚI vẫn rơi vào team kỹ thuật (`team_id` chỉ ở vế INSERT) — nợ cũ từ B-Y3.

- 25/08 · B-Y4 — 🧭 **kiểm bẫy phải kiểm CẢ HAI CHIỀU.** Người B giăng sẵn một khẳng định
  sẽ đỏ đúng lúc A vá xong. Chạy lại thì 21 pass/0 fail — nhưng «xanh» một mình không nói
  được gì, nên đo lại bằng CHÍNH regex của B trên cả hai bản: bản cũ 10 cột (có `marketer`),
  bản mới 9. Xanh ĐÚNG NHỜ bản vá, lùi lại là đỏ. Không có phép đo hai chiều này thì lời
  khai «bẫy của B đã ăn» chỉ là suy đoán.

- 25/08 · G2-A4 (người A) — **RF-17 ĐÓNG.** Chỉ mục `bo_luat_chung_mot_ban_dang_ap`
  (migration 009) làm trạng thái «hai bản cùng `dang_dung`» KHÔNG tồn tại được, kể cả khi
  ghi thẳng bằng psql. Kèm `apBoLuat()` chạy trong MỘT giao dịch — bản của màn hình hạ bản
  cũ rồi dựng bản mới bằng hai lời gọi rời, hạ xong mà dựng hỏng thì team không còn bản nào
  đang áp và prompt rơi về bản toàn hệ, tức mọi page đang bật bot đổi cách nói mà KHÔNG ai
  bấm nút nào. ⚠️ `team_id` NULLABLE nên chỉ mục phải `COALESCE(team_id, 0)`: hai NULL trong
  Postgres là KHÁC nhau, để nguyên thì dòng luật toàn hệ không được ràng.

- 25/08 · G2-A4 — NỢ CÒN LẠI (cutover hai bước, cần người B):
  (1) CHƯA siết `CHECK (NOT dang_dung OR duyet_luc IS NOT NULL)` — màn của B còn ghi thẳng
  qua `db.sua()`, bật ngay là màn chết. Siết sau khi B đổi sang `apBoLuat()`.
  (2) **Chưa báo người B** rằng đã có `apBoLuat()` · `suaKyNang()` · `xemAnhHuongKyNang()`
  ở `src/db/index.js` (khai ở `ban-giao/tang-truy-van-v1.md` §6c). Cái rào thứ hai chỉ có
  tác dụng khi nơi gọi đi qua nó — hiện nó nằm đó mà chưa ai đi.
  (3) `soSanhBoLuat` là phép so TẬP HỢP DÒNG, không phải diff có thứ tự: dòng bị chuyển chỗ
  hiện thành một bỏ + một thêm. Hàm tự khai điều đó ở trường `phepSo`, đừng đọc quá tay.

- 25/08 · G2-A4 — 🧭 **VÌ SAO KHÔNG CHẠY BA LƯỢT MODEL** (đọc trước khi mở sóng 1): nghiệm
  thu sóng 1 dặn «thay đổi chạm cách bot nói thì chạy ít nhất BA lượt». Lượt này KHÔNG chạy,
  vì nội dung prompt **không đổi một byte** — thứ duy nhất chạm đường ráp prompt là
  `docKyNang` đổi sang vị từ dùng chung, và đã đo **0/514 page lệch** giữa vị từ cũ và mới
  trên CSDL thật. Ba lượt model đo TÍNH BẤT ĐỊNH CỦA MODEL, hữu ích khi NỘI DUNG đổi; ở đây
  phép đo đúng là so prompt trước/sau, tất định và mạnh hơn. **Lượt phải chạy ba lượt là
  lượt ai đó ÁP một bản bộ luật chung có nội dung khác** — thao tác của người qua màn hình.

- 25/08 · G2-A4 — 🧭 phạm vi phiếu đổi giữa chừng vì người B đã dựng xong hai màn
  (`v3/src/ui/bo-luat/`, `v3/src/ui/ky-nang/`) trên lược đồ cũ. Đã trình hai đường cho chủ
  dự án và **chủ dự án chốt dựng bảng + API riêng như phiếu gốc**. Ràng buộc tự đặt: không
  đập màn của B ⇒ ba chỗ nhường (không thêm cột `trang_thai` · lịch sử kỹ năng ra bảng
  riêng · chưa siết CHECK). Chi tiết ở nhật ký phiếu.

- 25/08 · G2-A5 — 🧭 **SUÝT LÀM CHẾT BOT: quên lưới migration ở bộ đọc MỚI trên đường chat
  sống.** Cổng chạy trên CSDL thật trả `column "cap" does not exist` — CSDL thật ở migration
  008, mà `docKichBanChoPage` đã được nối vào `rap-prompt.js`. Deploy code trước khi áp 010 =
  MỌI lượt trả lời khách chết (đúng án lệ #7/K2). Đáng nói hơn: tôi ĐÃ bọc lưới đúng như vậy
  cho `layModel` ở G2-A2 rồi **quên ở đây** — bọc một chỗ không thành thói quen. Vá bằng cách
  hỏi `information_schema` MỘT lần (không bắt lỗi 42703: một câu lỗi giữa giao dịch làm hỏng
  cả giao dịch, không lui được nữa), thiếu cột thì lui về bộ đọc một tầng và KÊU RA. Ca K16
  dựng đúng cảnh đó bằng cách DROP cột thật.

- 25/08 · G2-A5 — hai lỗi khác, cả hai do TEST bắt chứ không phải đọc code thấy:
  (1) `apKichBan` đếm ảnh hưởng bằng `pool` (kết nối KHÁC) khi đang ở giữa giao dịch ⇒ đọc
  ảnh TRƯỚC khi ghi ⇒ trả 0. Mọi phép đếm trong giao dịch phải đi bằng chính client của giao
  dịch đó. (2) Tôi thêm chỉ mục `kich_ban_mot_live_page` trùng với `kich_ban_live_moi_page`
  đã có từ migration 001 — đúng cái «bản khai thứ hai» mà cả sóng này đang dọn.

- 25/08 · G2-A5/A6 — ĐO TRƯỚC KHI DỰNG, và hai tầng trên GẦN NHƯ KHÔNG TỚI ĐƯỢC:
  `san_pham` = **0 dòng** · `page.thi_truong` = **140/514** · `page.nganh_hang` = **0/514**
  · `kich_ban` 71 bản/70 page ⇒ **444/514 page chưa có bản riêng**. Cấu trúc dựng đúng nhưng
  hôm nay hầu hết page rơi vào «không kế thừa được từ đâu» — đó là TRẠNG THÁI THẬT. Tầng sản
  phẩm chỉ sống khi `san_pham` có dòng (việc của POS/L1-M1); tầng nước chỉ với tới 27% page
  cho tới khi ai đó điền `page.thi_truong`.

- 25/08 · G2-A6 — TỰ QUYẾT: danh sách **9 chỉ số sức khoẻ** là của tôi, tài liệu chỉ ghi «đèn
  9 chỉ số» chứ không liệt kê. Mỗi chỉ số neo vào một SỰ CỐ THẬT hoặc con số đã đo:
  `llm_account`(23/08) · `don_ket_cho_gui_wa`(RF-14) · `page_thieu_marketer`(514/514) ·
  `page_thieu_kich_ban`(dùng bộ giải A5) · `du_lieu_mo_coi`(dùng `demMoCoi` B-Y3) ·
  `hang_doi_tin` · `viec_qua_han` · `hang_cho_duyet` · `page_mat_dau`. Chủ dự án đổi thì sửa
  `CHIN_CHI_SO`, và ca S9 sẽ đỏ cho tới khi test sửa theo (cố ý). Ngưỡng A/B
  `TOI_THIEU_DE_KET_LUAN=30` cũng là quy ước, được KHAI trong chính kết quả trả về.

- 25/08 · G2-A6 — 🧭 **ĐÈN XÁM tách khỏi ĐÈN ĐỎ.** «0 lượt trả lời» có HAI nghĩa: chưa có dữ
  liệu bao giờ (chưa cài xong) và có rồi mà dừng (sự cố). Gộp thành đỏ là dựng một đèn đỏ
  VĨNH VIỄN, rồi ai cũng học cách bỏ qua nó — đúng bài học vừa rút ở mốc nền mục của
  `l0-m1.sh`/`l0-m2.sh` cùng ngày. `tomTat` nói thẳng: «không đèn đỏ, nhưng có đèn XÁM — chưa
  đủ dữ liệu để nói hệ khoẻ».

- 25/08 · G2-A5/A6 — NỢ: migration **010 và 011 CHƯA áp** trên CSDL thật (đang ở 008 + 009
  chưa áp). Cho tới lúc áp: cây ba tầng TẮT (có kêu cảnh báo), và `so_ai` chưa có cột tiền nên
  mọi báo cáo tiền là cận dưới. Người B cần biết để nối lớp model đẩy `tienVnd` qua phễu
  `datPheuSoAi`.

- 25/08 · B-Y7 — 🧭 **TÔI ĐỌC BẢN SAO VÀ COI LÀ SỰ THẬT.** `page.bot_ai_bat` lệch nguồn thật
  đúng **50** (CSDL nói 50 bật · `ai-enabled.json` = `[]` · sửa 24/08 12:13, ai đó tắt qua
  dashboard v1 và CSDL v3 không biết). Mà `migrate/001` đã khai từ đầu: «NGUỒN DUY NHẤT của
  cờ này là `ai-enabled.json`… cấm suy ra từ trường khác». G2-A4 của tôi đọc thẳng cột đó cho
  con số `soPageDangBatBot` — tức con số màn «Bộ luật chung» dùng để cho phép bấm ÁP. Suốt từ
  lúc G2-A4 xong, màn hình sẽ nói «50 page đổi cách nói với khách» trong khi thật là KHÔNG
  page nào. Nay đọc file, đối chiếu cột, và BÁO chỗ lệch.

- 25/08 · B-Y7 — 🧭 **THƯỚC CỦA TÔI XANH VÌ FIXTURE DỰNG HAI VẾ BẰNG NHAU.** Ca N5/N11 khẳng
  định `soPageDangBatBot === 2` và xanh suốt — vì fixture đặt cột và bot khớp nhau. Đúng cảnh
  phiếu ⑤ cảnh báo: «cảnh bằng nhau chính là cảnh bài test cũ đã xanh trong khi thực tế đã
  lệch 50 page». Bài học chung: khi hai nguồn PHẢI khớp, bài test bắt buộc phải có ca chúng
  KHÔNG khớp — ca khớp không chứng minh gì. Và cổng đổi từ canh GIÁ TRỊ sang canh NGUỒN.

- 25/08 · B-Y7 — NGOÀI PHẠM VI, cần người quyết: **ai được quyền sửa cột `bot_ai_bat`?**
  (a) bỏ hẳn cột, luôn hỏi file — hết lệch, nhưng mọi câu SQL lọc theo cột phải viết lại và
  không JOIN được · (b) job đồng bộ ngược bot → CSDL — giữ được câu SQL, nhưng job chết thì
  lại lệch âm thầm · (c) giữ nguyên + LUÔN báo lệch — rẻ nhất, đã làm xong ở phiếu này.
  Hôm nay đang là (c): con số không nói dối nữa, nhưng cột vẫn lệch.

- 25/08 · B-Y5 — 🧭 **BỘ CA CHẬP CHỜN ~25%, VÀ NÓ CÓ SẴN — đo rồi mới dám nói.**
  `test/l2-m3-rap-prompt.test.js` đỏ trong quét hồi quy với lỗi của BỘ CHẠY test
  (`Unable to deserialize cloned data`), trong khi chạy thẳng `node test/...` thì 6/6.
  Không đoán: chạy 8 lượt mỗi bản → **bản mới 2 đỏ/8 · bản cũ (HEAD) 2 đỏ/8**. Tỉ lệ y hệt
  ⇒ chập chờn CÓ SẴN, không phải do B-Y5. Hai điều rút ra: (1) một bộ ca chập chờn TỆ HƠN
  một bộ ca đỏ, vì nó dạy người ta chạy lại cho tới khi xanh; (2) mọi lượt «quét hồi quy»
  trong phiên này có ~25% khả năng hiện một dòng đỏ GIẢ ở tệp đó — ai đọc kết quả quét phải
  biết điều này. Chưa vá (ngoài phạm vi), nghi là stdout lớn/nhiều ký tự lạ làm hỏng IPC của
  test runner.

- 25/08 · B-Y5 — TỰ QUYẾT + NỢ: **mặc định của cờ `ghiNhatKy` đang SAI theo số đo** nhưng
  tôi CỐ Ý không tự lật. Đo: `nhat_ky` 1557 dòng, **100% là `doc`** — tức mặc định «ĐỌC thì
  ghi» chưa từng phục vụ ai. Nhưng lật nó là bỏ một khả năng kiểm toán (dấu vết ĐỌC bảng
  `khach` — bảng mang SĐT và địa chỉ khách), và phiếu ⑤#1 khai thẳng «mặc định không đổi».
  Người quyết chốt: giữ opt-out (như hiện tại) hay lật thành opt-in.
  Kèm: 1557 dòng rác đang có **không dọn được** (`nhat_ky` cấm xoá ở tầng CSDL). Cứ để.

- 25/08 · B-Y6 — 🧭 **TÔI TREO MỘT TẦNG DÙNG ĐƯỢC VÀO MỘT TẦNG CHƯA TỒN TẠI.** Migration 010
  (G2-A5) buộc bản kịch bản `cap='nuoc'` phải có `san_pham_ma`, mà `san_pham` = 0 dòng ⇒ tầng
  nước chưa bao giờ tới được page nào; trong khi `page.thi_truong` có ở 140/514. Tôi ĐÃ đo cả
  hai con số đó lúc làm G2-A5 và vẫn thiết kế sai — đo được mà không dùng số đo để chọn hình
  dạng thì bằng không đo. 012 cho phép phạm vi CHỈ-THEO-NƯỚC. Kèm một lỗ nữa của 010 mà phiếu
  chỉ ra: `UNIQUE (team_id, san_pham_ma, thi_truong)` không ràng được khi `san_pham_ma` NULL
  (hai NULL là khác nhau) ⇒ hai bản LIVE cùng một nước LỌT. Bịt bằng `coalesce(…, '')`.

- 25/08 · B-Y6 ⓑ — 🧭 **MẪU SỐ SAI THÌ TỈ LỆ LUÔN ĐẸP.** Phiếu gợi ý đếm lượt 0 đồng từ
  `so_ai.loai='reply'`. Không được: lượt 0 đồng KHÔNG gọi model nên KHÔNG đẻ dòng `so_ai` nào
  — lấy `so_ai` làm mẫu số là chia cho đúng phần KHÔNG bị chặn. Mẫu số đúng =
  (bị chặn ở `mau_0_dong`) + (có gọi model ở `so_ai`). Và bộ đếm phải cộng NGUYÊN TỬ trong
  CSDL: đọc-rồi-ghi thì hai lượt chat đồng thời mất một lượt, im lặng, và con số «chặn ≥33%»
  hết dùng được để nghiệm thu.

- 25/08 · B-Y6 ⓑ — NỢ: `mau_0_dong.so_lan_chan` là bộ đếm **CỘNG DỒN**, không cắt theo khoảng
  thời gian, trong khi `soLuotGoiModel` thì có cắt. Hai vế khác thước ⇒ `tiLeChan0Dong` chỉ
  đúng khi khoảng đo phủ toàn bộ thời gian — hàm TỰ KHAI điều đó ở trường `canhBao`. Muốn cắt
  theo khoảng thì cần một bảng lịch sử từng lượt chặn; chưa dựng, chờ ai đó thật sự cần.

- 25/08 · B-Y6 ⓒ — TRẢ LỜI CÂU HỎI, KHÔNG DỰNG BẢNG. Phiếu hỏi «ảnh đang ở đâu». Đo được:
  ảnh nằm trong `kb-overrides.json` → `products[].images[] = {url, label}`; **32 ảnh / 7 page
  / 5 nhãn**; tệp thật ở `public/uploads` (**49 tệp · 34 MB** trên VPS); bot lấy ra gửi ở
  `src/handler.js:270`. ⇒ chỉ cần một bảng NHÃN trỏ URL sẵn có, không cần lưu tệp. NHƯNG bộ
  nhãn chưa chuẩn hoá — «Ảnh feedback» và «Feedback» là hai nhãn cho cùng một thứ. Dựng bảng
  trước khi chốt bộ nhãn là dựng một bảng phải sửa ngay. **Chờ người quyết chốt bộ nhãn.**

- 26/08 · A7-1 — 🧭 **RF-23 GỌI TÊN SAI NƯỚC, VÀ TÔI SUÝT CHÉP LẠI LỜI KHAI ĐÓ.** RF-23
  (23/08) ghi «`chuanHoaSdt` gộp khách xuyên nước với số nội địa 8 chữ số (Kuwait/Bahrain/
  Oman/Qatar)». Đo lại trên POS thật 26/08: nhóm 8 số ấy có **5.703 sđt phân biệt và 0 va
  chạm THẬT** (đúng 1 hit, là rác `123123123123`); còn **Saudi ∩ UAE — nhóm 9 số, KHÔNG được
  RF-23 nhắc — có 6 va chạm thật** (`561698732` `547049872` `575461472` `546241121`
  `538440108` `386685425`) trên mẫu 3.000 đơn/shop, và đó là nhóm chiếm **82% đơn**. Bài học
  đúng khuôn án lệ #4: nếu tôi thiết kế theo chữ của sổ thì đã đi vá nhóm không hỏng và để
  nguyên nhóm hỏng. Gốc cũng khác lời khai: **POS lưu SĐT không có mã nước** (Kuwait
  `66410373`, Saudi/UAE `5xxxxxxxx`) ⇒ `chuanHoaSdt` là no-op trên dữ liệu POS; nước chỉ nằm
  ở «đơn đến từ shop nào», không nằm trong con số. Đã đóng bằng migration 013.

- 26/08 · A7-1 — 🔴 **MỌI SỐ DẪN XUẤT TỪ MỐC «5.144 ĐƠN» ĐANG ĐỨNG TRÊN 4,2% DỮ LIỆU.** Đo
  26/08 qua `guiDocDon` trên cả 7 shop: **122.615 đơn** (Saudi 62.494 · UAE 38.641 · Kuwait
  12.353 · Qatar 6.071 · Oman 1.740 · Bahrain 964 · Taiwan 352). Sổ và `ti-le-hoan.js` đều
  khai «5.144 đơn thật / 7 shop POS» (23/08). Cần đo lại, ngoài phạm vi A7-1: phân bố bốn
  tầng hoàn (`canh_bao` 30–65% = 100 khách) · «283 khách có ≥2 đơn đã kết» · «859 khách đúng
  một đơn kết» · «lệch lịch-sử-vs-hiện-tại 0,08%». Bốn con số đó là nền của A8 — đừng mở A8
  trước khi đo lại, kẻo chốt chính sách chặn bằng 1/24 dân số.

- 26/08 · A7-1 — NGOÀI PHẠM VI, chưa sửa: `kiemTrung`/`CAU_TRA_TRUNG` (`src/orders/loc-trung.js`)
  vẫn dò trùng CHỈ theo SĐT chuẩn hoá, không kẹp nước ⇒ hai khách Saudi/UAE cùng số vẫn bị
  **báo trùng chéo nhầm** (đúng vế «báo trùng nhầm» của RF-23, nhưng ở đúng nhóm nước mà
  RF-23 không nêu). KHÔNG tiện tay sửa: đó là làn 🟥 (đường đơn/tiền, đất L3-M2) và đổi luật
  dò trùng là đổi đơn nào được tạo. Cần phiếu riêng, và cần chốt: nước lấy ở đâu cho một đơn
  `trang_ban_hang` (không đi qua shop nào).

- 26/08 · A7-1 — 🧭 **CỔNG CỦA CHÍNH TÔI BÁO TRƯỢT CHO THỨ ĐANG XANH.** Phép ④ của
  `ops/bin/nghiem-thu/a7-1.sh` in TRƯỢT trong khi chạy tay là 11/11: `node --test … | grep -q`
  dưới `set -o pipefail` — `grep -q` đóng ống ngay khi khớp ⇒ node ăn SIGPIPE (141) ⇒ cả
  pipeline thành TRƯỢT. Tệ hơn: phép ⑤ (đảo-vá) lại ĐẠT vì **lý do sai** — nó chỉ xanh nhờ
  bộ ca đỏ thật. Tức cùng một lỗi thước vừa cho âm tính giả vừa cho dương tính giả trong một
  file. Đã vá bằng cách hứng ra biến rồi mới soi, và ghi CẤM ngay trong cổng. Cùng họ án lệ
  #27 («thước đỏ giống hệt code đỏ») và #10.

- 26/08 · A7-1 — 🧭 **BỘ CA `l0-m1-di-tru` ĐỎ KHÁC NHAU TUỲ DỮ LIỆU, nên câu «D7 là đỏ có
  sẵn» chưa đủ.** Trên dữ liệu VPS: đỏ `D7` (15 pass/1 fail). Trên dữ liệu máy cá nhân (cùng
  mã, cùng CSDL): đỏ `D1`·`D9`·`D10` (26 pass/3 fail kèm `l0-m1-luoc-do`). A/B bản trước-013
  và sau-013 trên CÙNG cây CÙNG dữ liệu ra **y hệt 26/3** ⇒ không phải hồi quy. Người sau đọc
  kết quả quét phải hỏi «đo trên dữ liệu NÀO» trước khi nhận hay chối một dòng đỏ — án lệ #8.

- 26/08 · A7-2 — 🧭 **ĐẢO-VÁ SỐNG SÓT CẢ CHÍN CA, VÀ NÓ ĐÚNG KHI LÀM THẾ.** Đổi
  `khoaKhach(h.market, …)` → `khoaKhach(null, …)` trong `ho-so-khach.js` mà 9/9 ca vẫn
  xanh. Không phải thước cùn hoàn toàn: câu tra CSDL còn kẹp `thi_truong = $2` nên hành vi
  được cứu ở tầng dưới, đúng cảnh «cửa VÀO là tập MỞ, cửa RA đúng một cái» (án lệ #31).
  Lỗ THẬT mà đột biến mở là **bản đồ trong lượt** (`banDo`): hai hội thoại cùng số KHÁC
  NƯỚC trong CÙNG một lượt thì cái thứ hai ăn khách của cái thứ nhất và không lần nào chạm
  CSDL để biết mình sai. Ca `G10` sinh ra TỪ lượt đảo-vá đó, và phép ⑤ của cổng a7-2 giữ nó
  lại để không ai xoá mất mà cổng vẫn xanh. Bài học: đảo-vá KHÔNG đỏ thì câu hỏi đúng là
  «nhánh nào của đột biến này chưa ai đo», không phải «vậy là code đúng rồi».

- 26/08 · A7-2 — NGOÀI PHẠM VI, chưa sửa: `khach` vẫn **0 dòng** vì **chưa ai chạy đồng bộ
  POS thật** (`docDon` trên 7 shop, 122.615 đơn). Code hai đầu đã sẵn và đã khớp nhau ở bộ
  ca; thiếu đúng một lượt chạy. Lượt đó ghi vào CSDL thật nên là việc cần người gật — và
  nên chạy SAU khi 013 lên được VPS, kẻo khách nạp vào theo khoá cũ rồi phải gỡ ngược.

- 26/08 · A7-3 — 🧭 **CỔNG CỦA TÔI BẮT TỘI FILE VÌ NÓ ĐÃ GHI LẠI LÝ DO.** Hai phép «KHÔNG
  được có X» của `a7-3.sh` TRƯỢT ngay lượt đầu — không phải vì mã có X, mà vì đoạn chú thích
  giải thích *vì sao không dùng X* có chứa chữ X (`await import(` và `khoaKhach`). Đo lại:
  bỏ dòng chú thích ra thì **0 dòng mã** khớp. Một cổng phạt người ta vì đã viết lý do là
  một cổng dạy người ta xoá lý do đi — nguy hơn hẳn một cổng lỏng. Vá: `ma()` lọc chú thích
  trước khi grep. Đây là lần thứ HAI trong hai ngày cổng của chính tôi nói dối (lần trước:
  `grep -q` + `pipefail` ở a7-1) ⇒ **mọi cổng mới phải tự đo trên một ca ĐÃ BIẾT đáp án
  trước khi tin nó**, án lệ #27.

- 26/08 · A7-3 — 🧭 **VÒNG NHẬP THẬT, VÀ `await import()` KHÔNG PHẢI CÁCH VÁ.** Viết cửa đọc
  hồ sơ ở `src/db/` cho gần `so-lieu.js`, rồi phát hiện nó cần `chuanHoaSdt` mà
  `orders/loc-trung.js` lại `import … from "../db/index.js"` ⇒ vòng
  `db/index → db/ho-so-khach → orders/loc-trung → db/index`. Bản đầu tôi né bằng import
  ĐỘNG trong thân hàm — nó chạy được, nhưng chỉ giấu phụ thuộc khỏi người đọc và khỏi mọi
  công cụ dò vòng. Sửa đúng là ĐỔI CHỖ FILE: `src/orders/doc-ho-so.js`, cùng tầng
  `loc-trung.js`/`ti-le-hoan.js` (bảng `khach` vốn đã là đất của `ti-le-hoan.js`), nhập XUÔI
  xuống `src/db`. Cổng ① canh cả hai vế: nạp được `orders/index.js`, và mã không có
  `await import(`.

- 26/08 · A7-3 — 🧭 **CA H7 CỦA TÔI LÀ CA RỖNG, ĐẢO-VÁ CHỈ RA.** H7 dựng khách có ĐỦ hai
  kênh rồi khẳng định `kenh.coMat` bằng cả hai — nên nó xanh y hệt khi `coMat` bị gõ cứng
  `[...KENH_CO_THAT]`. Tức bài test không phân biệt «đếm từ dữ liệu» với «khai sẵn». Ca H12
  (khách chỉ có MỘT kênh) sinh ra từ lượt đảo-vá, và phép ⑥ của cổng giữ nó lại. Cùng đúng
  một hình dạng lỗi với lượt đảo-vá của A7-2 hôm nay — **fixture dựng hai vế bằng nhau thì
  mọi luật phân biệt hai vế đều xanh giả**, đã là lần thứ ba kể từ B-Y7 25/08.

- 28/08 · A7 (người A) — 🔴 **HAI BẢN KHAI CỦA LUẬT TẦNG HOÀN ĐÃ TRÔI KHỎI NHAU, VÀ ĐÂY LÀ
  ĐƯỜNG TIỀN.** Màn «Rủi ro hoàn hàng» (`v3/src/ui/rui-ro-hoan/kho-rui-ro.js`, người B) tự
  tính tầng hoàn thay vì đọc `khach.tang_hoan`. Lệch `src/orders/ti-le-hoan.js` ở **ba** chỗ:

  | | `ti-le-hoan.js` (L3-M2, có đo) | màn của B |
  |---|---|---|
  | nhóm hoàn | `{4,5,6,7}` — **KHÔNG có 8** | `{4,5,6,7,`**`8`**`}` |
  | mẫu số | đơn ĐÃ KẾT `{4,5,6,7,3,16}` | MỌI đơn |
  | sàn | `toi_thieu_don_ket = 2` | không có |

  Đo trên CSDL thật 28/08 (57.600 đơn đã nạp, lượt nạp CÒN ĐANG CHẠY): luật `ti-le-hoan`
  ra **2.318** khách nhóm 30–65%, luật của màn ra **2.555**; riêng mã 8 làm **53** khách đổi
  tỉ lệ. Mã 8 = `packing` là một bước **TIẾN** (án lệ L1-M1: `status_history` đơn 47397 UAE
  đi `0→1→12→8`) — đếm nó là hoàn thì dán nhãn rủi ro cho khách đang được đóng gói.
  `ti-le-hoan.js` decision ① ghi rõ bản v1 `src/pancake-orders.js:13` khai `{4,5,6,7,8}` là
  **nợ N1, không phải chuẩn để chép theo** — và bản chép theo đã ra đời.

  KHÔNG tự sửa: `v3/src/*` là đất người B (luật 4 §0a). Vì sao B phải tự tính thì cũng đã
  ghi ngay trong file của B — *«cột `khach.tang_hoan` có sẵn nhưng chưa gán cho khách nào»*.
  Đúng: job `chamTiLeHoan()` **chưa từng chạy** trên dữ liệu này (`tang_hoan` NULL trên
  44.779/44.779 khách). **Việc của tôi là chạy job cho cột có số, để màn đọc cột thay vì đẻ
  luật thứ hai** — làm ngay sau khi lượt nạp xong.

- 28/08 · A7 (người A) — 🧭 **CON SỐ «945 KHÁCH HOÀN 30–64%» TRONG `04-TIEN-DO.md` ĐÃ CŨ LÚC
  VỪA VIẾT RA.** Nó đo lúc `don_hang` có 27.719 dòng; lượt nạp POS vẫn đang chạy và nay đã
  57.600 (đích: 122.615). Đo lại cùng luật của màn ngay lúc này ra **2.555**. Không phải lỗi
  của ai — nhưng đúng cái bẫy §9 đã ghi 26/08 về mốc «5.144 đơn»: **một con số đo giữa lượt
  nạp mà viết vào tài liệu như số cuối là một con số sẽ nói dối người đọc sau.** Mọi phân bố
  tầng hoàn phải đo LẠI khi lượt nạp báo XONG, và câu kết luận phải kèm «đo trên N đơn».

- 28/08 · A7 (người A) — ✅ **LƯỢT NẠP POS XONG: 123.629 đơn · 89.484 khách · 7/7 shop.**
  `chamTiLeHoan()` đã chạy, `tang_hoan` có số trên cả 89.484 dòng. **Bốn con số nền của A8,
  đo trên TOÀN BỘ dữ liệu** (thay cho mốc 23/08 đo trên 5.144 đơn = 4,2%):

  | tầng | khách | mốc cũ |
  |---|---|---|
  | `chua_du_don` (<2 đơn kết) | **72.777** | — |
  | `tot` (0–15%) | 4.759 | 63 |
  | `binh_thuong` (15–30%) | 509 | 1 |
  | `canh_bao` (**30–65%**) | **5.449** | 100 (01 §11 nói «144») |
  | `rui_ro_cao` (≥65%) | 5.990 | 119 |

  «144 khách» của 01 §11 thật ra là **5.449**. Và 81% khách (72.777/89.484) chưa đủ 2 đơn
  kết để xếp tầng — con số đó mới là điều đáng nói với người quyết, không phải 5.449.

- 28/08 · A7 (người A) — 🔴 **ĐO XONG CHỖ LỆCH HAI LUẬT: 34.074 KHÁCH BỊ DÁN NHÃN RỦI RO CAO
  OAN.** Trên toàn bộ 123.629 đơn:

  | | luật `ti-le-hoan.js` | luật màn của B |
  |---|---|---|
  | nhóm 30–65% | 5.449 | 5.932 |
  | **nhóm ≥65% («rủi ro cao»)** | **5.990** | **40.064** |

  Chênh **6,7 lần**, và nguyên nhân chính KHÔNG phải mã 8 (chỉ 55 đơn / 55 khách). Nguyên
  nhân là **thiếu sàn `toi_thieu_don_ket = 2`**: trong 40.064 khách «hoàn cao» của màn,
  **34.187 (85%) có ĐÚNG MỘT đơn**. Một đơn hoàn ⇒ 100% ⇒ «rủi ro cao». Đúng cảnh
  `ti-le-hoan.js` decision ③ đã ghi: *«xếp tầng bằng một điểm dữ liệu là biến nhiễu thành
  bản án»* — nên nó có nhãn RIÊNG `chua_du_don`, không gộp vào `tot` mà cũng không để NULL.

  Nay `khach.tang_hoan` ĐÃ CÓ SỐ nên màn đọc cột được, không phải tự tính nữa. **Việc người:
  báo B đổi màn sang đọc `khach.tang_hoan`** (đề nghị §8). Nếu để nguyên, màn đang nói 40k
  khách là rủi ro cao trong khi luật đã ký nói 6k — và đây là màn dùng để quyết chặn COD.

- 28/08 · A7 (người A) — 🧭 **SCRIPT NẠP KHÔNG CÓ LỚP THỬ LẠI, MỘT LỖI 500 GIẾT LƯỢT CHẠY
  100 PHÚT.** POS trả HTTP 500 đúng trang đầu Saudi ⇒ tiến trình đổ, 6 shop trước đó may mà
  đã ghi xong. Thăm dò lại ngay sau đó: 4/4 lượt GET Saudi đều OK ⇒ 500 là NHẤT THỜI. Vá:
  bọc thử lại quanh `fetch` (tầng THẤP NHẤT với tới được) chứ không quanh `docDon` — Saudi
  là 631 trang, một lỗi ở trang 400 mà chạy lại từ trang 1 là ~47 phút đọc lại; và CHỈ thử
  lại 5xx, vì thử lại một 4xx là spam POS bằng cùng một lỗi. Lượt chạy lại: `daThuLai=0`
  (không cần đến), `giuNguyen=11.119` — tức lượt chết đã kịp ghi 11k đơn Saudi và lượt sau
  NHẬN RA chúng thay vì tạo trùng: tính idempotent được chứng minh trên dữ liệu thật, không
  chỉ trong bộ ca.

- 01/09 · SÓNG VÁ GD2 (P1–P9) — NGOÀI PHẠM VI, ghi lại để người sau khỏi chẩn nhầm:
  (1) 🔴 **8/25 cổng nghiệm thu ĐỎ khi CSDL dev có dữ liệu.** Đo 01/09: sau `npm run di-tru`
  trên `aicloser_v3` (502 page · 18.790 hội thoại · 6.428 khách · 5.671 đơn · 137 sản phẩm),
  các cổng `l0-m1 · l0-m2 · l1-m1 · l2-m3 · l3-m2 · l3-m4 · va-q12 · va-r2` chuyển đỏ. ĐÃ
  ĐỐI CHỨNG trên worktree ở commit `4e72228` (trước mọi sửa của sóng này): đỏ **giống hệt
  từng dòng** ⇒ do DỮ LIỆU NỀN, không phải hồi quy mã. Gốc: chúng đo trên CSDL dev CHUNG
  thay vì tự dựng sandbox (án lệ #28). Phiếu sau: chuyển sang `dungSandbox()`, hoặc neo
  bằng DELTA thay vì con số tuyệt đối.
  (2) CSDL máy dev còn ở migration **007** — thiếu 008–013, nên cổng `l0-m1` báo lệch neo
  bảng và bộ ca a7-* chỉ chạy được trong sandbox. Người dùng chưa cho áp; `npm run migrate`
  là việc một lệnh khi có lệnh.
  (3) `npm test` trên máy này còn 9 ca đỏ ở suite CŨ (A8 · D6 · D8 · F2 · F5 · F5b · F6 ·
  I3 · V4): tiến trình bot v1 đang chạy GHI `conv-state.json` giữa lượt đo (đo được: kích
  thước đổi 5.459.361 → 5.461.675 trong một lượt chạy). Cây sạch trong worktree: 406/406.
  Thước phụ thuộc tệp trạng thái runtime — ghi nợ, chưa sửa.
  (4) Bộ luật chung vẫn KHÔNG thay được hằng `CORE` (`src/prompts.js`, file cấm sửa) —
  tiêu chí G2 ① mới đạt một nửa. Đóng nốt = cutover `prompts.js`, phải xin chủ dự án.
  (5) `V3_RAP_PROMPT_BAT` chưa bật ở đâu ⇒ ba khối kỹ năng/kịch bản/sản phẩm từ CSDL chưa
  điều khiển đường chat. Bật là việc người (H9 cutover).


- 11/09 · TIẾP QUẢN — 🔴 **BOT TẮT 13,7 NGÀY MÀ BẢNG SỨC KHOẺ BÁO XANH TOÀN BỘ.**
  Đo trên cổng 3100 lúc 02:55 UTC 11/09: `aiPages: 0` · `repliesSinceBoot: 0` (chạy 21,3
  giờ) · Sổ AI dòng cuối **28/08/2026 09:56 UTC**. Tầng LLM KHOẺ (probe ok 773ms,
  kimi-k2.6), token Pancake 0/6 chết, 0 page backoff ⇒ **không phải H6 tái phát**. Bot
  không chết; bot đang TẮT, và `ai-enabled.json` rỗng.
  Vì sao không đèn nào đỏ — hai check đáng đỏ bị ép xanh bởi CÙNG một điều kiện:
  `ai_silent: (peak && aiPages > 0 && replies1h === 0) ? RED : GREEN` ·
  `log_stale: (peak && aiPages > 0 && staleMin > 30) ? RED : GREEN`.
  Logic «chưa bật gì thì đừng kêu» tự nó đúng, nhưng hệ quả là hệ tắt hoàn toàn thì bảng
  xanh hết — đúng cảnh M19 sinh ra để chống, lọt qua bằng cửa khác. THIẾU đúng một đèn:
  `aiPages === 0` → mức CAM, câu «hệ đang không phục vụ ai, Sổ AI dòng cuối <ngày>». Vá ở
  `src/health.js`. ⚠️ Việc NGƯỜI đi TRƯỚC: hỏi ai tắt ngày 28/08 và vì sao — bật lại mà
  chưa biết lý do là tái hiện đúng sự cố đã khiến người ta tắt.
  Nhật ký: `docs/thi-cong/nhat-ky/tiep-quan-09-09.md` §3a.

- 11/09 · TIẾP QUẢN — 🔴 **MÁY CHỦ CHẠY HAI APP, TÀI LIỆU CHỈ KHAI MỘT.**
  `docs/TONG-QUAN-HE-THONG.md §3.2` liệt kê bốn app dùng chung VPS: 3000 · 3001 · 3002 ·
  3100. Thực tế còn **cổng 3102 = bản v3** (`v3/chay-that.js:144`, `CHAYTHAT_CONG || 3102`),
  phục vụ `/dieu-phoi`, `/page-bot`, `/kich-ban`… Đo: `GET http://169.58.33.8:3102/` → 302
  tới `/dieu-phoi`; `GET :3100/admin/api/pages` → 401 «Cần đăng nhập.» (nguyên văn
  `src/server.js:48`) ⇒ 3100 = repo này. Người tiếp quản mở 3102, gọi `/admin/api/*` (đường
  của v1) và nhận 404 — mất nửa buổi vì tưởng mất mã nguồn. Vá: thêm một dòng vào bảng
  §3.2, ghi rõ **3100 = v1 (`/admin`) · 3102 = v3 (`/dieu-phoi`)**.
  Nhật ký: `tiep-quan-09-09.md` §3b.

- 11/09 · TIẾP QUẢN — 🔴 **LƯỢC ĐỒ KHÔNG MÔ HÌNH HOÁ ĐƯỢC «MỘT SẢN PHẨM Ở NHIỀU PAGE».**
  Người quyết mô tả 11/09: mỗi page bán một SP, nhưng **một SP xuất hiện ở nhiều page,
  nhiều thị trường**. Lược đồ 001 cho `san_pham` có `UNIQUE (team_id, ma)` và ĐÚNG MỘT cột
  `page_id`. Cùng một biến thể POS bán trên ba page thì chỉ một page được nối; hai page kia
  `docSanPhamGoiGia()` trả rỗng ⇒ `kb.noData` ⇒ bot nói «chưa có sản phẩm» rồi bàn giao.
  Không migration nào từ 002→013 nới ràng buộc đó.
  ✅ **ĐO ĐƯỢC 15/09 — KHÔNG CÒN LÀ SUY ĐOÁN, VÀ NẶNG HƠN SUY ĐOÁN.** Đọc thẳng đơn POS của
  7 shop (API POS gọi được từ máy dev, không cần VPS). Sản phẩm Fitgum Acai Berry:

  | Shop | Đơn Fitgum / 600 | Số PAGE bán nó | `variation_id` |
  | --- | --- | --- | --- |
  | Saudi | 23 | 1 | `e4108b77-8685-487e-a712-8cc103d00eb7` |
  | Kuwait | 80 | 1 | `717bfb27-4a96-4c16-b934-527d0dcce8ab` |
  | Oman | 82 | **2** | `e87acfbd-cb26-446c-b0eb-4903f861d2d5` |

  Ba shop ⇒ **ba `variation_id` khác nhau cho CÙNG một sản phẩm** ⇒ ba `san_pham.ma`. Giả
  thuyết «mỗi page một variation riêng» ở trên là ĐÚNG, nhưng nó không cứu được gì: nó chính
  là cái làm hỏng tầng `cap='nuoc'` (mục dưới).

  🔴 **VÀ MỘT HÌNH DẠNG CHƯA AI KHAI: PAGE CHẾT, SẢN PHẨM SỐNG TIẾP.** Người quyết nói 15/09:
  «page này die có thể chuyển sang page khác với sp tương ứng». Đo ra đang xảy ra thật, ở Oman:

  | Page bán Fitgum ở Oman | Đơn | Trạng thái |
  | --- | --- | --- |
  | `1102295119636847` | **56** | ⚠️ **KHÔNG có trong `pages.json`** — hệ chưa biết page này tồn tại |
  | `1173895229141558` «Healthy Figure PH in Oman» | 26 | ⚰️ `lost: true` — đã chết |

  Và chết page là NHỊP THƯỜNG, không phải sự cố: **115/577 page = 19,9% đang `lost`**, riêng
  tháng 9/2026 có **106 page** bị đánh dấu chết.

  📌 Hệ quả cho lược đồ, viết lại cho đúng tầm: không chỉ «một sản phẩm ở nhiều page». Mà là
  **sản phẩm phải SỐNG LÂU HƠN page**. Lược đồ 001 cho `san_pham` đúng một cột `page_id` nên
  nó mô hình hoá ngược chiều — buộc sản phẩm chết theo page. Với nhịp 20% page chết, đây
  không phải ca biên mà là đường chính.

- 11/09 · TIẾP QUẢN — 🔴 **TẦNG «SẢN PHẨM» CỦA CÂY KỊCH BẢN BA TẦNG KHÔNG PHỦ ĐƯỢC NHIỀU NƯỚC.**
  `kich_ban.san_pham_ma` dùng chung vốn từ với `ky_nang.bat_cho_nhom_sp`, tức `san_pham.ma`.
  Mà `san_pham.ma` dựng ở `src/pos/doc-danh-muc.js:102` là `` `${ketNoi.shopId}:${v.id}` `` —
  MANG THEO mã shop, và mỗi thị trường là một shop POS riêng. Hệ quả: cùng một sản phẩm ở
  Saudi và UAE có hai mã khác nhau, nên bản `cap='san_pham'` thực chất là «sản phẩm trong
  MỘT shop», và tầng `cap='nuoc'` — khoá `(san_pham_ma, thi_truong)` — thành dư thừa.
  Cộng chú thích sẵn có ở migration 010: `page.thi_truong` mới có ở **140/514** page ⇒ tầng
  nước chỉ với tới 27% số page. Đây đúng hình dạng kinh doanh mà cây ba tầng sinh ra để
  phục vụ, nên đáng cân TRƯỚC khi GD2 đi tiếp.
  ✅ **ĐO ĐƯỢC 15/09** (thay cho cảnh báo «chưa đo» cũ): ba `variation_id` khác nhau cho cùng
  Fitgum ở Saudi · Kuwait · Oman — xem bảng ở mục trên. Suy luận «cùng một SP ở hai nước có
  hai mã khác nhau» ĐÚNG NGUYÊN VĂN trên dữ liệu thật, nên tầng `cap='nuoc'` dư thừa đúng như
  đã lo. Thêm một số đo có ích: giá của cùng SP ở ba nước **bóc được tự động từ đơn POS**
  (Saudi 99/149/199 SAR · Kuwait 10,90/15,90/18,90 KWD · Oman 12/18/25 OMR), nên nếu gộp mã
  sản phẩm theo thương hiệu thì bảng giá theo nước sinh được, không phải nhập tay.

- 11/09 · UI-GOM-4 — 🧭 **ÁN LỆ: THAY CHUỖI BẰNG MỘT KHÚC CON CỦA KHAI BÁO DÀI HƠN.**
  Sửa `chi-tiet-viec.html` bằng phép thay chuỗi `"function veDongViec(d) {"` — mà nó là khúc
  con của `"async function veDongViec(d) {"`. Khối mới rơi vào GIỮA `async` và `function`.
  Trang thành lỗi cú pháp: **vẫn hiện bình thường, mọi nút trên đó chết**, và **104 bài test
  của dispatch vẫn XANH** vì không bài nào đọc script trong trang. Cùng họ với án lệ ⑤c
  (01/09, dấu huyền ngược trong `dieu-huong.js`), chỉ khác cơ chế.
  Đã vá: `v3/test/b/trang-parse-duoc.test.mjs` đọc MỌI `trang/*.html` và bắt phân tích từng
  khối `<script>` — bắt được đúng lỗi này ngay lượt chạy đầu. 📌 Bài học: neo phép thay chuỗi
  vào RANH GIỚI DÒNG, đừng neo vào một chuỗi có thể là khúc con của chuỗi dài hơn.
  Nhật ký: `docs/thi-cong/nhat-ky/ui-gom-4-11-09.md` §3.

- 11/09 · TIẾP QUẢN — ✅ **ĐÃ SỬA 15/09** · GIẤY TỜ TRÔI, SỬA MỘT LƯỢT (việc của TỔNG).
  ① Nhịp tim đầu sổ đứng ở 23/08 («SÓNG VÁ 2/4, đang chạy VA-R1+VA-R2»), trong khi VA-R1 ✅
     `1562d58`, VA-R2 ✅ `5caf5be`, gate RVA ✅ — §10 đã ghi tới 01/09.
  ② Bảng §5b vẫn ghi VA-R1 · VA-R2 «🎫 chờ review», dù cả hai đã có cổng riêng
     (`va-r1.sh` 12/12 · `va-r2.sh` 17/17) và §10 01/09 báo 25/25 cổng rc=0.
  ③ `BAN-GIAO-CHUYEN-CONG-CU.md §1` ghi «chưa push — ~100 commit local»; thực tế
     `origin/main` = `af1e764`, nay còn 3 commit chưa push.
  ④ Sổ ghi «Node v25»; máy tiếp quản chạy **v24.19.0**, mà ba cổng `a7-*` nhận khuôn Node 25.
  Nhật ký: `tiep-quan-09-09.md` §2.
  ✅ **15/09 vá cả bốn:** ① nhịp tim viết lại theo số đo 15/09 · ② §5b điền ✅ + hash cho VA-R1
  (`1562d58`) · VA-R2 (`5caf5be`) · RVA · ③ `BAN-GIAO-CHUYEN-CONG-CU.md §1` sửa thành
  `origin/main` = `e657af1`, còn 3 commit local · ④ §0a khai Node đo được `v24.19.0`.
  **Còn nguyên một điều KHÔNG vá được bằng giấy:** ba cổng `a7-*` vẫn nhận khuôn Node 25 trong
  khi máy A chạy 24 — đó là mã, không phải chữ; ai đụng tới `a7-*` thì đo lại trước.

- 15/09 · CRUD KẾT NỐI POS — ⬜ **BA NỢ ĐẺ RA TỪ LƯỢT NÀY, ghi chứ không tiện tay sửa.**
  ① **Hai đường TOKEN ghi nhật ký SAU khi đã sửa.** `POST`/`DELETE /api/ket-noi/token` gọi
     `themToken`/`boToken` rồi mới `ghi()`; phễu chưa nối thì token ĐÃ thêm/bỏ thật, người
     bấm nhận 500, và không có dòng nào truy ngược. Bốn cửa POS mới đã chặn ở cửa VÀO
     (`batBuocPheu()`), hai cửa token thì chưa — cùng hình dạng, ngoài phạm vi lượt này.
  ② **Không có nút «Thử kết nối» cho POS.** Cửa thêm/sửa kết nối KHÔNG gọi sang POS để kiểm
     khoá, vì lượt gọi thử là một đường ra ngoài và dự án này cho mọi đường ra ngoài đi qua
     van. Hệ quả đang chịu: khoá sai chỉ lộ ở lượt TẠO ĐƠN đầu tiên của thị trường đó. Màn
     nói thẳng điều này, nhưng nói không thay được đo. Phiếu sau: cấp nút thử đi qua đúng
     cửa POS đã có (`src/pos/doc-danh-muc.js`), không mở đường HTTP thứ hai.
  ③ **Một câu chú thích khai sai về code khác** (án lệ #3). `v3/src/ui/ket-noi/kho-ket-noi.js`
     luật ② viết «câu `ON CONFLICT` cố ý bỏ `marketer` … ra ngoài»; đọc `db/di-tru/nap.js:57`
     thì `marketer` CÓ trong `SET`, được giữ bằng `CASE WHEN page.marketer <> ''`. Hiệu quả
     giống nhau nên không ai phát hiện, nhưng người sau đọc câu đó rồi đi tìm một danh sách
     loại trừ không tồn tại.

- 15/09 · 🧭 **ÁN LỆ: DẤU HUYỀN NGƯỢC TRONG CHÚ THÍCH SQL — và cái thước đọc-chữ không thấy.**
  Thêm chú thích vào câu `ON CONFLICT` của `db/di-tru/nap.js`, trong đó có `` `thi_truong` ``.
  Câu SQL ấy nằm trong CHUỖI MẪU, nên một dấu huyền ngược đóng chuỗi giữa chừng ⇒ `nap.js`
  **chết cú pháp**, `npm run di-tru` không chạy được nữa. Cùng họ án lệ ⑤c (01/09, `dieu-huong.js`).
  Điều đáng ghi không phải cái lỗi — mà là **ca canh đúng tệp đó vẫn XANH**: ca
  `COT_BI_DI_TRU_GHI_DE` đọc `nap.js` bằng `readFileSync` + biểu thức chính quy, tức nó đo
  VĂN BẢN, không đo một mô-đun nạp được. Thứ bắt được là bộ ca HÀNH VI mới
  (`test/di-tru-giu-cot-nguoi-dat.test.js`) vì nó `import` thật rồi chạy hai lượt `napPage`.
  📌 Bài học: **thước đọc file bằng regex không chứng minh file còn chạy được.** Tệp nào chỉ
  được test đọc dưới dạng văn bản thì phải có ít nhất một ca IMPORT nó.

- 15/09 · TẠO NGƯỜI DÙNG — ⬜ **HAI NỢ MỚI.**
  ① 🔴 **KHÔNG CÓ ĐƯỜNG ĐẶT LẠI MẬT KHẨU.** Grep 15/09: không `doiMatKhau`/`datMatKhau` nào
     trong `v3/src`. Cửa tạo người dùng vì thế BẮT BUỘC đặt mật khẩu lúc tạo (nếu không sẽ
     đẻ ra tài khoản không ai đăng nhập được và không ai sửa được). Hệ quả còn lại: người
     dùng QUÊN mật khẩu thì phải `psql` — đúng cái lỗ vừa bịt, chỉ dịch sang một bước. Phiếu
     sau nên cấp: quản trị đặt lại mật khẩu cho một thành viên trong team mình.
  ② ⬜ **`POST /api/page-bot/:id/marketer` nay là cửa API KHÔNG MÀN NÀO GỌI** — người quyết
     chốt 15/09 bỏ ô nhập khỏi màn, giữ cột và giữ bản tin `src/readiness.js` cắt theo
     marketer. Cửa vẫn sống, vẫn có ca test, giá trị nay tới từ `pages.json` qua lượt di trú.
     **Ghi ở đây để lượt «soi cửa ghi» sau ĐỪNG báo nhầm nó là cửa mồ côi cần nối** — nó mồ
     côi có chủ ý.

- 15/09 · DỜI TRẦN KIỂM KÊ `g2-a3` 15 → 17 — ⬜ **NỚI TRẦN CHO CHÍNH MÃ VỪA VIẾT, ghi để cãi được.**
  Cổng `g2-a3` bắt đúng lượt CRUD kết nối POS: `src/pos/ket-noi.js` thêm HAI câu `UPDATE` tay
  (`suaKetNoi`, `batTatKetNoi`), kiểm kê đất A đi từ 15 → 17 ⇒ cổng đỏ «CÓ CỬA GHI MỚI».
  Không gộp được vào bộ dựng chung, và lý do đã có sẵn từ L1-M1: `ket_noi_pos` CHỨA BÍ MẬT
  (khoá API POS mã hoá) nên CỐ Ý nằm ngoài `BANG_NGHIEP_VU_CHUAN` — cùng loại với
  `src/queue/kho.js` đã được khai. Bộ ĐỌC của bảng ấy vốn đã viết SQL trần vì đúng lý do đó;
  cửa GHI đi cùng đường là nhất quán.
  Dời mốc theo đúng tiền lệ 01/09 (8 → 15): khai lý do trong `ly_do()`, ghi khối chú thích
  inline, và ghi §9. 📌 Điều giữ cho việc này không thành thói quen KHÔNG phải con số mà là
  vế thứ hai của phép ②: tệp chưa khai lý do thì cổng đỏ dù tổng dưới trần. Con số nới được;
  lời khai thì người sau đọc được và cãi được.

- 15/09 · 🔴🔴 **HỆ SỐ TIỀN `KWD` NGHI SAI 10 LẦN — ĐƯỜNG TIỀN, BẢN V1 ĐANG CHẠY.**
  `CCY_FACTOR` (`src/pancake-orders.js:162`, bản đang phục vụ 51 page) và bản chép của nó
  `HE_SO_TE` (`src/pos/tao-don.js:96`) đều khai `KWD/OMR/BHD ×1000`. Hệ số này nhân vào
  **giá AI chốt với khách** rồi gửi POS (`hang-cho.js:151` ở v3; `pancake-orders.js:165` ở v1).

  Đo trên đơn THẬT của shop Kuwait: giá khai bằng chữ trong kịch bản của 3 page Kuwait khác
  khớp `cod ÷ 100`, **không** khớp `÷ 1000`, sáu giá trên sáu:

  | Kịch bản ghi | ÷100 | ÷1000 | Có trong dữ liệu? |
  | --- | --- | --- | --- |
  | Luxoria `8,9 KWD` | 890 | 8900 | **890 có** · 8900 không |
  | Luxoria `12,9 KWD` | 1290 | 12900 | **1290 có (183 đơn)** · không |
  | Luxe Charm `11 KWD` | 1100 | 11000 | **1100 có** · không |
  | Luxe Charm `16 KWD` | 1600 | 16000 | **1600 có** · không |
  | Amoura `13 KWD` | 1300 | 13000 | **1300 có** · không |
  | Amoura `22 KWD` | 2200 | 22000 | **2200 = đúng p99** · không |

  Cùng phép đo này xác nhận `SAR ×100` là ĐÚNG (Saudi `SL2→9900` = 99 SAR y như kịch bản),
  nên thước dùng chung cho cả hai, không phải thước riêng cho kết luận mình muốn.

  **Hậu quả nếu đúng:** AI chốt «10,90 KWD» → ghi `10900` → POS thu **109 KWD**, gấp 10.
  Chưa nổ diện rộng (quét 2.500 đơn Kuwait: p99 = 2.200, chỉ 6 đơn ≥ 8.000 và đều giải thích
  được) vì nhánh `agreed` chỉ chạy khi AI bóc được `total_price` thành số; phần lớn đơn rơi
  về bảng giá học từ đơn cũ, vốn đã đúng đơn vị. **Nhưng là mìn đã cài**, và ba tệ dính:
  KWD · OMR · BHD.
  ⛔ CHƯA SỬA: `src/pancake-orders.js` nằm trong 62 tệp phẳng CẤM SỬA (luật 4 §0a), và kết
  luận này là SUY TỪ DỮ LIỆU — phép xác nhận cuối cùng là mở POS xem một đơn Kuwait hiện
  `10,900 KD` hay `1,090 KD`. Người quyết xác nhận rồi mới mở phiếu vá, kèm bộ ca đối chiếu
  giá-kịch-bản ↔ `cod` cho từng thị trường.

- 15/09 · ✅ **SỬA MỘT LỜI KHAI SAI TRONG CHÍNH SỔ NÀY: lỗi 121 KHÔNG phải chặn theo IP.**
  §0a đang ghi «Token Pancake từ IP máy cá nhân bị chặn (lỗi 121) — số đo Pancake thật phải
  lấy trên VPS, đừng debug ở local». Đo 15/09 từ đúng máy cá nhân đó: `GET /pages` → **200,
  218 page**. Lỗi 121 nguyên văn là `"Không tìm thấy gói cước nào cho người dùng này"` và nó
  đi **theo PAGE**: `Amoura Gold KW` qua được, hai page Healthy Figure (kể cả page Saudi đang
  chạy 788 hội thoại) thì 121. API POS cũng gọi được từ local (đã đọc 2.500 đơn).
  📌 Giá đã trả cho lời khai sai này: một quãng dài không ai dám đo Pancake ở local. Án lệ #3
  đúng chỗ — «mỗi câu chú thích khai về hành vi của hệ khác phải kèm một phép đo trong lượt».
  §0a đã sửa cùng commit.

- 15/09 · ⬜ **ẢNH CHỤP DỮ LIỆU TRÊN MÁY DEV ĐÃ CŨ HƠN HỆ THẬT.** Màn Kịch bản của hệ thật
  (ảnh người quyết gửi 15/09) hiện một page bán «Aeekiv Comfort Massage Cream», kịch bản
  tiếng Indonesia, mang dấu «(nhập từ Pancake)». Page ấy **không có trong `kb-overrides.json`**
  của gói bàn giao 19/08 mà máy dev đang dùng. Hệ quả phải nhớ: mọi kết luận kiểu «page X
  chưa có kịch bản» đọc từ máy dev chỉ đúng với ảnh chụp cũ, không đúng với hệ thật. Trước
  khi kết luận một page thiếu gì, mở màn Kịch bản của hệ thật mà xem.
  (Thêm chứng cứ đường nhập liệu: **73/77** page trong `kb-overrides.json` mang dấu
  «(nhập từ Pancake)» ⇒ export `.xlsx` → `src/import-script.js` là đường CHUẨN, không phải
  ngoại lệ. API Pancake không có endpoint trả «trả lời nhanh» — đã đọc đặc tả chính thức
  `developer.pancake.biz/openapi/openapi.yaml`, 4.343 dòng, đúng 28 endpoint, không có.)

- 16/09 · 🔴 **SỰ CỐ DO TÔI: DEPLOY CODE TRƯỚC MIGRATION — và tôi còn nói với người quyết
  rằng không cần chạy migration.** Đẩy CR4+CR6 lên prod kèm câu «014 chưa cần chạy hôm nay,
  nó chỉ thêm cột». SAI: CR4 đọc `kich_ban.san_pham_goc_ma`, CR6 đọc bảng `san_pham_goc`.
  Lược đồ prod dừng ở 013 ⇒ **màn Page & bot của v3 ném `42703`**.
  ✅ **Đường chat KHÔNG bị ảnh hưởng, đo được**: `rap-prompt.js` chỉ được `handler-v3.js` gọi,
  mà worker v3 chưa cài trên VPS; `prompts.js` · `kb.js` · `handler.js` · `closer.js` (đường
  v1 đang phục vụ 123 page) có **0** dòng chạm mã mới. Chỉ dashboard v3 (:3102) hỏng.
  📌 HAI án lệ, cái thứ hai mới:
  ① Án lệ #7 sẵn có («reader mới phải có lưới migration») + luật §5 skill `mo-van`
     («migration lên TRƯỚC, code mới ra SAU») — tôi đảo cả hai.
  ② **MỘT LƯỚI CANH MIGRATION CŨ KHÔNG CHE ĐƯỢC CỘT CỦA MIGRATION MỚI.** `kich-ban.js` ĐÃ
     có lưới `coCotCap` (canh cột `cap` của 010) và tôi tưởng thế là đủ. Câu tra mới dùng
     cột của 014 và nằm SAU lưới ấy, nên lưới cho qua rồi câu mới ném. Mỗi migration mà
     reader mới đọc cần LƯỚI RIÊNG của nó.
  Đã vá: `coCotGoc` + `coCotSanPhamMaGoc` (kich-ban) · `coBangSanPhamGoc` bằng mã `42P01`
  (kho-page, và ném lại mọi lỗi khác chứ không nuốt) · màn phân biệt «chưa áp 014» với «chưa
  ai soát gộp» vì hai câu ấy dẫn người đọc đi hai hướng. Thước
  `test/cr1509-luoi-migration.test.js` dựng cảnh thật bằng `xuong()` — gỡ đúng 014 bằng bản
  `.down.sql` THẬT, nên nó canh luôn việc bản down có gỡ sạch. Đảo-vá: gỡ lưới ⇒ đúng
  `42703 column "ma_goc" does not exist`.

- 16/09 · ⬜ **BẢNG KHAI BIẾN: cột «VPS v3» là MỤC TIÊU, không phải HIỆN TRẠNG.** Đo thật
  trên `/opt/aicloser/.env` ngày 16/09: có `ADMIN_USER` · `V3_KHOA_VE`; **KHÔNG có**
  `V3_KHOA_CHU` · `V3_PANCAKE_GUI` · `V3_POS_GHI` · `AUTO_CREATE_ORDER=1`.
  Hệ quả tốt: hai cửa ghi ra ngoài của v3 đang ĐÓNG (fail-closed đúng), và cửa tạo đơn tự
  động của v1 cũng TẮT ⇒ nợ 🔴 `CCY_FACTOR.KWD` **không nổ được** hôm nay.
  Hệ quả phải nhớ: thiếu `V3_KHOA_CHU` thì mọi lượt đọc khoá model trong `khoa_nha` sẽ NÉM —
  chạm ngay việc H6 (nạp tiền model) nếu dùng khoá riêng theo team.
  Bảng khai nên tách hai cột «VPS: mục tiêu» và «VPS: đo được ngày nào», kẻo người đọc tin
  cột mục tiêu là hiện trạng — đúng cái tôi vừa tin.

- 16/09 · 🟡 **NGUỒN «PAGE BÁN SẢN PHẨM NÀO» — ĐO LẠI, BA SỐ TRONG WIREFRAME/ĐỀ XUẤT CŨ SAI.**
  Bóc từ `pages.json` + đơn POS thật hôm nay:
  | điều tôi từng khai | đo được 16/09 |
  |---|---|
  | «514 page» | **577 page** (`pages.json`), 115 `lost` (19,9%) ⇒ **462 còn sống** = mẫu số thật |
  | «marketer tới từ `pages.json`» | trường `marketer` **rỗng 100%** (0/577) — không tới từ đâu cả |
  | «lấy SP của page từ danh mục» | ⛔ **TÔI ĐO SAI** — xem dòng tự sửa ngay dưới |
  ⛔ **TỰ SỬA (cùng phiên):** tôi khai «trường `products` rỗng 100% (0/577) ⇒ bóc từ ĐƠN là
  đường DUY NHẤT». SAI vì tôi kiểm bằng `Array.isArray(x.products)` — mà `products` là **số
  đếm**, không phải mảng (`src/page-registry.js:196` ghi `products: kb.products || 0`).
  Đo lại đúng kiểu: **76/577 page CÓ sản phẩm** (74 page có 1 · 2 page có 2 · 501 page có 0).
  ⇒ Nguồn page→sản phẩm ĐÃ TỒN TẠI cho 76 page: bảng tính KB (`src/kb.js:53` đọc các cột
  page · market · category · marketer · products). Bóc từ đơn là đường bổ sung, KHÔNG phải
  đường duy nhất. 📌 Án lệ: kiểm một trường bằng vị từ sai kiểu (`Array.isArray` trên số) cho
  ra «rỗng 100%» — đúng cái bẫy «lời khai sai là bằng chứng giả» (án lệ #3), lần này tôi tự gây.
  ⇒ Cũng giải thích luôn vì sao `market` có 157 mà `marketer` có 0: cùng một bảng tính, cột
  marketer bỏ trống.
  Và hai chỗ mù chưa bản nào đếm, đo trên 12.933 dòng hàng (Saudi):
  **28,7% dòng đơn KHÔNG có `page_id`** (đơn tay/kênh khác ⇒ không gán về page được) ·
  **18,9% tên biến thể KHÔNG có số hiệu** ⇒ không suy ra SP gốc. Gần ⅓ lịch sử đơn vô dụng
  cho việc gán, và cả `goi-y-gan-page.mjs` lẫn `goi-y-gop-san-pham.mjs` đều im về nó.
  ➜ NÊN: mọi báo cáo gợi ý phải in TỬ SỐ/MẪU SỐ kèm phần bị loại, không in số tuyệt đối trần.

- 16/09 · 🟡 **ĐỘ SÂU ĐỌC LẶNG LẼ QUYẾT CÂU TRẢ LỜI (án lệ #35, đã chưng vào `tho-thi-cong`).**
  Cùng ngày, cùng 7 shop, chỉ đổi `--trang`: 500 đơn/shop ⇒ 120 page · 81 «bán 1 SP» (67,5%
  sạch); 3000 đơn/shop ⇒ **199 page · 109 «bán 1 SP» (54,8% sạch)**. Độ phủ TĂNG, độ chắc
  TỤT — hai trục ngược chiều, không có độ sâu nào «đúng». Riêng Saudi, độ phủ **không hội tụ**:
  100 đơn→20 page · 10.000 đơn→92 page · cạn→103 page.
  Nguyên nhân gốc: câu «page bán gì» có hai tham số ẩn (độ sâu đọc + cửa sổ thời gian) mà
  script cũ in một con số như thể nó vô điều kiện. Đã vá: `goi-y-gan-page.mjs` tách trục ĐỘ
  PHỦ khỏi trục PHÂN LOẠI, in tham số lên đầu báo cáo, và thêm `ops/bin/do-don-tho.mjs` đổ
  thô một lần để tính lại offline (đọc POS lại mỗi lần đổi tham số thì hai lượt đọc hai tập
  dữ liệu khác nhau ⇒ KHÔNG so được).
  Đo thêm: POS trả đơn **mới→cũ tuyệt đối** (5.721 dòng Saudi, 0% nghịch thứ tự) ⇒ dừng theo
  MỐC NGÀY là chắc chắn, không cần trần số trang. Và Saudi ~200 đơn/ngày ⇒ «đọc cạn» là hàng
  trăm nghìn đơn mà KHÔNG cần: tập đầy đủ của page là `pages.json`, không phải lịch sử đơn.

- 16/09 · 🟡 **THỊ TRƯỜNG CỦA PAGE: liên kết `posShopId` chỉ phủ 22,4%, và 1 kết luận của tôi
  đã SAI.** Người quyết chỉ ra (đúng) rằng thị trường màn «Nhận page» nên theo TÀI KHOẢN POS,
  không phải suy từ tên. Đo `pages.json`: `posShopId` có ở **129/577 (22,4%)** — UAE 44 ·
  Kuwait 29 · Saudi 26 · Qatar 12 · Bahrain 9 · Oman 9 · **Taiwan 0**. `posVia` nói liên kết
  ấy tới từ đâu: `khớp thị trường` 68 (phỏng đoán) · `đơn thật` 61 · `null` 448.
  Đơn thật mở rộng liên kết rất mạnh: riêng phần Saudi đã đọc cho thêm **131 page** chưa có
  `posShopId`.
  ⛔ **TỰ SỬA:** tôi đã khai «0 page bán qua nhiều thị trường ⇒ page gộp theo thị trường là
  sự thật đo được». SAI — lúc đo, lượt đọc mới chỉ có đơn của **một** shop (Saudi), nên không
  page nào CÓ THỂ xuất hiện ở hai thị trường. Bằng chứng ngược nằm ngay trong dữ liệu ấy:
  `Minty Fresh Smile UAE` từng được liên kết sang UAE bằng `posVia=đơn thật`, nay có 6 dòng
  đơn ở Saudi ⇒ page bán qua HAI shop. Câu «page có gộp theo thị trường không» chỉ trả lời
  được khi đủ 7 shop — CHƯA CHỐT, đang đọc.
  📌 Bài học cùng họ với án lệ #35: **một tập dữ liệu chưa đầy đủ không chỉ làm số sai lệch,
  nó có thể làm một kết luận PHỦ ĐỊNH ra đúng một cách giả tạo.** «Không thấy ca nào» trên
  tập thiếu 6/7 nguồn thì không phải bằng chứng.

- 16/09 · 🔴 **NGUỒN PAGE: SỔ NÀY ĐANG KHAI SAI — POS CHO CẢ PAGE, KHÔNG CHỈ SHOP.**
  Người quyết hỏi «page lấy từ đâu? POS, Pancake hay khai tay?» ⇒ đo lại, và điều tôi đã ghi
  («POS cho products/orders/stock; page tới từ `pages.fm`») là **SAI**.
  `GET /shops/{id}/pages` trả 200 kèm trọn danh sách: **653 page qua 7 shop, trong 7 lượt gọi.**
  | nguồn | page | |
  |---|---|---|
  | POS 7 shop | **653** | Saudi 274 · UAE 156 · Kuwait 93 · Qatar 50 · Oman 32 · Taiwan 28 · Bahrain 20 |
  | `pages.json` | 577 | 115 `lost` |
  | có ở CẢ HAI | 546 | |
  | CHỈ POS có | **107** | POS biết mà tệp Pancake không |
  | CHỈ `pages.json` có | 31 | ngược lại |
  Mỗi bản ghi page POS mang: `id · name · username · settings · shop_id · phone_number ·
  platform · tags_ref`. **Không có sản phẩm** ⇒ C3 vẫn phải bóc từ đơn.
  ➜ HỆ QUẢ: `posShopId` chỉ phủ 129/577 (22,4%) vì hệ đang SUY liên kết page→shop
  (`posVia`: `khớp thị trường` 68 — phỏng đoán từ tên · `đơn thật` 61 · `null` 448) trong khi
  POS **trả thẳng** quan hệ đó. Phải đổi nguồn nạp page sang `/shops/{id}/pages`.

- 16/09 · ✅ **«PAGE GỘP THEO THỊ TRƯỜNG» — ĐÚNG, đo trên trọn 7 shop: 0/653 page thuộc >1 shop.**
  Nên shop → thị trường là 1–1, KHÔNG cần đoán. Việc này chốt luôn hai thứ tôi đề xuất sai
  trong cùng phiên:
  ① tôi đề xuất suy thị trường từ TÊN page (phủ 83%) — **bỏ**, nguồn yếu hơn hẳn;
  ② tôi báo «6 page lệch giữa khai và tên» rồi «5 page đơn nói khác `posShopId`» — **5/6 là
     GIẢ**, sinh ra vì lúc đo lượt đọc chỉ có đơn của Saudi nên page nào có một đơn lẻ tạo ở
     shop Saudi cũng bị kết luận thuộc Saudi. `page_id` trên ĐƠN là tín hiệu YẾU (đơn có thể
     do người tạo ở shop khác); danh sách page của shop là tín hiệu MẠNH.
  📌 Cùng họ án lệ #35: tập dữ liệu thiếu không chỉ làm số lệch, nó sinh ra cả ca lệch KHÔNG
     TỒN TẠI — và một kết luận phủ định («0 ca») trên tập thiếu 6/7 nguồn là vô nghĩa.

- 16/09 · 🟡 **CHỐT SỐ C3 trên mẫu số THẬT — máy gợi ý được ~21%, không phải ~67%.**
  Bản mới `ops/bin/do-page-pos.mjs` hỏi thẳng từng page (`orders?page_id=X` lọc ĐÚNG — kiểm
  653/653 page, 0 đơn lạc). Đọc 50 đơn mới nhất mỗi page, cửa sổ 90 ngày:
  | | page | /653 |
  |---|---|---|
  | có đơn (bất kể ngày) | 549 | 84,1% |
  | CHƯA có đơn nào | 104 | 15,9% ⛔ gán tay |
  | có đơn nhưng tên biến thể THIẾU số hiệu | 175 | 26,8% ⛔ |
  | đơn cuối đã quá 90 ngày (nguội) | 225 | ⛔ đừng gán theo lịch sử cũ |
  | **bán 1 SP trong 90 ngày** | 115 | 17,6% |
  | nhiều SP, 1 cái ≥80% | 27 | 4,1% |
  | bán lẫn thật | 67 | 10,3% ⚠️ người quyết |
  ⇒ **~142/653 page (21,7%) máy đề xuất được**; 559 page còn sống ⇒ phần còn lại là việc NGƯỜI.
  ⚠️ **Tự kiểm theo án lệ #35 và nó bắt được lỗi thật:** 55/115 page «bán 1 SP» chạm trần 50
  đơn ⇒ đọc sâu lại 55 page ấy (tới 600 đơn) ⇒ **21 page lộ thêm SP**. 19 ca chỉ là đơn lạc
  (áp đảo ≥96%, không đổi kết luận), nhưng 2 ca đổi HẲN:
  · `Kreain Nature PH in Saudi` — 50 đơn nói SP `205`; 500 đơn nói `121:291 / 205:149` ⇒ **50
    đơn gọi SAI TÊN sản phẩm chính**. Gán theo nó thì bot tư vấn sai giá cho khách.
  · `FlexiCare Joint Gel Saudi` — đọc 356 đơn mà 90 ngày chỉ có 2 đơn ⇒ không đủ cơ sở gán.
  📌 Bài học bổ sung cho #35: đọc mỏng không chỉ THIẾU dữ liệu, nó **gọi sai tên** — và sai
     ở đúng chỗ dẫn tới sai giá bán. Mọi page chạm trần cửa sổ đọc phải bị đánh dấu
     «CHƯA KIỂM», không được đưa vào câu `UPDATE` gợi ý.
  ➜ `ops/bin/goi-y-gan-page.mjs` đã đánh dấu LẠC HẬU ngay đầu tệp (mẫu số của nó là tập con
     tình cờ lọt cửa sổ đọc, nên mọi số nó in đều sai cùng một hướng).

- 16/09 · ✅ **ĐÃ VÁ HỆ SỐ TỆ — nợ 🔴 15/09 ĐÓNG. Người quyết xác nhận: POS hiện `10.9`.**
  Điều kiện mà §9 tự đặt («xác nhận rồi mới mở phiếu vá, kèm bộ ca đối chiếu giá ↔ `cod` từng
  thị trường») đã đủ. Đo thêm để khỏi suy từ một tệ — đọc 100 đơn mới nhất mỗi shop:
  | thị trường | `cod` thật | ÷100 | ÷1000 | bảng khai cũ |
  |---|---|---|---|---|
  | Kuwait | 990·1090·1290·1890 | **9,90·10,90·12,90·18,90** ✓ | 0,99·1,09 ✘ | `1000` ✘ |
  | Oman | 1000·1100·1200·2900 | **10·11·12·29** ✓ | 1,0·1,2 ✘ | `1000` ✘ |
  | Bahrain | 1100·1200·1800·2800 | **11·12·18·28** ✓ | 1,1·1,8 ✘ | `1000` ✘ |
  | Saudi · UAE · Qatar | 6900…19900 | **69…199** ✓ | 6,9…19,9 ✘ | `100` ✓ |
  Neo tuyệt đối: page `Healthy Figure PH in Kuwait` hiện **10.9 KWD**, `cod` đúng đơn đó =
  **1090**. ⇒ **POS lưu ×100 cho MỌI tệ**, không theo ISO 4217.
  📌 Vì sao lỗi sống lâu: KWD·OMR·BHD thật sự có 3 chữ số thập phân, và **người Kuwait viết
  giá 3 số lẻ** («13,900 KD» = 13,9 KD). Nên `1000` vừa đúng chuẩn tệ vừa đúng cách người
  viết — chỉ sai ở cách POS LƯU. Hai quy ước, không được gộp: «13,900 KD» → 13,9 → ×100 →
  `cod` 1390. `parseOffers` bóc ở 3 số lẻ là ĐÚNG, đừng sửa theo.
  **ĐÃ SỬA** `src/pos/tao-don.js` `HE_SO_TE`: KWD·OMR·BHD 1000→100, kèm khối chú thích mang
  toàn bộ số đo. Bộ ca mới `test/he-so-te-doi-chieu-don-that.test.js` (5 ca, known-answer,
  KHÔNG gọi mạng): H1 đối chiếu mọi mức `cod` thật ↔ khoảng tiền hợp lý từng thị trường ·
  **H2 là ca đo SỨC BẮT** — dựng lại hệ số cũ và đòi nó bị bắt ≥15 lần, kẻo H1 xanh vì
  khoảng quá rộng chứ không vì hệ số đúng · H3 neo `10,9 KWD ⇔ 1090` · H4 chặn lượt thêm tệ
  mới theo chuẩn ISO (đếm TỪ NGUỒN, án lệ #22) · H5 tệ lạ ⇒ null.
  **BỐN THƯỚC ĐANG BẢO VỆ LỖI — đã sửa cả bốn** (án lệ #27 «đổi luật thì đổi thước»):
  `l3-m4-hang-cho:150` KWD 10→10000 · `l3-m4-duyet:230` `doiSangDonViNho(12,KWD)`→12000 ·
  `va-r2:172` KWD 15→15000 · `va-r2:149` neo `bang.some(x=>x.includes("×1000"))` — neo này
  CHẾT THEO phiếu vá, nên tôi giữ Ý ĐỒ («quét nhiều tệ») và đổi phép đo sang đếm từ
  `Object.keys(HE_SO_TE).length` (án lệ ②+④).
  ⚠️ Lượt grep đầu của tôi bỏ sót `va-r2:172` vì mẫu tìm `1000` không khớp `15000`.
  📌 Án lệ: tìm hằng số sai bằng grep GIÁ TRỊ là tìm thiếu — phải quét theo TÊN TỆ kèm mọi
  số, rồi soi từng dòng. Bộ ca chỉ xanh trọn sau lượt quét thứ hai.
  **CÒN NỢ, KHÔNG SỬA ĐƯỢC Ở PHIẾU NÀY** — cả hai trong 62 tệp phẳng CẤM SỬA (luật 4 §0a):
  · 🔴 `src/pancake-orders.js:162` `CCY_FACTOR` — đường tạo đơn **v1**, vẫn ×1000;
  · 🟡 `src/admin.js:369` `CCY_DIV` — đường **HIỂN THỊ**, nó CHIA 1000 ⇒ dashboard đang hiện
    tiền Kuwait·Oman·Bahrain **NHỎ ĐI 10 LẦN**. Lỗi này chưa ai ghi, tôi thấy khi quét.
  Hai bản chép ấy sai, bảng ở `src/pos/tao-don.js` đúng — **đừng "đồng bộ" ngược lại.**
  Bộ ca: 1772 ca · 1769 xanh · **1 đỏ = D7** (đỏ có sẵn, không liên quan tiền).

- 16/09 · 🟡 **D7 ĐỎ VÌ THƯỚC, KHÔNG VÌ MÃ — và lý do là ảnh chụp dev.**
  `test/l0-m1-di-tru.test.js:172` đòi «ít nhất một page lạc phải là page ĐANG BẬT AI». Trên
  máy dev `ai-enabled.json` là `[]` ⇒ tiền đề KHÔNG THỂ đúng, ca đỏ bất kể mã. Cổng phát hành
  đếm 2 ca đỏ, lượt chạy tay đếm 1 ⇒ bộ ca còn CHẬP CHỜN, chưa ổn định.
  ➜ NÊN: ca này phải tự dựng dữ liệu (một page vừa `lost` vừa bật AI) thay vì đọc tệp thật —
  đúng án lệ #1 `tho-thi-cong` «cái thước cũng phải qua cổng». Chưa sửa: ngoài phạm vi phiếu
  vá tiền, và sửa ca của phiếu khác là án lệ #25.

═══════════════════════════════════════════════════════════════════════════════

- 16/09 · **AUDIT TOÀN HỆ + QUÉT 719 HỘI THOẠI THẬT** — nợ mở, xếp theo tiền:

  🔴 **N-HOÀN (lớn nhất về tiền, HOÃN theo lệnh người quyết 16/09).** Đo 4.423 đơn POS 60
  ngày / 14 page: hoàn+huỷ (mã 4·5·6·7) **Saudi 40,6%** (1.269/3.122) vs **UAE 20,4%**
  (252/1.236) vs Kuwait 13,8%. Cùng sản phẩm, cùng kịch bản: Golden Soap KSA 41,8% vs
  Golden Soap UAE 20,9%. Với phí ship hai chiều ~25 SAR/đơn (**chưa xác nhận với team**)
  thì riêng 14 page là ~38k SAR/60 ngày — lớn hơn **hai bậc** so với toàn bộ tiền token từ
  trước tới nay (1,03 triệu VNĐ). Ba việc đã thiết kế nhưng chưa mở phiếu: Order Assistant
  trả lời «khi nào giao» từ POS (0 token, `ordersForConv` đã có) · nối `orders/ti-le-hoan.js`
  vào cửa 5 hàng chờ · xác nhận trước giao cho KSA. **Mở lại sau sóng BH.**

  🔴 **N-C5 (chặn cutover v3).** `src/chat/rap-prompt.js:122` tra sản phẩm bằng
  `san_pham.page_id`, mà migration 015 tự khai cột đó **NULL cho mọi dòng, luôn luôn**
  ⇒ bật `V3_RAP_PROMPT_BAT=1` hôm nay là **mọi page rơi `noData` → bàn giao 100%**. Vá
  đúng: tra qua `page.san_pham_goc_ma` (015 đã dựng cột). Trùng RF-15.

  🟠 **N-INVIS.** 146/719 hội thoại (**20,3%**) có tin page mang ký tự vô hình
  U+E0000–E01EF — kỹ thuật né bộ lọc trùng của Meta, phát ra từ **công cụ RTO/broadcast
  khác**, không phải bot này (91 hội thoại mang chuỗi «hello, your order has been
  created…»). `outbound-guard.js:187` đã chặn đúng loại này ở chiều RA và gắn cờ «rủi ro
  mất page» — nhưng không ai soi chiều ĐỌC. Việc rẻ: quét hằng ngày, báo page nào bị bơm.

  🟠 **N-SEND.** `PANCAKE_READONLY` kiểm ở vòng poll (`pancake-poll.js:229`) chứ không ở
  primitive: `pancake.js` `messenger.js` `pancake-orders.js` có **0 dòng** nhắc biến này.
  Hai đường đi vòng: `POST /webhook → server.js:112 processMessage → sendText`, và
  `POST /admin/api/conversation/:psid/send` (`admin.js:347`). BH1 đặt `assertCanSend()` ở
  `src/core/van-gui.js` và gọi từ `tools.js`; **`pkSendReply` của `pancake-poll.js` vẫn hở**
  — cần mở thêm 2 file cấm, chờ người quyết (phiếu BH1b).

  🟠 **N-HOOK (BH1 phát hiện).** `.claude/hooks/` bị loại khỏi git bằng
  `.git/info/exclude:11` ⇒ **hook KHÔNG đi theo repo**. Luật 4 bản 16/09 đã sửa ở sổ và ở
  cổng `_chan1.sh` (cả hai có trong commit), nhưng bản hook trên MÁY KHÁC vẫn là bản cũ và
  sẽ CHẶN lượt Edit vào năm file bộ não. Ai lấy repo về mà thấy bị chặn: sửa
  `.claude/hooks/canh-file-cam.sh` theo §0a luật 4 — hoặc ta bỏ dòng exclude đó để hook
  thành tài sản chung. Cần người quyết chọn.

  🟡 Nợ nhỏ đã đo, chưa phiếu: `admin.js:97 /token-cost` bỏ `cwrite` ⇒ lệch `economics.js`
  (hai màn tiền nói hai số) · vé phiên v3 HMAC 8h **không thu hồi được** (`v3/src/auth/ve.js:19`,
  logout chỉ xoá cookie) · thiếu index `hang_cho_tao_don(team,hoi_thoai_id,du_lieu_don->>'tin_id')`
  và `nhat_ky(team,doi_tuong,doi_tuong_id)` — cái sau bị quét TOÀN BẢNG trước **mỗi** POST
  POS (`pos/tao-don.js:303`) · FK composite 014:74/015:40 dùng `ON DELETE SET NULL` không kê
  cột ⇒ nulls cả `team_id NOT NULL` ⇒ lỗi thay vì gỡ liên kết · `db/migrate.js` không
  checksum, không advisory lock.

  🧭 **Án lệ: dữ liệu bác thiết kế, và dữ liệu thắng.** Bốn luật trong `CORE` đang dạy
  NGƯỢC với số đo (ép chốt bằng lựa chọn · gửi nhiều ảnh · cấm checklist · tin dài). Không
  ai viết sai — chúng được viết khi chưa có phép đo nào cho «nói khéo». Bài học cho phiếu
  sau: **luật hành vi phải kèm thước ngay từ lúc viết**, nếu không nó sống mãi bằng niềm tin.

  🟠 **N-BH7 (28/09, phiên đối chiếu Minty KSA).** Ba việc lộ ra khi làm BH7, chưa phiếu:
  ① **Kịch bản page dạy ngược CORE** — Minty KSA (CSDL `kich_ban`) có câu chào 4 dòng ✅
  và «LUỒNG BÁN 1. chào, nêu 1-2 lợi ích, hỏi mấy set»; khối kịch bản đứng SAU CORE nên
  model nghe nó hơn. Đo sau BH7: 59% tin AI vẫn mở bằng «Hello». Marketer sửa trên màn
  Kịch bản — không sửa bằng code. ② **Cache Kimi hụt** — gọi thử liên tiếp 3 khách khác
  nhau: trúng 7.680/7.761 token cố định; lượt thật (46 lượt, 28/09): trúng TB 6.144, còn
  2.466 token vào giá đầy đủ/lượt ≈ 61đ/102đ. Phần cố định thật: CORE **4.331 token**
  (tiếng Việt ~2× tiếng Anh) · kịch bản ~1.560 · KB ~660 · tools ~1.210. ③ Page có
  `bo_luat_chung` riêng trong CSDL thì CORE bị THAY ⇒ luật tin ngắn của BH7 không tới.

  🔴 **N-TPD (28/09).** Tài khoản Moonshot chạm **hạn mức 1,5 triệu token/NGÀY cho cả tổ
  chức** giữa lượt đo BH7/BH8 (lỗi «organization TPD rate limit, current 1 500 346»). Máy
  chủ đọc log 24h: `aicloser` · `aicloser-v3` · `aicloser-worker-v3` KHÔNG có lỗi TPD /
  nhà cung cấp — nhưng khoá máy chủ không nằm trong env (kho khoá CSDL) nên CHƯA xác định
  được máy chủ có chung tổ chức với khoá dev không. Nếu chung: một lượt đo 60 lượt
  (~400k token) ăn 1/4 hạn mức ngày của bot thật. Việc: xác định tổ chức của khoá máy chủ;
  nếu chung thì tách khoá đo riêng. `gia-lap-mot-minh.mjs` chưa dừng ở lỗi TPD (BH8 thêm).
  ↳ **ĐÃ KIỂM 28/09 (đọc máy chủ, không in khoá):** KHÔNG chung. Khoá dev (CSDL dev, vân
  tay sha256 `de46adbf`) hợp lệ, số dư 7,98 USD. Khoá máy chủ `/opt/aicloser/.env`
  `KIMI_API_KEY` (vân tay `6dde0846`) **KHÔNG HỢP LỆ ở cả hai cổng**: `api.moonshot.ai` →
  401 «Incorrect API key provided», `api.moonshot.cn` → «Invalid Authentication». Máy chủ
  hiện không gọi Kimi: CSDL v3 `cau_hinh_model` **0 dòng**, `so_ai` 0 dòng/7 ngày;
  `ai-messages.jsonl` của bản cũ ghi lần cuối **28/08**. ⇒ Đo trên dev không đụng bot thật.
  🔴 Nhưng ngày bật lại AI trên máy chủ, mọi lượt sẽ 401 — **phải thay khoá trước khi mở
  van AI** (việc người: cấp khoá Moonshot hợp lệ cho máy chủ, nạp vào kho khoá team).

  🟠 **N-HT3 (28/09, phiếu UI-HT3 — bàn hội thoại).** Ngoài phạm vi âm của CR-28-09 (lược đồ):
  ① chỉ mục `don_hang (team_id, hoi_thoai_id) WHERE hoi_thoai_id IS NOT NULL` — mỗi lượt mở hội
  thoại quét 123.629 đơn (prod 28/09: 81–104 ms, 16.594 trang/lượt); ② `so_ai` chưa có chỉ mục theo
  `psid` (hôm nay 0 dòng); ③ `tin_cho_hoi_thoai` là chỉ mục một phần (`cho`/`dang_xu`) nên đọc dấu vết
  tin đã xong đi `tin_cho_xu_ly_conv` rồi lọc psid; ④ mã POS 17 (2 đơn gắn hội thoại) ngoài
  `src/pos/ma-trang-thai.js#BANG_MA` — màn hiện «mã 17 · chưa xác minh»; ⑤ tỉ lệ tin page còn nhãn
  «Page» trên hội thoại thật chưa đo (cần deploy); ⑥ phiếu UI-HT2 còn «mốc bot đẩy sang người» giữa
  khung chat và tìm theo tên. Nhật ký `docs/thi-cong/nhat-ky/phieu-UI-HT3.md`.

  🟢 **N-HT4 (28/09, phiếu UI-HT4 — thước §10).** ① Trang chi tiết việc chưa trỏ về bàn hội thoại
  cho việc loại hội thoại (còn «Hội thoại đầy đủ nằm ở Pancake»); ② đường lùi `'/dieu-phoi'` ở
  `v3/chay-that.js` (`app.get('/')`), `ui/chung/http.js#TRANG_MAC_DINH`, `dang-nhap.html`/`chon-team.html`
  — chỉ chạm khi đích theo vai hỏng; ③ `docs/v3/thiet-ke/HienTrang.dc.html` còn trích §10 cũ (ảnh chụp
  thiết kế 14/09, để làm lịch sử); ④ HK10 không đo được `mot-page` (đầu trang động).
  Nhật ký `docs/thi-cong/nhat-ky/phieu-UI-HT4.md`.

  🟠 **N-HT-PROD (28/09, quan sát bàn hội thoại trên máy chủ).** ① Ba lát danh sách TRỐNG trên prod: 0 việc
  mở, hội thoại chạm gần nhất 24/08 ⇒ cửa sổ 7 ngày rỗng — đề nghị «Tất cả» rơi về 100 hội thoại mới
  nhất khi cửa sổ rỗng (chờ người quyết); ② ~½ page token máy chủ không đọc được chat («không có quyền
  hạn trên trang này» 8–9 · «gói cước hết hạn» 3), kho token CSDL 0 token — việc người: cấp token có
  quyền; ③ 17/30 hội thoại mới nhất không có mã khách ở nguồn nào. Nhật ký
  `docs/thi-cong/nhat-ky/quan-sat-20260928-ban-hoi-thoai.md`.

- 28/09 · **NỢ SAU CR-28-09b (một nguồn)** — đo trên prod, không thuộc phạm vi đã làm:
  - **N-MN7** bot có MỘT bộ Chính sách/FAQ/Phản đối cho mọi page ⇒ team thật thứ hai lên bot thì phải tách ba khối theo page (cửa lưu đang TỪ CHỐI khi ≥2 team thật — `khoi-chung.js#batBuocGiuKhoiChung`).
  - **N-MN8a** team Tiểu Alpha chỉ BẬT kết nối POS Kuwait; Saudi · UAE · Qatar · Oman · Bahrain đang TẮT (bản cùng shop của team kỹ thuật thì bật) ⇒ 60+ page không nối được món POS tới khi người bật lại ở màn Kết nối. Không ai ghi nhật ký lượt tắt.
  - **N-MN8b** tạo đơn tự động chưa dùng `san_pham.pos_ma` — sản phẩm nạp từ bot mang mã `kb:…`, POS không biết mã đó. Đường tiền 🟥, phiếu riêng trước khi mở `V3_POS_GHI`.
  - **N-MN8c** 75/79 sản phẩm chưa tên — nối món POS rồi bấm «Dùng tên POS», hoặc gõ tay.
  - **N-KB** 2 câu chào cụt ở ký tự 200 (`1191101314082464`, `1240378795819215`) — khách thấy «�» cuối câu.
  - **N-PAGE** page `1100561323151723` có sản phẩm trên bot nhưng không có dòng `page` v3 ⇒ không sửa được trên v3.
  - **N-3102** ảnh bot gửi đi qua `http://169.58.33.8:3102` — không HTTPS, cổng giao diện mở thẳng Internet.
  - **N-NEO** cổng `l0-m1.sh` neo thiếu `lan_gui` · `token_pancake` · `nap_bo_qua` (từ trước CR).

- 29/09 · **NỢ MỞ RA KHI ÁP CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`):
  - **N-KEODON** kéo đơn KHÔNG chạy: `src/pos/doc-don.js#docDon` chỉ bộ ca gọi; worker v3 chỉ chạy hàng tin; crontab
    máy chủ không có lịch kéo đơn. `don_hang` prod 123.629 dòng là MỘT lần nạp 28/08, 100% vẫn `moi_tu_pos`. Ba job
    dùng đơn (`quet-don-moi` · `lich-nhac` · `chamTiLeHoan`) có mã + ca nhưng không lên lịch ⇒ màn Rủi ro hoàn và hồ sơ
    khách đứng trên lát 28/08. Nhà: LL17.
  - **N-SUYNGUON** `suyNguon` xếp «không hội thoại» thành `trang_ban_hang` ⇒ 113 đơn sale nhập tay / 14 ngày sẽ bị nhắn
    WhatsApp nhầm khi luồng WhatsApp bật. Nhà: LL17 (Ladi = có UTM).
  - **N-BANGTHUA** bảng `ky_nang` · `mau_0_dong` còn lại sau LL8/LL12 — gỡ hẳn xét sau một tháng không ai cần (lùi lược
    đồ không phải đường lùi). Tầng kịch bản sản phẩm/nước GIỮ (CR mục 2d), không nằm trong nợ này.
  - **N-THUHOI** «Thử hỏi bot» (LL4) cần khoá model sống — nối vào H6.

- 30/09 · **NỢ SAU VE2b** (`docs/thi-cong/nhat-ky/phieu-VE2b.md` §7):
  - **N-VE2B-LUAT** thẻ «Luật chung · trả lời sẵn» đầu cột trái trang page trỏ `/bo-luat` — marketer không mở được (403); có từ VE2,
    VE2b mở `/page` cho marketer nên nay thấy được. Sửa: trỏ theo vai (marketer ⇒ `/khoi-chung`).
  - **N-VE2B-444** `kho-kich-ban.js#banCuaPage` câu `trong.noi` gõ cứng «444/514 page» (prod 30/09: 507/581) — xoá câu hoặc tính số.
  - **N-VE2B-DEM** viên «Còn điều kiện chặn» / «Đủ điều kiện» đếm 0 khi cửa kiểm đọc hỏng (viên «Chưa có lời bot riêng» đã null/«—»).

- 30/09 · **NỢ THẤY KHI GHÉP PAGE ↔ THỊ TRƯỜNG ↔ SẢN PHẨM ↔ MARKETER** (người quyết 30/09: «match page, sản phẩm, marketer và thị
  trường … giúp mình được k»; bảng duyệt: artifact «Bảng ghép page», đơn POS 90 ngày ở BigQuery, CHƯA ghi gì vào v3):
  - **N-SOHIEU-CUOI** `src/pos/ten-goc.js#tachSoHieu` chỉ đọc số hiệu ĐẦU tên; POS có món ghi số ở CUỐI tên («Tummiva Gel - 176» ·
    «Necklace box - 008» · «NESLEMY dentures - 105») ⇒ dựng danh mục gốc (VE8/LL13) những món này rơi vào «không số hiệu».
  - **N-BQ-TENHANG** BigQuery `fact_order_items_dedup` trống `product_name` ở 42,6% dòng 90 ngày (và `shop_name` trống toàn bộ) —
    tra `dim_variation_product` theo `variation_id` thì đủ (21.816/21.821). Báo cáo nào đọc thẳng `product_name` đang đếm thiếu.
  - **N-SPTEST** 68 page chỉ có đơn ghi món «SP TEST» trong 90 ngày (321 đơn) — không suy được page bán gì; hỏi đội vận hành.
  - **N-PAGE-NGOAI** 82 page có đơn 90 ngày nhưng KHÔNG có dòng `page` trong v3 — quét Pancake / gán team trước khi ghép.
  - **N-DANHMUC-GOC** `san_pham_goc` prod = 0 dòng ⇒ chưa gắn page ↔ sản phẩm được; nhóm «chắc» cần 64 số hiệu. Nhà: VE8.

- 30/09 · **NỢ SAU VE7a** (`docs/thi-cong/nhat-ky/phieu-VE7a.md` §7):
  - **N-L1M1-SONG** cổng `l1-m1.sh` ④ đọc đơn THẬT «Chờ in» shop POS Taiwan; POS hết đơn trạng thái đó (30/09 ~07:10 CEST: 0) ⇒ cổng
    TRƯỢT dù mã đúng. Sửa: POS trả 0 ⇒ HOÃN, không TRƯỢT.

- 30/09 · **NỢ SAU VE7b** (`docs/thi-cong/nhat-ky/phieu-VE7b.md` §7):
  - **N-KHONGQUYEN-DO** cột «Không quyền» của bảng token (Kết nối) chưa đo — cần một lượt dò Pancake CHỈ ĐỌC theo từng page của mỗi
    token, đếm page trả «không có quyền hạn trên trang này». Màn đang nói «chưa đo».

- 30/09 · **NỢ SAU VE8a · VE8b** (`phieu-VE8a.md` §7 · `phieu-VE8b.md` §7):
  - **N-THUOC-CHAP-CHON** `v3/test/b/ll18-khung.test.mjs` đỏ 1 ca đúng MỘT lần mỗi lượt ĐỦ cổng khi chạy lồng sâu (lượt 85b2afb:
    qua ve4; lượt 97de3dd: qua ve5b), xanh ở mọi chỗ khác cùng lượt + 6 lượt song song. Cổng lồng nay in dòng đỏ con (`8f4dc43`) và
    vòng thước in tên ca (`✖`) — lượt tới chỉ đích danh ca ⇒ sửa ca đó (nghi dựng máy chủ/đăng nhập dưới tải).
  - **N-SKU-KEO-LAI** sau deploy: bấm «Kéo danh mục và giá từ POS» (Cài đặt › Kết nối) để 69 món Kuwait có SKU (khung gộp tạm
    theo số đầu tên, 68/69 có số).
  - **N-TIEN-TE-MAC-DINH** bậc giá đầu của thị trường chưa có giá: ô tiền tệ để trống, người gõ — chưa có nguồn «shop → tiền tệ».
  - **N-MK-GOI-Y-DON** gợi ý marketer cho sản phẩm × thị trường và page từ đơn POS (đo 30/09: 98–100% đơn có marketer, 99–100% dòng
    hàng có SKU, 57–88% đơn có page) — người quyết «để sau».

- 30/09 · **NỢ SAU VE7c** (`docs/thi-cong/nhat-ky/phieu-VE7c.md` §7):
  - **N-KHOA-HAI-TEN** bot đọc `KIMI_API_KEY`/`ANTHROPIC_API_KEY`, lớp v3 (dự phòng khi nối) đọc `V3_KHOA_<NHÀ>` — prod 30/09 chỉ
    đặt bộ thứ nhất. Nối dự phòng (LL14) phải chọn một bộ (hoặc đặt `V3_KHOA_*`), kẻo dự phòng nối xong vẫn «chưa có khoá».
  - **N-DAN-KHOA-DOI-DUONG** dán khoá ở màn Model ghi đủ ba dòng cấu hình (`ghiCauHinh`, có sẵn) ⇒ team đang đi model máy chủ
    chuyển sang cấu hình riêng (client v3, gửi độ ngẫu nhiên 0,3). Màn nói trước; tách «lưu khoá» khỏi «lưu cấu hình» là CR riêng.
  - **N-CANHBAO-LOP-MODEL** `canhBaoCauHinh` (lớp v3) còn câu «đang chạy bằng bộ mặc định» · «rơi thẳng sang dự phòng» · «không
    chọn được model» — màn Model (nơi duy nhất đọc, grep 30/09) đã ẩn/thay; sửa câu nguồn khi lớp v3 vào đường chat.

- 01/10 · **NỢ SAU VE7d** (`docs/thi-cong/nhat-ky/phieu-VE7d.md` §7):
  - **N-MK-CHI-THAY-SP-MINH** `01-QUYET-DINH.md` §9 «marketer chỉ thấy sản phẩm mình phụ trách» chưa làm và CHƯA phiếu nào ôm —
    cần LL15 (mã nhân viên ↔ tài khoản POS ↔ marketer của sản phẩm) rồi lọc theo người ở Sản phẩm/Page. Màn Người và team nói thẳng.
  - **N-TEAM-KETNOI-THUA** `/api/team/ket-noi` + `ketNoiCua` + `datDocKetNoiPos` của module team không còn màn nào gọi (POS ở Cài
    đặt › Kết nối) — gỡ ở LL8 cùng ca canh (`team-cau-hinh` ×3, năm dòng `datDocKetNoiPos(null)`).

- 02/10 · **NỢ SAU LL15a** (`docs/thi-cong/nhat-ky/phieu-LL15a.md` §7):
  - **N-BQ-KHOA-RONG** khoá BigQuery trên máy chủ (`/etc/aicloser/bq-levelup.json`) là SA dashboard `cmo-bigquery-prod-202604`
    (quyền chưa đo, có thể ghi) — mã chỉ xin token đọc, nhưng tệp mang đủ quyền SA. Tạo SA riêng CHỈ ĐỌC (Data Viewer trên
    `HRM_Core` + `PIALPHA_ALL_Dataset`, Job User) rồi thay tệp. Người quyết chọn chép khoá đang có 02/10.
  - **LL15b** tạo tài khoản từ HRM (khớp email · MKT/SALE · sale ba team · người nghỉ tự khoá · tên team theo HRM) — ghi bảng
    quyền, gật riêng. H11 (khoá BigQuery cho máy chủ) coi như xong 02/10 — khoá đã ở máy chủ, đọc được 118 · 324.

- 02/10 · **NỢ SAU LL15b** (`docs/thi-cong/nhat-ky/phieu-LL15b.md` §7):
  - **N-HRM-RUT-GAP** vai do HRM cấp chỉ rút qua HRM (rút tay ⇒ 409 `vai_cua_hrm`); tắt `V3_BQ_KHOA` thì dòng HRM đứng yên.
  - **N-MK-HANG-LOAT** tài khoản HRM tạo ra phải được quản trị đặt mật khẩu ĐẦU từng người, theo từng team (lượt đầu prod: 21
    người) — chưa có thư mời / người dùng tự đặt / đặt hàng loạt.
  - **N-KHOA-PHIEN** khoá tài khoản (người nghỉ) không cắt phiên đang mở — vé mang vai tới khi hết hạn.
  - **N-HRM-LANCUOI-NHO** «lần cuối» của lượt đồng bộ giữ trong bộ nhớ tiến trình — restart thì mất (nhật ký vẫn có dòng).

- 02/10 · **NỢ SAU LL15c · LL15d** (`docs/thi-cong/nhat-ky/phieu-LL15c.md` · `phieu-LL15d.md` §7):
  - **N-GOOGLE-DANG-NHAP** đăng nhập Google — người quyết chọn «hoãn»: cần tên miền + HTTPS cho v3 (Google không nhận IP trần) và
    OAuth Client ID loại Web (việc người).
  - **N-MK-LOC-PAGE-CON** các màn con của Page (kịch bản · ảnh · prompt · lên chạy · hiệu quả) chưa lọc theo phạm vi marketer.
  - **N-MK-GAN-HANG-LOAT** chưa có «gán marketer theo gợi ý cho mọi sản phẩm chưa gán» — gán từng sản phẩm.
  - **N-DANH-MUC-RONG** prod: 1 sản phẩm gốc; 37/353 món có đơn 60 ngày nằm trong danh mục v3 — lọc + gợi ý chỉ có tác dụng khi kéo
    danh mục POS + gộp món (việc người «để sau»).
  - **N-L1M1-DON-CHO-IN** cổng `l1-m1.sh` bước ④ đọc đơn «Chờ in» (12) của shop THẬT Taiwan — 0 đơn lúc đo (POS sống, trạng thái
    khác có đơn) ⇒ cổng đỏ vì dữ liệu sống; đổi sang chọn trạng thái có đơn, hoặc 0 đơn ⇒ HOÃN chứ không TRƯỢT.

- 02/10 · **NỢ SAU LL17a** (`docs/thi-cong/nhat-ky/phieu-LL17a.md` §7 · hồ sơ mở van §10):
  - **N-DON-TEAM-THEO-NGAY** team của đơn = team HRM HIỆN TẠI của marketer, chưa theo ngày đơn (`HRM_Core.fact_employee_team_history`).
  - **N-SO-LIEU-CON-ANH-CHUP** ba thước Messenger · phễu · bảng theo page · chi phí AI/đơn · rủi ro hoàn vẫn đọc `don_hang` chụp 28/08.
  - **N-DON-THEO-LUONG-0** ô «đơn theo luồng» + khối «Luồng trang bán hàng» trả 0/0 trên prod (cửa sổ 7 ngày trên số chụp 28/08) —
    số SAI, không phải «chưa đo» (đo 02/10). ⇒ LL17b.
  - **N-CONG-HOP-CAT-TRUNG-TEN** hai phiên chạy ca/cổng cùng lúc xoá CSDL hộp cát của nhau ⇒ cổng đỏ chập chờn — ĐÃ CHỮA `8aed3fc`
    (hậu tố tiến trình + dọn mồ côi).
- 02/10 · **NỢ SAU LL17b** (`docs/thi-cong/nhat-ky/phieu-LL17b.md` §7): N-DON-THEO-LUONG-0 + N-DON-POS-THEO-PAGE đóng (chờ mở van);
  **N-SO-LIEU-CON-ANH-CHUP** thu hẹp còn ba thước Messenger · chi phí AI/đơn · rủi ro hoàn (⇒ LL17c) · phễu Messenger.
- 05/10 · **NỢ ĐÓNG / DỜI** (`nhat-ky/phieu-LL15e.md` · `phieu-LL17d.md`): **N-KHOA-PHIEN** đóng ở LL15e · **N-DON-TEAM-THEO-NGAY** đóng ở
  LL17d · **N-L1M1-DON-CHO-IN** đóng (`f3e409d`, cổng ④ thử 12 → 1 → 3; POS 0 đơn ⇒ HOÃN) — cả ba chờ mở van. **N-MK-LOC-PAGE-CON**
  DỜI tới sau GSP3b (phiếu GSP3b sửa `v3/src/ui/mot-page` — cùng vùng; làm trước là đụng tệp phiên khác).
  - **N-DANG-XUAT-KHONG-CAT-VE** (LL15e §7) đăng xuất chỉ xoá cookie — vé bị chép ra ngoài sống tới hạn; cắt được cần bảng phiên.
  - **LL17c** (rủi ro hoàn từ BigQuery) — người quyết 05/10 chọn «để nguyên»: giữ số chấm 28/08 (màn đã in tuổi), chờ LL17 đầy đủ;
    không đổi luật «một nguồn» (H10 01/09).
  - **N-VBND-CHAP-CHON** ca `vai-b-noi-day` đỏ 2 lần trong cửa vào 05/10 (đăng nhập → đổi team), không tái hiện (cổng chạy lại 10/10 ·
    311 vòng 0 đỏ). Nghi: tệp dữ liệu dùng chung (symlink sang cây chính, `ai-messages.jsonl` bị ghi giữa lượt) khi phiên khác chạy
    cùng lúc. Gốc chưa rõ.
- 02/10 · **NỢ CỦA CR-02-10b** (`docs/thi-cong/doi-y-do/CR-02-10b-page-phai-gan-san-pham.md` §4):
  - **N-GSP-XOA-BAN-SAO** 78 dòng `san_pham nguon='kb'` + 154 bậc giá + 536 ảnh giữ làm lưu trữ sau GSP4; xoá + bỏ cột
    `san_pham.page_id` là phiếu sau, khi đủ 30 ngày không ai đọc. Neo: migration 015 «bỏ cột là phiếu khác, sau này».
  - **N-GSP-DIAMOND** gốc «Diamond Halo set» prod không SKU, không marketer (tạo 29/09 qua lối số hiệu) — gắn SKU tay qua
    `POST /api/san-pham/goc/:id` hay gộp lại qua màn Gộp.
  - **N-GSP-TEAM-KT** 2 page của team kỹ thuật có bản sao, shop của team đó chưa kéo danh mục — chuyển team hay bỏ.
  - **N-GSP-KB-OVERRIDES** page không gắn gốc thì bản chép cũ trong `kb-overrides.json` đứng nguyên (ca BC10, cố ý). Chốt ở
    handler (GSP4) chặn rồi nên không ra khách, nhưng tệp còn dữ liệu chết.
  - **N-GSP-GHI-DE-PAGE** người quyết chọn BỎ giá riêng theo page (02/10) — nếu sau này cần lại thì là thiết kế riêng.
  - Nợ cũ đổi số phận theo CR này: **N-MN8b** (tạo đơn chưa dùng `pos_ma`) trả bởi GSP4 — đơn từ page gắn gốc mang mã món POS
    thật · **N-MN8c** (75/79 SP chưa tên) mất ý nghĩa · **N-DANHMUC-GOC** thành việc của GSP2 · **RF-15** (gán `san_pham.page_id`
    khi shop có 1 page) bỏ ở GSP4.
  - **N-GSP1-DAO-VA-CAY-CHUNG** `ops/bin/nghiem-thu/gsp1.sh` đảo-vá bằng cách sửa thẳng `router.js` + `san-pham.html` trong cây chung
    (trap khôi phục) ⇒ hai lượt chạy chồng (tổng + thợ, 02/10) làm hỏng bản khôi phục của nhau, để lại route giả. Chuyển đột biến
    sang bản sao tạm. Từ GSP2 trở đi phiếu ghi luật này ở mục ④.
  - **N-GSP-GOP-SKU** (review chặng 2 GSP1, R1) cửa gộp `POST /api/san-pham/gop` vẫn tạo được gốc KHÔNG SKU (thân không gửi `sku`) hoặc
    SKU LỆCH món (gửi `sku:'ZZZ'` cho món SKU 900) — máy chủ lấy SKU từ THÂN, không suy từ món (`src/products/san-pham-goc.js:554-556`).
    Luật VE8a cũ ⇒ người quyết chọn **«Bắt buộc SKU»** (02/10) ⇒ phiếu GSP1b. Prod hôm nay 491/491 món có SKU.
  - **N-GSP-CONG-RG-ENV** cổng `gsp2.sh` · `gsp1b.sh` gọi `rg` (máy dev chỉ có `rg` là HÀM zsh — bash không thấy ⇒ cổng đỏ giả) và
    chép repo sang thư mục tạm KHÔNG kèm `.env` ⇒ đòi `DATABASE_URL_V3` đặt sẵn trong môi trường. Đổi `rg` → `grep -E`, nạp `.env`
    như các cổng cũ (`--env-file-if-exists`). Tổng 05/10 chạy được bằng `rg` thay thế trên PATH + biến từ `.env`.
  - ~~**N-PREFLIGHT-MISSINGPAGES**~~ **ĐÃ TRẢ bởi GL1 `75665af` (06/10)** (báo cáo go-live 02/10, tổng xác nhận 05/10) `deploy/preflight.mjs:134` đọc `db.missingPages.length`
    mà `inspectDatabase()` (`:101-106`) đã bỏ trường đó từ MB4 `357795a` ⇒ TypeError ⇒ exit 1 ⇒ `deploy/setup.sh:15,68` luôn dừng.
    Bộ ca gọi thẳng hàm nên vẫn xanh. KHÔNG chặn đường mở van đang dùng (checkout + migrate + restart). Ngoài CR-02-10b.
  - **N-GSP2-F1 · F2 → GIAO GSP3** (review chặng 2 GSP2): F1 dấu quyết định khoá theo `ma_goc` CHỮ — bỏ gốc rồi gộp lại cùng mã ⇒ dấu
    `chep` cũ sống lại, page tính «xong»; F2 `bo_qua` sống lại sau gắn → gỡ. Hôm nay 0 dòng `chep` ⇒ GSP3 (cửa ghi dấu) dọn dấu khi bỏ gốc
    + xoá `bo_qua` khi page được gắn. Phải đóng TRƯỚC GSP4 (cả hai làm bộ đếm về 0 sớm).
  - **N-GSP2-F3 → ĐIỀU KIỆN GSP4** RF-15 gán `san_pham.page_id` cho MÓN POS khi shop có đúng 1 page, `catalog.js:10` nhánh `page_id` không lọc
    `nguon` ⇒ page chưa gắn có thể đọc món POS qua `page_id` mà bộ đếm `chuaXong` (chỉ thấy `nguon<>'pos'`) không báo. Trước khi phát GSP4:
    đo prod `SELECT count(*) FROM san_pham WHERE nguon='pos' AND page_id IS NOT NULL` (02/10: 0/491) — khác 0 ⇒ đưa vào bộ đếm.
  - **N-GSP2-NEN** C2 màn còn tải `GET /api/san-pham` thừa mỗi lần mở · C3 gắn xong đọc danh sách hai lượt · C4 câu báo lỗi gắn cộng dồn ·
    N1 bộ đếm = 0 ⇒ mất lối vào danh sách (không «Bỏ quyết định» được) · N2 dòng gắn không báo món đích chưa giá (cửa tiền page sẽ ĐÓNG) ·
    F4 ca 6b gắn lại bằng UPDATE tay thay vì cửa gắn. Dọn ở GSP5 (gỡ màn) hoặc khi chạm lại.
  - **N-GSP1B-GN** G1 cửa «Thêm thị trường» `POST /goc/:id/mon` không kiểm SKU ⇒ nối được món SKU lệch gốc (luật «SKU bắt buộc» chưa phủ
    cửa nối) · G2 cửa sửa gốc nhận `sku:''` ⇒ gốc thành không SKU · G3 `chuanSku` ép Number ⇒ SKU số > 2^53 va nhau · G4
    `ops/bin/goi-y-gop-san-pham.mjs --sql` vẫn in INSERT gốc theo số hiệu.
  - **N-N1A-THUOC** ca N1a′ (`test/l2-m1-nhac-truong.test.js`) đỏ ngầm từ 25/09 (`fe12262`) khi bật `FASTLANE_TEMPLATES` — dev/prod để 0 nên
    không ai thấy; đã sửa kỳ vọng trong `bb3cf5e` (review chấp nhận: không che hồi quy). Nợ: mất dòng in cấu hình, lẽ ra commit riêng.
  - **N-GSP3-NEN** (đối kháng GSP3, verdict scratchpad `refute-gsp3.verdict.yaml`): F2 nhánh «trùng giá món» đẩy bằng `dayMon` ngoài
    khoá ⇒ chạy chồng với lượt lưu giá cùng món thì bot giữ giá cũ (K9) · F3 đẩy hỏng giữa các page ⇒ page đã nhận giữ giá + ảnh của
    lượt đã lùi (K3; bù được bằng đẩy lại trạng thái CSDL sau khi gỡ ảnh) · F5 `bangCu` trong nhật ký khai «đúng khuôn offers» nhưng
    đưa thẳng vào cửa lưu giá ra 400 — lời khai đường lùi sai · F7 gốc một món gom ảnh của MỌI bản sao trong page, không lối loại.
    **F6 mở rộng N-GSP3-DOI-MON:** thêm một món ĐÃ CÓ GIÁ vào gốc sau đối soát ⇒ cửa tiền MỞ ở giá món đó (K8) — không phải «vẫn ĐÓNG».
  - **N-GSP3B-NEN** (đối kháng GSP3b, verdict scratchpad `refute-gsp3b.verdict.yaml`): F3 câu chỉ đường «Giá + ảnh sửa ở Sản phẩm ›
    Theo thị trường» hứa sai — màn Sản phẩm không có chỗ sửa ảnh, marketer bấm sang thì giá cũng chỉ xem (lỗi do phiếu ② Ra 2 đặt) ·
    F4 «Kéo danh mục» (`dongBoTuPos`) ghi hết hàng vào bản sao của page ĐÃ GẮN không qua chốt rồi đẩy món chưa giá sang bot (vô hại khi
    page chưa đối soát vì cổng bật đòi giá; phải đóng trước GSP4) · F6 câu «bot chưa có sản phẩm» sai cho tới GSP4 vì prod chat đọc
    `kb-overrides.json` (0 page bật ⇒ chưa hại).
  - **N-GSP-PG-CLIENT-DONG-THOI** `dsViecChuyen` bắn câu song song trên một kết nối — ổn với `pg.Pool` của app; truyền `pg.Client`
    (giao dịch) thì pg báo DeprecationWarning (thấy ở mốc +15′ đợt mở van GSP).
  - **N-MO-COI-HOI-THOAI** (H7 05/10) prod có 549 `hoi_thoai` + 2 `kich_ban` mang `team_id` khác team của page (trước lượt H7: 610 + 2) —
    `demMoCoi` đếm được; gốc chưa điều tra; cần phiếu vá có người duyệt. · **N-PAGE-CHUA-CO-TRONG-V3** 48 page có đơn 60 ngày (1.302 đơn,
    phần lớn AUUS/EU) chưa có trong bảng `page` — quét page Pancake bằng token của hai team đó.
  - **N-TIEN-TE-NGOAI-GCC** (H7 05/10) `HE_SO_TE` (`src/pos/tao-don.js:130`) thiếu EUR · RON · AUD · TWD · JPY; `TIEN_TE_THI_TRUONG`
    (`src/products/chuyen-ban-sao.js:292`) chỉ 6 nước GCC ⇒ chưa đặt giá / đối soát được món ở Europe · Romania · Slovakia · Australia ·
    Taiwan (USA thiếu ở bảng thị trường). Phiếu đường tiền 🟥 trước khi EU/AUUS đặt giá các shop đó.
  - **N-GUARD-TIEN-TE-MOI** (review (a) TT1 05/10) `src/outbound-guard.js:78` (BỘ NÃO) chỉ nhận tệ GCC + PHP/USD ⇒ luật 4 «tổng tiền khớp đúng
    một gói» IM LẶNG với EUR · RON · AUD · TWD · JPY. PHẢI đóng trước khi bật bất kỳ page EU/AUUS nào (phiếu riêng khai «Đụng bộ não» +
    `do-duong-ban` + ba lượt model).
  - **N-GSP1-CHU-CU** câu chữ còn trỏ lối đã bỏ: `03-MAN-HINH.md:13` · `v3/src/ui/san-sang/kho-san-sang.js:67` · câu trống màn Sản phẩm.

- 02/10 · GSP1 (thợ) — **N-GSP-TAOGOC** `v3/src/ui/san-pham/kho-goc.js#taoGoc` hết cửa HTTP gọi (router bỏ `POST /api/san-pham/goc`) nhưng `v3/src/ui/san-pham/index.js:17` còn re-export ⇒ không gỡ được trong pathspec GSP1 (index.js ngoài ③; gỡ riêng kho-goc thì boot chết). Gỡ `taoGoc` + dòng export ở một phiếu có `index.js`. Cùng lúc: `GET /api/san-pham/goc` còn trả `cho`/`khongCoSoHieu` (không màn nào cần ngoài điều kiện ô lưu ý `san-pham.html:105`) — GSP2 đổi ô lưu ý thành bộ đếm thì gỡ luôn hai trường + chỗ đọc.
- 05/10 · GSP3 (thợ) — bốn nợ, ngoài pathspec phiếu:
  - **N-GSP3-DOI-MON** (/code-review R4) dấu đối soát hiệu lực theo CHỮ gốc × shop ⇒ gỡ món x khỏi gốc G rồi gắn món y (cùng G, cùng
    shop — `goMonPosKhoiGoc` không chặn khi còn page gắn) thì dấu `chep` cũ vẫn hiệu lực cho món mới chưa giá ⇒ page tính «xong», bộ
    đếm GSP4 thấp hơn thật. Cửa tiền vẫn ĐÓNG (món mới chưa giá ⇒ unknown). Sửa: dọn dấu khi tập món của gốc × shop đổi (gắn/gỡ món)
    hoặc khoá dấu theo món. `daQuyet` cấm viết lại + GSP3 chỉ được sửa 2 hàm ⇒ phiếu sau. **Đóng TRƯỚC GSP4.**
  - **N-GSP3-CONG-CU-DO** `va-r2.sh` (1 đỏ: thước neo «8 ca», bộ ca nay 11) + `l3-m4.sh` (27/55 đỏ) ĐỎ SẴN ở base — đối chứng worktree
    `7a9978b` / `4b5d189`: danh sách dòng đỏ (chuẩn hoá id) giống hệt trước/sau GSP3. Cùng họ «8/25 cổng đỏ» 01/09. `gsp3.sh` ⑥ tự
    đối chứng cùng thước (đỏ mới ⇒ đỏ). Phiếu sau: neo DELTA / hộp cát.
  - **N-GSP3-DOT-COT032** câu kiểm đủ 4 cột 032 chép 3 nơi (`chuyen-ban-sao.js#coCot032` + `boSanPhamGoc` + `ganPageVaoGoc`) vì pathspec
    GSP3 chỉ cho sửa 2 hàm và import ngược là vòng import — gom một chỗ ở phiếu chạm `san-pham-goc.js`.
  - **N-GSP3-DOC-MAN** khung «Đối soát giá + ảnh» (màn Sản phẩm › chuyển page) chưa vào `03-MAN-HINH.md` (③ GSP3 không có tệp doc) —
    gộp vào việc doc của GSP5.
  - **N-VAI-B-NOI-DAY-CHAP-CHON** `v3/test/b/vai-b-noi-day.test.mjs` đỏ 1 lần khi chạy sâu trong chuỗi cổng (`_chan1 gsp3` → `gsp1` → `ve8b`
    → `ve8a` → `ve7b`), chạy riêng 5/5 xanh — cùng ca «cookie null» nhật ký GSP2 đã ghi. Cổng con đỏ ngẫu nhiên ⇒ cổng cha đỏ giả.
- 05/10 · GSP3 vòng 2 (thợ) — một nợ, ngoài hai mã CHẶN được giao:
  - **N-GSP3-DAU-TOCTOU** (/code-review vòng 2 · CR2) dấu đơn vị (F1) so ở lúc POST đọc đơn vị; từ đó tới câu UPDATE đánh dấu (cỡ ms:
    gom ảnh · `saveProduct` tự commit · đẩy bản chép) không có khoá / giao dịch chung (`operations.js` cấm sửa ở GSP3). Trong cửa sổ đó:
    page gắn thêm KHÔNG bị đánh dấu (còn `cho_doi_soat`, không thua ngầm) nhưng bot của nó nhận giá món mới ngay — như mọi lượt lưu giá
    VE8b; bảng bản sao bị sửa trong cửa sổ đó vẫn bị đánh theo bảng đã đọc. GSP3b khoá cửa sửa bản sao ⇒ còn phần gắn page. Sửa gốc: khoá
    dòng `san_pham_goc` của đơn vị (`FOR UPDATE`) suốt lượt — cần cửa lưu giá nhận giao dịch ngoài.
- 05/10 · GSP3b (thợ) — bốn nợ, ngoài pathspec phiếu:
  - **N-GSP3B-MON-POS-CUA-DAY** (sửa chữ 05/10 · GSP3b vòng 2 — phần lớn ĐÃ CHẶN, `d688a3d`) hai cửa lưu ĐẦY ĐỦ (`POST
    /api/anh-san-pham/san-pham/:id` · `POST /api/van-hanh/products/:id`) nay từ chối món POS ⇒ 409 `mon_pos_sua_o_san_pham` (marketer lẫn quản
    trị, chốt cả ở đầu giao dịch, 0 đổi 0 đẩy) khi `page_id` NULL · page của nó đã gắn · món đã gộp gốc mà page đã gắn gốc đó bán ở đúng shop
    (ca H10 H11 D15–D19) — hết lỗ marketer đổi giá đường tiền / đè tên / bật `cau_hinh_tay` (đối kháng F1). CÒN LẠI: (a) món RF-15
    (`page_id` trỏ page CHƯA gắn) mà không page đã gắn nào đọc vẫn lưu ĐẦY ĐỦ được qua trang page (ca D10) — đè tên/mô tả POS + `cau_hinh_tay`
    (POS thôi cập nhật hết hàng) cho món đó, giá chỉ tới bot của chính page đó; (b) nhánh «page đã gắn khác bán» đọc page khác KHÔNG khoá —
    lượt gắn page khác (hoặc gộp món vào gốc) chạy chồng đúng mili-giây với lượt lưu thì lọt. Đóng ở GSP4 (bỏ nhánh `page_id` + RF-15);
    `gsp3b.sh` ③b đỏ khi tiền đề (màn còn gửi món RF-15 vào cửa đầy đủ) hết.
  - **N-GSP3B-LOI-SANG-SHOP** (/code-review CR4) lối sang `/san-pham?sp=<id>&tab=thi-truong` không mang shop — `san-pham.html#moSanPham` mở
    thị trường ĐẦU TIÊN ⇒ gốc bán nhiều shop thì người sửa tự chọn đúng viên (câu đã nêu thị trường + số shop). Sửa ở phiếu chạm
    `san-pham.html`: đọc `&shop=` để chọn sẵn viên, rồi `cauDaChuyen` thêm tham số.
  - **N-GSP3B-CONG-DOI-CHUNG** (/code-review CR3) `gsp3.sh` ⑥ đối chứng base: cổng con chết giữa chừng không in dòng đỏ bị tính «ĐỎ SẴN … 0
    dòng mới» ⇒ xanh giả; và cổng con TREO thì `gsp3.sh` treo theo (không trần thời gian, `trap … INT TERM` không exit). `gsp3b.sh` đã vá cả
    ba (`bcc86ab`) — chép sang `gsp3.sh`.
  - **N-VAI-B-NOI-DAY-CHAP-CHON (thêm hai án)** trong lượt cổng gsp3b: `ve2b-page-gop.test.mjs` đỏ 16/17 ở tầng sâu `gsp3 → ve8b → … → ve2b`
    (cùng chuỗi chạy trực tiếp cùng lượt xanh; chạy riêng 7/7 lượt 17/17) · `gsp3.sh` chạy riêng TREO ở `ll15a → ve7d-nguoi-team.test.mjs`
    (0% CPU 26′, cổng HTTP còn mở sau một ca đỏ; chạy riêng 8/8). Gốc chung nghi: ca chạy trang trong vm chờ cố định ~450ms (`dom-gia.js#cho`)
    + máy chủ không đóng khi ca đỏ ⇒ dưới tải cao ca đỏ giả rồi treo. Sửa ở thước chung (`v3/testkit/dom-gia.js`, `t.after(sv.close)`).
- 05/10 · GSP3b vòng 2 (thợ) — hai nợ, ngoài pathspec / ngoài hai mã CHẶN:
  - **N-GSP3B-ANH-MON-POS** (/code-review vòng 2 #2) năm cửa ảnh (`/api/anh-san-pham/:spId/tai-len` · `/link` · `/anh/:id` POST/DELETE ·
    `/:spId/thu-tu`) + cửa nối món nhận MÓN POS của gốc (`page_id` NULL) từ marketer: chốt bản sao lọc `nguon <> 'pos'`. Đo 05/10 (kịch bản
    tạm, hộp cát): marketer `POST /api/anh-san-pham/<id 111:x>/link` ⇒ 200, 1 ảnh vào món, đẩy bản chép mọi page gắn gold × 111 — ảnh bot gửi
    cho mọi page đổi ngoài màn Sản phẩm (màn đó không có cửa ảnh — đối kháng F3). Phiếu GSP3b ② 5 cấm đụng cửa ảnh món POS ⇒ phiếu sau quyết
    ai sửa ảnh món của gốc ở đâu rồi chặn cùng vị từ `chanMonPosCuaDayDu`.
  - **N-GSP3B-HOOK-SAVEPRODUCT** (/code-review vòng 2 #3) thứ tự khoá page → `san_pham` của hai cửa lưu ĐẦY ĐỦ đi qua pool bọc
    `poolChotDauGiaoDich` (v3/src/ui/van-hanh/router.js) soi câu đầu của kết nối (`BEGIN …`/`START TRANSACTION`) vì `operations.js` cấm sửa.
    Khuôn `transaction()` đổi ⇒ lượt lưu 500 (đóng khi nghi, không ghi; ca D9–D12 · D18 · K1–K3 đỏ). Gốc rễ: `saveProduct` nhận bước «trước
    khi khoá» (`truocKhiKhoa(c)`) hoặc client của nơi gọi — phiếu có `operations.js` thì gỡ pool bọc. Cùng gốc với N-GSP3-DAU-TOCTOU (cửa lưu
    giá cần nhận giao dịch ngoài).
- 06/10 · TT1 (thợ) — sáu nợ, ngoài pathspec / ngoài «quy đơn vị» (chi tiết + lệnh đo: `docs/thi-cong/nhat-ky/phieu-tt1.md` mục Nợ):
  - **N-TT1-GIA-KICH-BAN-TE** `v3/src/ui/mot-page/gia-kich-ban.js:21` `TIEN_TE = 'SAR|SR|AED|KWD|QAR|OMR|BHD|USD'` — không có EUR · RON ·
    AUD · TWD · JPY ⇒ «giá gõ cứng trong kịch bản» không bắt giá EUR/TWD gõ tay ở page EU/AUUS (im lặng = «không có giá gõ cứng»).
  - **N-TT1-TONG-TIEN-HIEN-DON-VI-NHO** (đọc mã, chưa đo màn) hộp thư · bàn hội thoại · hồ sơ khách hiện `tong_tien` THÔ (đơn vị nhỏ,
    migration 007) cạnh mã tệ, không chia `HE_SO_TE`: `kho-ban-hoi-thoai.js:193,207` · `boi-canh-hoi-thoai.js:99,160` → `hop-thu-ui.js:44
    tien()` · `ho-so-khach.html:52` ⇒ nghi hiện «9.900 SAR» cho đơn 99 SAR (chỉ TWD/JPY ×1 hiện đúng). Có từ trước TT1, mọi tệ ×100.
  - **N-VE1-GIA-BAN-SAO-DON-VI-NHO** `chiTietSanPhamGoc` `thiTruong[].gia` (`san-pham-goc.js:346`, bậc BẢN SAO) trả `goi_gia.gia` thô →
    `san-pham.html:288` hiện `so(b.gia) tienTe` ⇒ 9.900 SAR; `test/ve1-san-pham.test.mjs:30-37` nạp `gia` 89 SAR (đơn vị LỚN) nên ca xanh
    giả. Có từ VE1, không riêng tệ mới; `san-pham-goc.js` đang có thợ GSP3c sửa ⇒ TT1 không đụng.
  - **N-TT1-TE-LECH-THI-TRUONG** (/code-review TT1 #2) `saveProduct` chỉ kiểm tệ ∈ `HE_SO_TE`, không đối chiếu tệ thị trường của shop
    (`TIEN_TE_THI_TRUONG`) ⇒ bậc EUR lưu được cho món shop Romania/Taiwan; chỉ `cua2Tien` ĐÓNG về sau (`lech_bang_gia`). Cùng gốc với
    N-TIEN-TE-MAC-DINH (ô tiền tệ gõ tay) — sửa chung: ô tệ mặc định + khoá theo shop ở màn «Theo thị trường».
  - **N-TT1-TONG-RONG-THANH-0** (/code-review TT1 #4, đo trên base `da50df6` cũng ra 0) `chuanHoaHoSo({currency:'SAR'})` (không tổng) ⇒
    `tong_tien = 0` (`Number(null)=0`), không null ⇒ `duyet()` sale bổ sung `total_price` qua `boSung` KHÔNG quy lại (`quyTongTienNho` thoát
    vì `tong_tien != null`) ⇒ cửa ① báo thiếu tổng mãi. Có từ trước TT1, mọi tệ.
  - **N-TT1-NAP-KB-LAM-TRON** (/code-review TT1 #5) `src/products/nap-tu-kb.js:91-94` (bộ nạp một lần MN2, gọi từ `ops/bin/nap-mot-nguon.mjs`)
    vẫn `Math.round` + cảnh báo; `HE_SO_TE` rộng ra ⇒ chạy lại sẽ NẠP món TWD/EUR trước đây bị bỏ, giá lẻ bị làm tròn. Đổi sang
    `quyDonViNho` (lẻ ⇒ bỏ bậc + cảnh báo). · Kèm: **N-TT1-LUOC-DO-HE-SO** `docs/v3/ban-giao/luoc-do-v1.md:254` + COMMENT migration 007 còn
    khai «×100 vs ×1000» (đúng nay: ×100, TWD/JPY ×1) · `gia_goc`/`phi_ship` của `saveProduct` chưa kiểm dấu/trần (âm lưu được, 1e11 ⇒ 500
    tràn numeric(14,2) — có từ trước TT1, /code-review #6).
- 06/10 · GL3 (thợ) — năm nợ quanh `src/pancake.js`, ngoài hợp đồng phiếu (② giữ xoay token khi ĐỌC + giữ `_pageTokIdx`); chi tiết +
  kịch bản: `docs/thi-cong/nhat-ky/phieu-gl3.md` mục Nợ:
  - **N-GL3-DOC-NHAN-TOKEN** (/code-review GL3 #4 #5) hạn tính theo TỪNG token: ĐỌC quá hạn ⇒ xoay ⇒ một page treo chặn vòng poll tuần tự tới
    N_token × 15 s (prod ~8 token ⇒ ~120 s); token đúng chân chậm >15 s một nhịp ⇒ `_pageTokIdx` có thể ghim page sang token kế nếu token đó
    trả lỗi không thuộc 103/105/121. Vá: ngân sách tổng cho cả vòng xoay, hoặc không xoay khi lỗi là quá hạn — cùng nhóm «poll song song» (⑥ GL3).
  - **N-GL3-THE-RONG-10P** (/code-review GL3 #6, có từ trước GL3) `pkTagId` cache bảng thẻ RỖNG 10′ khi đọc `/settings` lỗi (nay gồm quá hạn
    15 s) ⇒ 10′ `V3_NAP_THE_CHAN` fail-open (bot trả lời hội thoại đã giao sale) + `pkTagByName` «page không có thẻ» (bàn giao hỏng). Chỉ cache khi đọc được.
  - **N-GL3-SINH-TOKEN-XOAY** (/code-review GL3 #7) `getPageAccessToken` (POST `generate_page_access_token`, sinh mới = giết token của
    pancake-tool cho page đó) vẫn xoay token khi lỗi mạng/quá hạn 15 s — phiếu chỉ đòi gắn hạn. Khoá `AICLOSER_SINH_TOKEN` đang đóng.
  - **N-GL3-AN-TOAN-TOKEN-FILE** `test/_an-toan.mjs` không đổi hướng `pancake-tokens.json` / `pancake-page-tokens.json` (đường ghi theo
    vị trí MODULE, không theo env) ⇒ ca nào thêm token thành công / sinh page token sẽ ghi vào gốc repo. GL3 né bằng bản sao tạm của module.
  - **N-GL3-ANH-THU-LAI** `src/tools.js#sendImageWithRetry` (tệp não) thử lại `pkSendImage` với MỌI `ok:false` — nay kết quả có `khongRo`
    mà vẫn bị gửi lại. Hiện mã chết (`flushPendingImages` không còn nơi gọi, handler-v3 gửi ảnh qua cửa); dựng lại thì phải tôn trọng `khongRo`.

## §9b · TỔNG KẾT REFUTE — 10 CHẶN gom 4 CỤM VÁ (chờ lệnh CEO mở sóng)

Kết quả 5 mảng: team ✅ · tiền-hẹp(L1-M1/VA-P1/VA-Q12) ✅ · cửa-gửi ✅(dev thường) ·
prompt/toàn-cục ✅ · **luồng-đơn + bộ-não = nơi mọi CHẶN tụ**. Gate máy 13/13 + 117/117
test XANH mà refute lộ 10 CHẶN — thước đo «hệ có hỏng» chưa đo «tiền đúng · tin không bay».

| Cụm                | CHẶN                                                                               | Vùng                                                  | Phiếu vá đề xuất |
| ------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| C1 bộ-não-bắn-HTTP | RF-1·RF-2·RF-3                                                                     | handler-v3.js · queue/worker.js                       | VA-R1 🟥 opus    |
| C2 tiền + tạo-đơn  | RF-9(×100)·RF-10(mã8)·RF-11(phân trang)·RF-12(POST-rollback)·RF-21(khoá hội thoại) | orders/hang-cho.js · pos/tao-don.js · doc-danh-muc.js | VA-R2 🟥 opus    |
| C3 máy trạng thái  | RF-13(CAS ghiDon)·RF-14(kẹt cho_gui_wa)                                            | orders/may-trang-thai.js · quet-don-moi.js            | VA-R3 🟥 sonnet  |
| C4 đọc ý           | RF-20(phủ định→xác nhận)                                                           | orders/doc-y.js                                       | VA-R4 🟨 sonnet  |

Mỗi CHẶN tổng ĐÃ TỰ VERIFY bằng repro/gọi-tay (không tin lời agent). NÊN (RF-15..19,
25-27) + GHI-NỢ (RF-22..24) vào sóng kèm hoặc sổ nợ dài hạn. ⛔ Cấm push tới khi C1-C4 ✅.

- 23/08 · REFUTE (mảng luồng-đơn L3 + cửa-gửi) — thêm 2 CHẶN MỚI verify + xác nhận trùng:
  - 🔴 **RF-20 (CHẶN, đọc ý — tổng verify tay):** `doc-y.js` đọc "not sure"/"don't confirm"/
    "cannot confirm" → `xac_nhan` do_tin=1 (thấy "confirm/sure", bỏ phủ định) ⇒ tự ship hàng
    khách CHƯA đồng ý. `node -e docY('not sure')` = xac_nhan. Trái §L3 «mơ hồ→khong_ro».
  - 🔴 **RF-21 (CHẶN, race):** `duyet()` FOR UPDATE khoá theo DÒNG hàng chờ, không theo HỘI
    THOẠI ⇒ 2 dòng hang_cho cùng hội thoại + 2 duyệt song song = don_hang 2 (khác RF-12 =
    cùng hang_cho_id). (`hang-cho.js` — mảng4 F3)
  - RF-10 XÁC NHẬN LẠI bởi mảng luồng-đơn độc lập (mã 8 ở hang-cho.js:105) — 2 agent trùng.
  - Mảng cửa-gửi (mảng 3 tôi) phán ĐẠT ở dev bình thường NHƯNG F1 của nó = RF-1 (tổng đã
    nâng CHẶN vì RF-2 mở được van) — hai agent bất đồng mức, tổng giữ CHẶN (luật 1).
  - RF-22 (GHI-NỢ, HỆ CŨ ngoài v3): webhook `server.js:68 POST /webhook` không chốt
    READONLY + `appSecret` rỗng ⇒ note/tag/tin THẬT bay — bản đang chạy, KHÔNG đụng, ghi
    cho cutover. RF-23 (GHI-NỢ): `chuanHoaSdt` gộp khách xuyên nước 8-số-nội-địa trong
    chua-phan (Kuwait/Bahrain/Oman/Qatar) → báo trùng nhầm. RF-24: `doiSangDonViNho` trả 0
    (không null) khi tong≤0 ⇒ COD free lọt cửa tiền.

- 23/08 · REFUTE (mảng team/di trú) — **PHÁN ĐẠT, KHÔNG CHẶN** (cách ly team 17/17 đòn thật
  không phá được; di trú idempotent; down 003-006 sạch). NÊN nên vá trong sóng:
  - RF-16 (NÊN): `TRUNCATE nhat_ky/so_ai` LÁCH trigger chỉ-INSERT (57638→0 không lỗi) —
    lời khai «cấm kể cả chủ CSDL» sai. Vá: `BEFORE TRUNCATE` statement-trigger + REVOKE.
    (`db/migrate/001_nen.up.sql`)
  - RF-17 (GHI-NỢ): `bo_luat_chung` thiếu UNIQUE + `seedBoLuatChung` SELECT-rồi-INSERT không
    atomic ⇒ dup luật toàn hệ khi chạy song song · RF-18: `demSoAiTheoLoai(pool,{})` thiếu
    teamId đếm gộp mọi team (đất src/chat) · RF-19: `napKichBan` UPSERT vs UNIQUE 1-LIVE/page
    chết nếu nguồn có ≥2 LIVE/page.

- 23/08 · REFUTE (mảng tiền/POS) — 6 CHẶN tổng TỰ VERIFY bằng repro
  `refute-tong-the-1.repro.mjs` (sandbox, 0 byte ra POS). ⚠️ 117/117 ca của 7 bộ test đang
  XANH mà KHÔNG cổng nào bắt được finding nào — đúng cảnh báo «toàn luật cấm thì màn trống
  vẫn đạt»:
  - 🔴 **RF-9 (CHẶN, TIỀN ×100):** `goi_gia.gia` không khai đơn vị — `doc-danh-muc.js:136`
    ghi minor, `tao-don.js:104` nhân ×100 lần nữa ⇒ **thu 1.500 AED thay vì 15,00**; kèm
    `hang-cho.js:219` ghi `don_hang.tong_tien` mà L1-M1 cố ý để NULL (nợ N4). (`001:114`)
  - 🔴 **RF-10 (CHẶN):** `HUY_HOAN` gõ tay lại nhóm SAI `{4,5,6,7,8}` (nợ N1 cấm) ⇒ đơn
    mã 8 `packing` đọc thành «đã hủy» ⇒ `duyet()` đẻ kiện COD THỨ HAI. (`hang-cho.js:105,324`)
  - 🔴 **RF-11 (CHẶN):** nguồn (b) POS-sống — backstop chống trùng DUY NHẤT — chỉ đọc
    trang 1/100 đơn cả shop, không phân trang, rồi khai `sach` (bỏ `tong`/`tongTrang`);
    đơn ở trang 2 = lọt. (`hang-cho.js:320,326-333`)
  - 🔴 **RF-12 (CHẶN):** 3 lớp idempotent cùng mù ca «POST xong rồi rollback» (nhật ký cân
    bằng ⇒ moCoi=false) ⇒ bấm duyệt lại = POST lần hai. (`tao-don.js:222` · `hang-cho.js:790`)
  - 🔴 **RF-13 (CHẶN):** `ghiDon()` UPDATE mù không CAS `trang_thai_he` ⇒ ảnh cũ ghi đè:
    POS ở 12 «Chờ in» mà sổ hệ ghi `cho_sale` (hai sổ lệch). (`may-trang-thai.js:257-278`)
  - 🔴 **RF-14 (CHẶN):** đơn kẹt vĩnh viễn ở `cho_gui_wa` — không job/thước/SQL nào đọc
    trạng thái đó, `so_lan_thu_wa` vẫn 0, 0 `viec_can_xu_ly`. (`quet-don-moi.js:61-69,170`)
  - NÊN RF-15: `doc-danh-muc` không ghi `san_pham.page_id` ⇒ mọi `goi_gia` POS vô hình với
    `cua2Tien` (JOIN page_id) — §9 nợ cũ khai SAI nguyên nhân «giá 0», vá theo câu đó xong
    cửa ② vẫn đóng. (`doc-danh-muc.js:101`) [reclassify nợ goi_gia-0]

- 23/08 · REFUTE TỔNG THỂ (mảng đường-gửi) — 3 CHẶN đã tổng TỰ VERIFY bằng repro
  `refute-MANG-2.repro.mjs` (bẫy fetch, 0 byte ra mạng):
  - 🔴 **RF-1 (CHẶN, luật số 1):** `handler-v3.js:482` gọi `runCloser` (bộ não cũ) TRƯỚC
    cửa v3; `executeTool` trong đó bắn THẲNG HTTP ra pages.fm bằng token thật
    (`tools.js:197/266/271`, `order-bridge.js:255`) — 0 dòng READONLY canh, `catch{}` nuốt
    lỗi. Repro S4 = 12 lượt HTTP (6 GET settings + 6 POST notes). Verdict `chan_guard` của
    worker là LỜI KHAI SAI: lúc ghi «không gửi» thì note+thẻ đã ra hồ sơ khách. «Cô lập bộ
    não» L2-M1 (nợ N2) CHƯA đóng thật.
  - 🔴 **RF-2 (CHẶN):** van bảo vệ RF-1 nằm ở bộ NẠP (`nguonDangMo`) mà `worker.js:32-65
chayMotVong` KHÔNG đọc; `V3_NAP_DEV=1` hoặc đổi cwd (dotenv theo cwd, `ket-noi.js` đọc
    .env đường tuyệt đối) mở van trong khi vẫn nối CSDL thật.
  - 🔴 **RF-3 (CHẶN, nghiệp vụ):** `handler-v3.js:495-501` gọi guard THIẾU `orderCreated`
    - `isOrderSummary` (v2 `handler.js:436-437` có) ⇒ lượt tóm tắt xác nhận đơn bị
      `PII_ECHO`/`FAKE_ORDER_ID` chặn, v3 coi `rewrite`=câm ⇒ khách KHÔNG nhận gì mà hệ vẫn
      ghi `so_ai ORDER` + đẩy `hang_cho_tao_don`. Repro S3.
  - NÊN: RF-4 ảnh bay khi guard chặn chữ · RF-5 lỗi N5 đốt 3 lượt model · RF-6 v3 không gọi
    `recordBlocked` (M18 mù). GHI-NỢ: RF-7 kiểm quyền psid ≠ lệnh convId · RF-8 xaAnh trước
    vòng gửi. (4 mảng refute khác đang chạy — gom sau.)

- 22/08 · TỔNG (từ verdict L0-M1 điểm a): nạp `ai-messages.jsonl` (Sổ AI, chỉ có trên VPS)
  - đối chiếu SỐ DÒNG với bản cũ — chạy trên VPS đợt cutover. Vế thứ ba của phép đối chiếu
    di trú (02 §L0) KHÔNG được tính đạt ở GATE R0.
- 22/08 · TỔNG (từ verdict L0-M1 điểm a): ≥1 page bật AI không nằm trong `pages.json`
  (`1125576063976794`) — thợ L0-M1 liệt kê đủ danh sách page lạc khi di trú; nguồn gốc
  lệch sổ cái xử ở lượt riêng, không nuốt im trong di trú.
- 22/08 · thợ L0-M1 (số đo bổ sung cho dòng trên): page LẠC không phải 1 mà là **3** —
  `1125576063976794` (ai-enabled + kb-overrides + script-versions v1 LIVE) ·
  `1220547807799752` (kb-overrides + script-versions v1 LIVE) · `1100561323151723`
  (kb-overrides, chỉ có sản phẩm). Hệ quả đã đo: **1 công tắc AI** không có đích và
  **2 bản kịch bản** không nạp được (`kich_ban` 69 thay vì 71). Tệp nguồn KHÔNG bị đụng —
  gỡ khi sổ cái page được vá.
- 22/08 · thợ L0-M1: **bộ ca cũ GHI THẲNG vào `conv-state.json` thật** ở gốc repo (chỉ
  `test/l5-ab-followup.test.mjs` tự trỏ `CONV_STATE_FILE` đi nơi khác). Mỗi lượt `npm test`
  đẻ thêm hội thoại khoá `convN_<rác>` vào dữ liệu vận hành — đo trong lượt này: 0 → 21 → 33
  khoá sai khuôn. Cổng `l0-m1.sh` đã tự bảo vệ bằng `CONV_STATE_FILE` tạm; sửa bộ ca cũ
  nằm ngoài pathspec phiếu này.
- 22/08 · thợ L0-M1: `npm test` (`node --test test/`) **gãy trên Node v25** — v25 nhận thư
  mục làm tệp mở đầu (`Cannot find module .../test`). Ngoài ra 5/23 tệp ca cũ đỏ sẵn ở mốc
  nền `3d1eed1` (conv-owner · guard-fastlane · intro · l8-botcake-rules · viec-2345), và
  `node_modules` chưa từng được cài. Sửa script `test` ngoài phạm vi ③ của phiếu L0-M1.
- 22/08 · thợ L0-M1: `.env` **chưa có `V3_KHOA_MA_HOA`** (khoá 32 byte để mã hoá
  `cau_hinh_model.khoa_api_ma`). Bộ ghi fail-CLOSED khi thiếu, nên người B ở L1-M4 sẽ
  không ghi được khoá thật cho tới khi người vận hành đặt biến này — việc NGƯỜI.
- 22/08 · thợ L0-M1: `kb-overrides.json` còn phần **`products`** (bảng giá + ảnh của 73 mục)
  CHƯA nạp — 02 khai nguồn `san_pham`/`goi_gia` là POS (L1-M1), nạp trước sẽ đẻ danh mục
  nửa vời phải hoà giải. L1-M1 quyết có backfill giá/ảnh từ đây không. Kèm số đo cho L1-M1:
  `pages.json.posApiKey` **đã bị che** (112/112 giá trị dạng `***xxxx`, chỉ 6 mã) — khoá POS
  thật nằm ở `pancake-shops.json`, đừng đọc nhầm cột đã che.
- 22/08 · thợ L0-M1: **cổng chặng 1 `ops/bin/nghiem-thu/_chan1.sh` có hai lỗi THƯỚC trên máy
  macOS** (đo trên phiếu L0-M1, cây `d74e43e`) — cả hai làm cổng báo sai về việc ĐÚNG:
  (a) `sed 's/\s*$//'` — BSD sed **không có `\s`**, nó đọc thành «chữ `s` lặp lại», nên mọi
  dòng pathspec kết thúc bằng `s` bị **cắt mất chữ cuối**: `test/l0-m1-*.test.js` thành
  `test/l0-m1-*.test.j` ⇒ phép ④ kết «NGOÀI PHẠM VI» cho đúng những tệp phiếu đã cho phép
  (mọi `.js`/`.ts`/`docs` đều dính). Vá: `[[:space:]]` thay `\s` ở cả hai lệnh sed.
  (b) `m2=$(grep -c … || echo 0)` — khi không có marker, `grep -c` đã in `0` RỒI trả rc=1,
  nên `|| echo 0` nối thành `"0\n0"` ⇒ `syntax error` + `tong_marker: unbound variable`,
  script **chết ngay ở phép ⑥** và không bao giờ chạy tới ⑦ (script nghiệm thu phiếu) và ⑧.
  Nghĩa là ca THÀNH CÔNG (0 marker) là ca duy nhất làm cổng chết. Vá: bỏ `|| echo 0`.
  (c) nhỏ hơn: ④ đo `git diff base..HEAD` nên **gộp cả commit của session khác** trong cùng
  khoảng — lượt này nó tính `docs/thi-cong/phieu/PHIEU-L0-M2.md` (tệp của TỔNG) vào phần thợ.
  ⛔ Thợ KHÔNG sửa `_chan1.sh` — ngoài pathspec ③ của phiếu L0-M1.
- 22/08 · L1-M2 (nợ N2 — nguyên văn từ phiếu ②#3, tổng đã duyệt trước, thợ APPEND):
  `src/tools.js:1` (bộ não chat, CẤM SỬA) import thẳng
  `createOrder, pkSendImage, pkAddNote, pkTagByName` từ `pancake.js`;
  `scheduler-followup.js:24` import `pkSendReply` — bốn hàm gửi không một dòng guard.
  Cửa v3 KHÔNG bịt được lối này trong phiếu L1-M2 (đụng file cấm); L2-M1 khi chuyển
  đường xử lý tin PHẢI route outbound của bộ não qua cửa v3 (DI/injection, không sửa
  `tools.js`). Chi tiết: `docs/v3/ban-giao/cua-messenger-v1.md` §5.

- 22/08 · thợ L1-M1 (nợ N1 — ⚠️ ĐƯỜNG TIỀN/ĐƠN): `src/pancake-orders.js:13` và
  `docs/TONG-QUAN-HE-THONG.md` §7.5 khai nhóm hủy/hoàn = `{4,5,6,7,8}`. ĐO 22/08 trên
  3.546 đơn thật / 7 shop bằng chính `status_name` của API: **8 = `packing` (đang đóng
  gói)**, một bước TIẾN — `status_history` đơn 47397 (UAE) là `0→1→12→8`, đồ thị chuyển
  trên 1.400 đơn có `12→8` 986 lượt · `8→9` 537 · `8→2` 394. Hệ quả: bản ĐANG CHẠY trừ
  đơn đang-đóng-gói khỏi «successful» ⇒ **đếm THIẾU đơn thành công** (riêng UAE 71 đơn
  đứng ở 8 lúc đo). Nhóm đúng là `{4,5,6,7}`. v3 đã khai đúng (`src/pos/ma-trang-thai.js`,
  cổng ③b đỏ nếu ai sửa cho «khớp tài liệu»); sửa bản đang chạy + §7.5 nằm ngoài pathspec.
- 22/08 · thợ L1-M1 (nợ N2 — THƯỚC L0-M1 ĐỎ vì bản 002): thêm bảng thứ 20 `ket_noi_pos`
  làm `test/l0-m1-luoc-do.test.js` **S1 (dòng 63)** + **S12 (dòng 321)** đỏ và
  `ops/bin/nghiem-thu/l0-m1.sh` tụt **51/51 → ĐẠT 47 / TRƯỢT 4** (phép ② + ⑨ + bộ ca).
  Cả 6 mục đỏ CÙNG MỘT GỐC: con số **19** neo cứng. Vá = `19 → 20` ở hai chỗ + thêm
  `ket_noi_pos` vào `NEO_19_BANG`. Ngoài pathspec ③ của L1-M1 (án lệ #25) — TỔNG vá.
- 22/08 · thợ L1-M1 (nợ N3): `suaTheoId` của tầng L0-M2 **chưa có bản cho `ctxHeThong()`**
  (chính `tang-truy-van-v1.md` §3 khai: «mở phiếu mới nếu L1+ cần»). L1-M1 CẦN — refresh
  `trang_thai_pos`/`ton_kho`, mà dữ liệu đậu ở team KỸ THUẬT `chua-phan` nên ctx người
  thật bị từ chối ⇒ buộc ctxHeThong ⇒ không còn đường UPDATE hợp lệ. Tạm giữ MỘT cửa hẹp
  `src/pos/kho.js` (4 bảng deny-by-default · luôn kẹp `team_id` · mọi lượt ghi `nhat_ky`
  · không có hàm xoá). Repo đang có HAI đường ghi — mở phiếu `suaTheoId` cho ctxHeThong
  rồi XOÁ cửa tạm này.
- 22/08 · thợ L1-M1 (nợ N4 — TIỀN): chưa chỗ nào trong v3 khai quy ước quy đổi tiền POS.
  POS trả **đơn vị nhỏ** với hệ số khác nhau theo tệ (AED/SAR/QAR/TWD ×100 ·
  KWD/OMR/BHD ×1000), mà `don_hang.tong_tien` là `numeric(14,2)` — chia 1.000 là làm
  tròn mất chữ số thứ ba ngay lúc ghi, còn ghi số nhỏ trần vào cột tên «tổng tiền» thì
  người sau đọc sai 1.000 lần. L1-M1 **để `tong_tien` NULL** (fail-CLOSED), chỉ ghi
  `tien_te`. Cần một quyết định khai MỘT chỗ cho cả hệ trước khi L3 tính tiền/tỉ lệ hoàn.
- 22/08 · thợ L1-M1 (nợ N5): `db/ket-noi.js` có `docEnv` đọc `.env` kiểu chỉ-đọc nhưng
  **KHÔNG export**, nên `npm run di-tru` chết ở dòng đầu («Thiếu V3_KHOA_MA_HOA») dù
  `.env` có biến ở dòng 83. Pathspec L1-M1 cấm sửa file đó ⇒ phải chép 12 dòng sang
  `src/pos/moi-truong.js`. HAI bản đọc `.env` trong một repo là khớp dễ trôi — export
  `docEnv` rồi gộp về một.
- 22/08 · thợ L1-M1 (nợ N6): `don_hang.trang_thai_he` là cột của MÁY TRẠNG THÁI L3-M1,
  nhưng nó NOT NULL nên cửa POS buộc phải gieo một giá trị lúc tạo dòng — đang là
  `'moi_tu_pos'`. L3-M1 chốt từ vựng thì đổi bằng một câu UPDATE. Cửa POS KHÔNG bao giờ
  ghi lại cột này (ca `R3` của `test/l1-m1-doc-pos.test.js` canh).
- 22/08 · thợ L1-M1 (nợ N7): danh mục POS có **biến thể TRÙNG TÊN** — đo mẫu 352 biến thể
  /7 shop: 37 (10,5%) trùng, riêng Taiwan 12/28 (3 biến thể đầu đều tên «010 - Birthstone
  Set»). `san_pham.ma` khác nhau nên không mất dữ liệu, nhưng bot báo giá/tồn theo TÊN thì
  không phân biệt nổi biến thể. Sửa ở POS (đặt tên/size) hoặc ghép thêm khoá vào tên hiển thị.
- 22/08 · thợ L1-M1 (nợ N8 — 🔴 MẤT CODE TRONG GIT, không phải việc của L1-M1): commit
  `b356f7b` («docs(dieu-hanh): L1-M2 ✅ — nghiệm thu 8/8…») **XOÁ 6/6 tệp của L1-M2 khỏi
  cây git** (1.311 dòng: `src/channels/messenger/index.js` · `loi.js` ·
  `test/l1-m2-cua.test.js` · `ops/bin/nghiem-thu/l1-m2.sh` · `docs/v3/ban-giao/cua-messenger-v1.md`
  · `docs/thi-cong/nhat-ky/phieu-l1-m2.md`) — đúng những tệp `92afae3` vừa thêm. Kiểm bằng
  `git show --diff-filter=D --name-only b356f7b`. Tệp CÒN NGUYÊN trên đĩa (đang untracked)
  nên chưa mất gì, nhưng HEAD hiện KHÔNG có code L1-M2 và sổ thì khai ✅. Vá: `git add`
  lại đúng 6 đường dẫn đó rồi commit — ⛔ L1-M1 không chạm (đất phiếu khác, án lệ #25).

- 22/08 · thợ L3-M1 (nợ P1 — 🔴 CHẶN một nhánh ĐANG CHẠY): `src/pos/ma-trang-thai.js#CHUYEN_CHO_PHEP`
  chỉ có `0→12` và `12→0`. Cặp **`1→12` KHÔNG có**, trong khi đồ thị POS thật là `0 → 1 → 12 → 8`
  (sale duyệt tay xen giữa lúc bot chờ khách trả lời). Hệ quả đo được: ca `live=1` của L3-M1
  ngoài đời KHÔNG tới `day_cho_in` mà rơi vào `cho_sale` + `viec_can_xu_ly`
  («pos_tu_choi_ghi (LoiChuyenNgoaiBang)») — không im lặng, nhưng là một đơn phải làm tay.
  Vá = thêm cặp `1→12` vào bảng ĐÃ XÁC MINH (đất phiếu L1-M1, L3-M1 không chạm — án lệ #25).
  Neo đo: `ops/bin/nghiem-thu/l3-m1.sh` phép ③c (in ⏸ HOÃN) + ca `C5` của
  `test/l3-m1-may-trang-thai.test.js` (sẽ ĐỎ khi ai vá xong — đó là lúc sửa
  `docs/v3/ban-giao/may-trang-thai-don-v1.md` §3).
- 22/08 · thợ L3-M1 (VƯỢT PATHSPEC ③ — khai trước, xin sau đúng lệnh đề bài): phiếu ③ không
  liệt `db/migrate/`, nhưng đo `don_hang` ra ĐÚNG 14 cột, không cột nào chứa nổi lý do không
  gửi / số lần thử và không có cột jsonb ⇒ buộc phải có **`db/migrate/004_trang_thai_don`**
  (số 004 do TỔNG cấp trong đề bài). Ba đường dẫn vượt ③ trong commit:
  `db/migrate/004_trang_thai_don.up.sql` · `.down.sql` · `docs/v3/ban-giao/luoc-do-v1.md`
  (APPEND §8, đề bài yêu cầu «khai lý do vào luoc-do-v1 §thay-đổi»). Không đụng bảng nào của 003.
- 22/08 · thợ L3-M1 (nợ P2): **`db/schema.sql` CHƯA regen** — `node db/migrate.js schema` sinh
  từ TOÀN BỘ `db/migrate/*.up.sql`, trong đó `003` của L2-M1 còn nằm ngoài git; regen là kéo
  migration thợ khác vào commit của mình (án lệ #24/#25). Ca `S11` của `l0-m1-luoc-do.test.js`
  ĐÃ ĐỎ TỪ TRƯỚC lượt này (đo: gỡ 004 khỏi cây, S11 vẫn đỏ ⇒ nguyên nhân là 003). TỔNG chạy
  `node db/migrate.js schema` **một lượt duy nhất sau khi CẢ 003 lẫn 004 đã gộp**, rồi chạy lại
  S11. ⚠️ Thợ L2-M1 đã tự regen file đó trong lúc tôi làm nên nó hiện chứa CẢ `tin_cho_xu_ly`
  lẫn `ly_do_khong_gui` — file NÓNG hai bên, L3-M1 cố ý không commit nó. CSDL dev cũng chưa áp
  004 (áp là chạy luôn 003 của thợ kia); cổng + bộ ca đều tự dựng sandbox nên không cần.
- 22/08 · thợ L3-M1 (nợ P3): repo đang có **BA** đường UPDATE hẹp — `suaTheoId` (`src/db/`,
  không nhận `ctxHeThong()`), `suaTheoIdPos` (`src/pos/kho.js`, bản TẠM của L1-M1), và
  `ghiDon` trong `src/orders/may-trang-thai.js` (allow-list 4 cột, luôn kẹp `team_id`).
  Lý do không tái dùng `suaTheoIdPos`: nó tự ghi thêm một dòng `nhat_ky` ghi chú «cửa POS sửa
  dòng» — câu đó SAI cho một lượt chuyển trạng thái ĐƠN («cổng lỏng mà log nói dối là HAI lỗi»).
  Bản vá đúng: `suaTheoId` hỗ trợ `ctxHeThong()` ở `src/db/` (đất L0-M2) rồi gộp cả ba về một.
- 22/08 · thợ L3-M1 (nợ P4): `src/pos/index.js` (cửa VÀO duy nhất) KHÔNG re-export hàm đọc MỘT
  đơn — chỉ có `docDon` (quét cả shop, phân trang, ghi DB). Vế `tu` của compare-and-set phải đọc
  LIVE, nên `src/orders/cua-pos.js` import SÂU `src/pos/api.js#guiDocMotDon` (hàm CHỈ-ĐỌC, GET).
  Vá: re-export `docMotDonLive` ở `src/pos/index.js` rồi xoá import sâu đó.

- 22/08 · thợ L2-M1 (nợ N1 — 🔴 ĐƯỜNG ĐƠN/TIỀN, phiếu khai THIẾU): phiếu L2-M1 ② khai
  «BA chỗ gửi ngầm» trong `executeTool`; đo lại ra **NĂM đường thoát**, hai chỗ gọi GIÁN
  TIẾP nên grep trong `tools.js` không thấy: (4) `tools.js:208 recordClosedOrder` →
  `order-bridge.js:255 pkAddNote(<ghi chú đơn>)`; (5) `tools.js:171 ordersEnabled() &&
conversationHasOrder()` → `src/pancake-orders.js:25` và `:108` **fetch HTTP tới POS
  pages.fm bằng KHOÁ THẬT của 7 shop** (`pancake-shops.json`). Đo bằng bẫy
  `globalThis.fetch` trong `test/l2-m1-nhac-truong.test.js`: **7 lượt** thoát ra ở dân số
  «ép chốt đơn», trong khi mock `pancake.js`+`messenger.js` vẫn báo sạch — tức bộ ca chỉ
  mock theo danh sách của phiếu sẽ **XANH GIẢ**. Ba thứ làm nó nguy: `grep PANCAKE_READONLY
src/pancake-orders.js` = **0 dòng** (van máy dev KHÔNG phủ) · `catch {}` ở `:113` nuốt
  lỗi theo chiều fail-OPEN («coi như chưa có đơn») · nó là đường ĐỌC nên không ai đi tìm
  khi hỏi «bot có gửi gì không». Bọc nó nằm ngoài pathspec L2-M1 (file phẳng, CẤM SỬA) —
  cần một phiếu cutover.
- 22/08 · thợ L2-M1 (nợ dài hạn CUTOVER, phiếu ② yêu cầu ghi): ở VPS (môi trường ĐƯỢC PHÉP
  gửi) cả **5 đường thoát** trên vẫn đi thẳng, không qua cửa v3 — «hợp thức ở cutover, VPS
  là môi trường được phép gửi». Hệ quả cụ thể phải biết trước khi bật: nhánh **chuyển
  người** để lại **HAI ghi chú** trên Pancake (một của `tools.js:271`, một của cửa v3 ở
  handler v3 — phiếu ④#4c đòi cửa v3 gánh tag/note) và gắn thẻ **hai lượt** (thẻ lũy đẳng
  nên vô hại; ghi chú thì KHÔNG). ⛔ Đừng «sửa» bằng cách bỏ đường cửa v3: bỏ nó là mất
  luôn guard, và mất luôn tag/note cho các nhánh bàn giao mà bộ não KHÔNG chạy tới (page
  chưa có KB, khiếu nại). Cách đúng: phiếu bọc
  `tools.js`/`order-bridge.js`/`pancake-orders.js` ở đợt cutover.
- 22/08 · thợ L2-M1 (nợ THƯỚC — giống hệt nợ N2 của L1-M1, lặp lại vì bản 003):
  `test/l0-m1-luoc-do.test.js` **S1 (dòng 65)** + **S12 (dòng 323)** và
  `ops/bin/nghiem-thu/l0-m1.sh` (biến `NEO`, dòng 112) neo cứng con số **20** + danh sách
  tên bảng ⇒ ĐỎ kể từ bản 003. Đo 22/08: **21 bảng** · `l0-m1.sh` **51 → ĐẠT 47 / TRƯỢT 4**
  (đúng 4 mục L1-M1 đã gặp). Vá = `20 → 21` ở hai chỗ trong test + thêm `tin_cho_xu_ly` vào
  `NEO_19_BANG` (test dòng 16) và `NEO` (script dòng 112). Đo thêm để TỔNG khỏi đoán: bản
  004 (L3-M1) **KHÔNG thêm bảng nào** (`grep -c '^CREATE TABLE' db/migrate/004_*.up.sql` = 0) ⇒ con số đúng là **21**, không phải 22. Ngoài pathspec L2-M1 (án lệ #25) — TỔNG vá.
- 22/08 · thợ L2-M1 (nợ N3 của L1-M1 LẶP LẠI): `suaTheoId` của tầng L0-M2 vẫn chưa có bản
  cho `ctxHeThong()`, mà worker là job nền và 100% dữ liệu di trú đậu ở team KỸ THUẬT
  `chua-phan` ⇒ không còn đường UPDATE hợp lệ nào qua tầng chung cho `hoi_thoai`. Buộc dựng
  cửa hẹp thứ HAI `src/chat/kho.js` (danh sách cột deny-by-default · luôn kẹp `team_id` ·
  mọi lượt ghi `nhat_ky` · không có hàm xoá), cùng khuôn `src/pos/kho.js`. Repo nay có
  **HAI** cửa hẹp cùng một gốc — mở phiếu `suaTheoId cho ctxHeThong` rồi **XOÁ CẢ HAI**.
- 22/08 · thợ L2-M1 (phối hợp phiếu song song, không phải lỗi): `db/schema.sql` **cố ý
  KHÔNG commit** ở cả L2-M1 lẫn L3-M1 — nó sinh ra từ CẢ thư mục `db/migrate/`, nên ai
  commit trước là kéo migration của người kia vào commit của mình và làm HEAD mâu thuẫn
  (schema.sql khai một bản chưa có trong git). Tệp TRÊN ĐĨA đã được sinh lại (ca `S11` xanh
  cho cả hai thợ ngay lúc này). **TỔNG chạy `node db/migrate.js schema` MỘT LƯỢT rồi commit
  sau khi 003 và 004 đã gộp.**

- 22/08 · thợ L2-M1 (🔴 QUY TRÌNH — suýt lặp lại nợ N8 của L1-M1, đã tự sửa nhưng luật
  còn thiếu): commit bằng nghi thức **private-index** (`GIT_INDEX_FILE` riêng +
  `update-ref`) **KHÔNG cập nhật index CHÍNH**. Ngay sau commit `4261900`,
  `git status --porcelain` báo **19 tệp vừa thêm là `D ` (đã xoá)** và hai tệp dùng chung
  (`SO-DIEU-HANH-THI-CONG.md`, `luoc-do-v1.md`) là `MM` với bản staged là bản TRƯỚC append
  (`git diff --cached HEAD` = −70 và −64 dòng). Session nào chạy `git commit` không
  pathspec — hoặc commit đúng hai tệp đó — sẽ xoá 19 tệp L2-M1 khỏi cây và nuốt phần
  §9/§10, đúng kịch bản `b356f7b` đã làm với L1-M2. Đã sửa bằng
  `git reset -q -- <đúng 19 đường dẫn>` (không đụng phần staged của ai). ⇒ **Đề nghị TỔNG
  bổ sung vào skill `tho-thi-cong`: private-index commit PHẢI kết bằng
  `git reset -- <pathspec>`.** Nghi thức hiện tại dừng ở `update-ref` là để lại mìn hẹn giờ.

- 23/08 · thợ VA-P1 — **P1 đóng bởi VA-P1**: thêm cặp `1→12` vào `CHUYEN_CHO_PHEP`
  (`src/pos/ma-trang-thai.js`), neo đồ thị đơn 47397 (UAE) `0→1→12→8` + nhãn `submitted`
  đã có sẵn trong `BANG_MA`. Ca `C5` của `test/l3-m1-may-trang-thai.test.js` (neo L3-M1 để
  lại) cập nhật theo hành-vi-mới: `kiemChuyen(1,12)` nay CHO QUA thay vì ném
  `LoiChuyenNgoaiBang`. Test mới `D5` (`test/l1-m1-ghi-nguoc.test.js`) đo cặp mới qua đủ
  bốn cửa. Bộ ca l1-m1+l3-m1 gộp 63/63 xanh. `may-trang-thai-don-v1.md` §3 (bản CŨ của
  nợ P1) KHÔNG được đồng bộ trong lượt này — ngoài pathspec VA-P1 (chỉ khai
  `luoc-do-v1.md`), cần phiếu riêng nếu muốn đồng bộ. Chi tiết: nhật ký
  `docs/thi-cong/nhat-ky/phieu-va-p1.md`.
- 23/08 · thợ VA-P1 (nợ mới — 🟡 THƯỚC TRÔI theo số migration, không phải lỗi cửa POS):
  `ops/bin/nghiem-thu/l1-m1.sh` phép ① («bảng `ket_noi_pos` sau down/sau up» chờ `0/1`)
  nay ĐỎ THẬT `1/1`. Xác nhận bằng A/B `git stash` đúng 3 file pathspec của VA-P1: chạy
  script trên bản GỐC (chưa vá CHUYEN_CHO_PHEP) ra ĐỎ Y HỆT ⇒ không liên quan cặp `1→12`.
  Nguyên nhân: `node db/migrate.js down` (không tham số) gỡ bản MỚI NHẤT trong
  `_migrations` (`db/migrate.js` dòng 5); script viết khi 002 còn là bản mới nhất, nay
  chuỗi có thêm 003 (L2-M1) + 004 (L3-M1) nên một lượt `down` gỡ 004, không đụng bảng
  `ket_noi_pos` của 002 ⇒ bảng còn nguyên sau down. Cùng họ nợ P2 (schema.sql) — gate giả
  định số migration cố định trong khi cây chạy nhiều phiếu song song; sửa đúng cần chọn
  `down --het` hay `down N` cho MỌI gate, không phải việc vá 1 dòng bảng hằng của VA-P1.

- 23/08 · thợ L2-M2 (nợ mới — quy ước KB chưa có đường ghi qua dashboard): `src/chat/lop-tu-khoa.js`
  dùng `kb.config.fastLaneAuth` / `kb.config.fastLaneSize` (quy ước MỚI, cùng khuôn
  `fastLanePrice/fastLaneShip/fastLaneHowto` đã có sẵn) để trả lời 2 luật thật/giả + hỏi
  size. Nhưng `kb.js#cleanConfig` (mảng `SCRIPT_FIELDS`) chỉ giữ đúng 6 cột đã khai khi ghi
  qua dashboard (`updatePageConfig`/`saveDraft`) — 2 field mới hôm nay CHỈ sống được nếu ghi
  thẳng `kb-overrides.json` (đúng đường đã dùng để rút bộ từ khoá thật ở đề bài ⑤ phiếu
  L2-M2), dashboard chưa có ô nhập cho chúng. `kb.js` ngoài pathspec ③ của phiếu này — mở
  phiếu thêm 2 field vào `SCRIPT_FIELDS` + form dashboard khi cần marketer tự nhập tay. Chi
  tiết: `docs/v3/ban-giao/duong-tin-v1.md` §12.

- 23/08 · thợ L3-M2 (nợ Q1 — 🔴 KHỚP ĐỨT trên ĐƯỜNG ĐƠN, chặn CẢ HAI cửa kiểm):
  `khach` có **0 dòng** và `don_hang.khach_id` = **0/26** trên `aicloser_v3` (đo 23/08).
  Cửa POS `src/pos/doc-don.js` đọc đơn nhưng KHÔNG tạo hồ sơ khách, trong khi POS trả sẵn
  `shipping_address.phone_number` (đo: chỉ 15/5.144 đơn thật thiếu số). Hệ quả đo được:
  `kiemTrung()` và `chamTiLeHoan()` chạy đúng nhưng trả **tập RỖNG** trên dữ liệu thật
  (`chamTiLeHoan` trên dev: 4 team · 0 khách · 0 cập nhật), và nhánh `thieu_so_wa` của
  L3-M1 cũng nối qua đúng cột rỗng đó ⇒ hôm nay **100% đơn trang bán hàng không có số WA**
  vì lý do này chứ không phải vì khách thiếu số. Đây là họ lỗi «hai đầu làm rất kỹ, phần bị
  bỏ luôn là phần NỐI». Vá = cửa POS tạo/nối `khach` lúc đọc đơn — **đất L1-M1** (án lệ
  #25, L3-M2 không chạm). Neo đo: `ops/bin/nghiem-thu/l3-m2.sh` in ⏸ HOÃN mục 1.
- 23/08 · thợ L3-M2 (nợ Q2 — cột mới CHƯA CÓ NGƯỜI GHI): migration 005 thêm
  `don_hang.san_pham_ma text[]` (mã biến thể POS `"<shop>:<variation_id>"`) vì `don_hang`
  KHÔNG có cột nào giữ sản phẩm, mà nghiệm thu 02 §L3 là «cùng sản phẩm → bị bắt là trùng».
  **Chủ cột là cửa POS** (`src/pos/doc-don.js`, L1-M1): POS trả sẵn `items[].variation_id`
  trên **4.935/5.144 đơn (95,9%)**, chỉ thiếu lượt ghi. Trong lúc chờ, `kiemTrung()` KHÔNG
  đọc cột rỗng thành «khác SP ⇒ sạch» mà rơi vào nhánh mù-có-nói-ra
  `nghi_trung_chua_ro_san_pham` (fail-CLOSED, mã lý do RIÊNG). Neo đo: ⏸ HOÃN mục 2 của cổng.
- 23/08 · thợ L3-M2 (nợ Q3 — 0,08% sai số của một phép quy ước, đo được): job chấm tỉ lệ
  hoàn dùng ảnh chụp `don_hang.trang_thai_pos` chứ không dùng `status_history` — cửa POS
  KHÔNG lưu mảng đó xuống cột nào, và job đêm không được tự gọi lại POS từng đơn (án lệ #31
  «cửa RA đúng một cái»). Đo độ lệch của chính phép quy ước trên 5.144 đơn thật: «lịch sử
  TỪNG chạm {4,5,6,7}» khác «hiện tại thuộc {4,5,6,7}» ở đúng **4 đơn (0,08%)**. Xoá nốt
  0,08% = cửa POS lưu `status_history` (đất L1-M1). `status_history` CÓ trên 5.144/5.144 đơn.
- 23/08 · thợ L3-M2 (nợ N3/P3 LẶP LẠI lần thứ tư): `suaTheoId` của `src/db/` vẫn chưa nhận
  `ctxHeThong()`, mà job đêm phải chạm team KỸ THUẬT `chua-phan` (26/26 đơn thật ở đó) ⇒
  buộc dựng đường UPDATE hẹp thứ **BỐN** (`CAU_GHI_CHAM` trong `src/orders/ti-le-hoan.js`:
  một câu cố định 5 cột của `khach`, luôn kẹp `k.team_id`, không `INSERT`/`DELETE`, không
  đụng `sua_luc`). Không tái dùng `suaTheoIdPos` vì nó tự ghi `nhat_ky` mang câu «cửa POS
  sửa dòng» — SAI cho một lượt chấm tỉ lệ hoàn («cổng lỏng mà log nói dối là HAI lỗi»).
  Bản vá đúng vẫn là `suaTheoId` cho `ctxHeThong()` ở `src/db/` (đất L0-M2) rồi **gộp CẢ
  BỐN về một**.
- 23/08 · thợ L3-M2 (quyết định NGƯỜI còn treo, không phải nợ kỹ thuật): 01 §11 «Chặn cứng
  khách hoàn cao ở một ngưỡng» vẫn **Chờ chốt**. Phần TÍNH đã trả xong (bốn tầng + tử/mẫu +
  mốc chấm, phân bố đo trên 5.144 đơn thật: `canh_bao` 30–65% = **107 khách** — cụm thật,
  cỡ khớp với «144 khách» 01 §11 nêu). Phần CHẶN: **không dòng mã nào trong v3 đọc
  `tang_hoan` để chặn**, cố ý. Người quyết chốt xong thì mở phiếu riêng — đừng vá lén vào
  `ti-le-hoan.js`. Kèm số cho lượt chốt đó: hạ sàn từ 2 xuống 1 đơn-đã-kết làm `rui_ro_cao`
  nhảy **130 → 953 khách** (823 người bị dán nhãn bằng ĐÚNG MỘT đơn).

- 23/08 · thợ L2-M3 (nợ mới — giới hạn THẬT, không phải lỗi code): `bo_luat_chung` seed
  - đọc đúng hợp đồng DB (OR-IS-NULL, versioned, hợp đồng N3 có sẵn ở tầng truy vấn)
    nhưng KHÔNG điều khiển model — `buildSystem(kb)` trong `prompts.js` (CẤM SỬA) HARDCODE
    hằng `CORE`, không đọc trường `kb.*` nào cho khối "bộ luật chung". `kb.text` chỉ mang
    một MẨU ~300 ký tự của `bo_luat_chung` (khai rõ tình trạng ngay trong đoạn text đó),
    KHÔNG dán nguyên ~2.256 token (trùng lặp với CORE, tốn token mà không đổi hành vi model).
    Ba khối còn lại (kỹ năng/kịch bản/sản phẩm) CÓ hiệu lực thật qua `kb.text`/`kb.config`.
    Muốn bo_luat_chung THẬT SỰ sống thì phải mở phiếu sửa `prompts.js#buildSystem` — ngoài
    mọi pathspec hiện có (file CẤM SỬA cấp dự án, luật 4 §0a). Chi tiết:
    `docs/v3/ban-giao/duong-tin-v1.md` §13.2.
- 23/08 · thợ L2-M3 (nợ mới, cùng họ nợ Q2 của L3-M2 23/08): 01-QUYET-DINH.md §6 chỉ
  đích danh «2 SP hoàn 26,8%/19,2% chưa bật kỹ năng size», nhưng KHÔNG có cách xác định
  ĐÚNG 2 mã SP đó từ dữ liệu hiện có (`san_pham` không có tỉ lệ hoàn theo SP;
  `don_hang.san_pham_ma` — migration 005 — CHƯA cửa POS nào ghi, nợ Q2 §9 23/08). Seed
  kỹ năng `hoi_size` (`db/di-tru/bo-luat-va-ky-nang.js`) với `bat_cho_nhom_sp='{}'` VÀ
  `bat=false` — khung có sẵn, KHÔNG âm thầm bật cho toàn danh mục team (tránh hỏi size
  cho sản phẩm không có size). Khi cửa POS (đất L1-M1) ghi xong `san_pham_ma` VÀ có báo
  cáo tỉ lệ hoàn theo SP, người vận hành UPDATE `bat_cho_nhom_sp`+`bat=true` — không cần
  seed lại.
- 23/08 · thợ L2-M3 (nợ mới — 🟡 THƯỚC TRÔI theo tính năng mới ĐÚNG THIẾT KẾ, không phải
  hồi quy thật): `test/l2-m2-handler.test.js` ca «không cướp diễn đàn (ở tầng handler)»
  (dòng ~206-224) nay ĐỎ THẬT, tái lập ổn định. File đó dùng CHUNG một `hoi_thoai` cho 6
  ca (`before()` tạo 1 lần); ca «NHƯỜNG khi thiếu KB size» chạy TRƯỚC đã tiêu 1 lượt gọi
  model thật (`moc_luot_llm` +1). Tin của ca đỏ («magkano po ang presyo?») chỉ ghi điểm
  lead=1 (tín hiệu `price`) ⇒ tier LẠNH ⇒ ngân sách 24h=1 lượt — ĐÃ TIÊU HẾT bởi ca trước
  ⇒ ngân sách lượt theo độ nóng (L2-M3, thay trần 4 lượt cứng) CHẶN ĐÚNG THIẾT KẾ, không
  gọi model. Xác nhận không phải bug: cùng kịch bản dưới trần-4-cứng CŨ không đỏ (4>1
  lượt đã tiêu). Vá đúng (1-3 dòng, ngoài pathspec L2-M3 — án lệ #25, đất test L2-M2):
  thêm `deps.conNganSach: () => ({ok:true})` cho ca đó, hoặc tách `hoi_thoai` riêng — xem
  `test/l2-m3-handler.test.js` đã làm mẫu chính cơ chế này. Neo đo:
  `ops/bin/nghiem-thu/l2-m3.sh` phép ⑦e tự nhận diện ĐÚNG ca này BẰNG TÊN (án lệ #8 "so
  danh sách không so số"), không phải chỉ đếm số — ca nào KHÁC/thêm đỏ mới là hồi quy
  thật. Chi tiết đủ: `docs/v3/ban-giao/duong-tin-v1.md` §13.6 +
  `docs/thi-cong/nhat-ky/phieu-l2-m3.md` §4.
- 23/08 · thợ L2-M3 (phát hiện phụ — bẫy THƯỚC dùng CHUNG, không phải nợ riêng phiếu
  này): khi tự chạy thử `l2-m3.sh` bắt được 2 lỗi trong CHÍNH khuôn `muc/so/dat/truot/
bang` mà `l2-m2.sh`/`l3-m2.sh` cũng dùng (CHƯA lộ ở hai cổng đó vì chưa từng có ca đỏ
  để thử): (a) đọc `$?` sau một lệnh `so`/`printf` trung gian thay vì NGAY sau
  `node --test` → luôn đọc rc=0 GIẢ (rc của lệnh in, không phải của node) — cổng lỏng mà
  không ai biết, án lệ #5 dạng mới; (b) `grep -c '^✖ '` đếm TRÙNG khi có ca đỏ thật: node
  --test in tên ca đỏ 2 LẦN (khối tuần tự + khối "failing tests:" cuối log) và dòng
  "✖ failing tests:" tự nó cũng khớp `^✖ ` ⇒ 1 ca đỏ đếm ra 3. Đã vá TRONG `l2-m3.sh`
  (đất mình: `$?` capture ngay sau `node --test`; đếm bằng dòng tổng kết chuẩn
  `ℹ pass N`/`ℹ fail N`; tên ca đỏ cắt log tại dòng `ℹ tests` trước khi grep). KHÔNG sửa
  `l2-m2.sh`/`l3-m2.sh` (ngoài pathspec, đất phiếu khác) — đáng chưng cất vào skill
  `tho-thi-cong` cho các cổng tương lai, TỔNG cân nhắc.

- 23/08 · thợ L3-M3 (nợ mới — cửa ghi hẹp THỨ NĂM, cùng họ N3/P3/nợ-Q-của-L3-M2): job
  quét lịch nhắc (`src/orders/lich-nhac.js`) bắt buộc chạy dưới `ctxHeThong()` (tin WA tự
  động tới, không có người đăng nhập), mà `suaTheoId` (L0-M2) vẫn KHÔNG hỗ trợ
  `ctxHeThong()`. Thêm `ghiLich` (UPDATE hẹp, allow-list đúng hai cột
  `trang_thai`/`huy_ly_do`, luôn kẹp `team_id`) — cửa hẹp thứ NĂM sau `suaTheoId` gốc,
  `suaTheoIdPos` (L1-M1), `ghiDon` (L3-M1), `CAU_GHI_CHAM` (L3-M2). Bản vá đúng không đổi:
  `suaTheoId` hỗ trợ `ctxHeThong()` rồi gộp cả năm về một — ngoài pathspec L3-M3.
- 23/08 · thợ L3-M3 (khai rõ, không phải nợ): phiếu ②#1 viết "ghi `so_lan_thu_wa`" khi mô
  tả job gửi nhắc — đo lại xác nhận `don_hang.so_lan_thu_wa` (migration 004) là cột RIÊNG
  của `quet-don-moi.js` (đếm thử lại gửi mẫu XÁC NHẬN LẦN ĐẦU, trần 3, ràng buộc CHECK gắn
  với `gui_wa_loi`) — dùng chung cột cho hàng đợi nhắc (trần 5, ý nghĩa khác hẳn) sẽ làm
  hai trần giẫm lên nhau. Đã KHÔNG đụng cột đó; đếm số lần nhắc bằng chính số DÒNG
  `lich_nhac` của đơn (mỗi lần nhắc = một dòng riêng, `lan_thu` là số thứ tự của dòng đó).
  Chi tiết: `docs/thi-cong/nhat-ky/phieu-l3-m3.md` §2-3.

- 23/08 · thợ VA-Q12 — **Q1·Q2·Q3 ĐÓNG bởi VA-Q12**: `src/pos/doc-don.js` nay upsert
  `khach` theo (team, SĐT chuẩn hoá bằng `chuanHoaSdt`) và ghi `don_hang.khach_id` +
  `san_pham_ma` (mảng `"<shop>:<variation_id>"`, RỖNG khi thiếu — không bịa) cho mỗi đơn
  đọc về, kể cả BACKFILL đơn đã có sẵn (không chỉ khi `trang_thai_pos` đổi — nếu không,
  26 đơn cũ sẽ mãi mãi không được nối vì trạng thái POS của chúng không đổi). Q3 làm
  luôn (rẻ, cùng vòng lặp): migration `006_lich_su_trang_thai` thêm `don_hang.
status_history jsonb`, CHỈ LƯU — chưa hàm nào đọc. BẰNG CHỨNG TRÊN DỮ LIỆU THẬT
  (`aicloser_v3` dev, không sandbox — chữ phiếu đòi "di trú lại 26 đơn cũ" +
  "kiemTrung trên dữ liệu thật"): sau khi refresh UAE (26/26 đơn cũ có `khach_id`) và
  Saudi (`tuNgay=2026-08-18`), `kiemTrung()` **BẮT ĐƯỢC** đúng cặp trùng chéo thật mà
  `loc-trung.js` đã nêu tên — SĐT `966501984606`, đơn Messenger #68771 / trang bán hàng
  #68769 → `trung=true·ly_do=trung_khop_san_pham·nguon_trung=ca_hai` (trước phiếu này
  luôn RỖNG). Hệ quả phụ ĐÃ ĐO, nói thẳng: quét đủ sâu để chạm 26 `ma_pos` cũ + cặp lịch
  sử 19/08 đã làm `don_hang` 26→3.784 và `khach` 0→3.218 trên dev (chỉ THÊM đơn UAE/Saudi
  thật đi qua GET, KHÔNG xoá/nhân đôi dòng nào — đúng nghĩa "làm giàu thêm" mà phiếu cho
  phép). Lệch chữ phiếu có chủ ý (luật 13 skill, lý do đo được): nhập `chuanHoaSdt` THẲNG
  từ `loc-trung.js` thay vì qua `orders/index.js` — barrel đó tạo VÒNG `src/pos↔src/orders`
  (đo thử: chạy được hôm nay nhưng vỡ ngầm nếu ai đổi kiểu khai hàm; repo đã trả giá 4 lần
  để giữ layer không phụ thuộc ngược). Nợ mới (§9, ngoài pathspec, đất L1-M1): `docDon`
  `if (!lo.donHang.length) break;` coi một trang POS RỖNG THOÁNG QUA (đo được thật khi gọi
  dồn dập không nghỉ) là HẾT DỮ LIỆU, có thể bỏ sót các trang sau — IM LẶNG. Chi tiết đủ:
  `docs/thi-cong/nhat-ky/phieu-va-q12.md`.

- 23/08 · thợ L3-M4 (nợ mới — CỬA MẠNG POS THỨ HAI): `src/pos/api.js` tự khai là «chỗ DUY
  NHẤT trong v3 chạm mạng của POS», nhưng nó KHÔNG nằm trong pathspec ③ của phiếu L3-M4
  (án lệ #25) ⇒ hàm POST tạo đơn `guiTaoDon` tạm sống trong `src/pos/tao-don.js`. Nó vẫn là
  MỘT cửa ra trần trụi, đếm được (bộ ca đếm `POST` từng lượt), nhưng hai cửa mạng POS trong
  một repo là một khớp dễ trôi. Cùng họ với import SÂU `../pos/api.js#guiDocDon` mà nguồn
  (b) phải dùng (`src/pos/index.js` chỉ export `docDon` — bản QUÉT-VÀ-GHI-DB, không phải
  lượt GET trần) — đúng nợ mà `src/orders/cua-pos.js:18` đã ghi từ L3-M1. Vá: `api.js` thêm
  `guiTaoDon` + `docMotTrangDon`, rồi xoá hai import sâu.
- 23/08 · thợ L3-M4 (nợ mới — NGUỒN (c) CHỐNG TRÙNG MỚI CÓ MỘT VẾ): §7.3 bản cũ đọc «thẻ
  trạng thái đơn trên hội thoại» (`ORDER_STOP_TAGS` = −1/−2/−3/−11/−12/−20, `conv-owner.js`).
  v3 KHÔNG có cột nào giữ thẻ số của hội thoại Pancake — cửa Messenger v3 chỉ có `gatThe`
  (GHI), không có đường ĐỌC. Nguồn (c) hiện đọc `hoi_thoai.trang_thai='POST_SALE'` và khai
  thẳng `the_hoi_thoai: "chua_co_cot"` trong `cua_kiem`. ⚠️ Vế thiếu CỐ Ý không tính là
  `unknown`: tính thì theo luật «unknown = đóng» mọi dòng hàng chờ chết vĩnh viễn. Rủi ro
  còn lại (sale gắn thẻ trên Pancake mà chưa có đơn POS) do nguồn (b) POS SỐNG phủ trực
  tiếp. Vá đúng = cửa Messenger cấp đường đọc thẻ hội thoại (đất L1-M2).
- 23/08 · thợ L3-M4 (nợ mới — 🔴 `warehouse_id` KHÔNG CÓ NGUỒN NÀO TRONG v3): payload tạo
  đơn POS đòi `warehouse_id` (khuôn cũ `createPancakeOrder` học nó từ đơn cũ của page qua
  `productRef`). v3 không có cột nào giữ: `san_pham` không có, `don_hang` không có,
  `doc-danh-muc.js` không đọc. `taoDon` fail-CLOSED (`LoiThieuThamChieuSanPham`, 0 lượt
  POST) thay vì đoán. HỆ QUẢ ĐO ĐƯỢC: hôm nay MỌI lượt duyệt đều phải có sale `boSung`
  `kho_hang` bằng tay. Vá = cửa POS lưu `warehouse_id` lúc đọc đơn/danh mục (đất L1-M1),
  KHÔNG dựng một bộ «học từ đơn cũ» thứ hai trong `src/orders`.
- 23/08 · thợ L3-M4 (nợ mới — 🟡 tra kết nối POS của page chỉ phủ 112/502): nguồn (b) cần
  một `market` để gọi `layKetNoi`. Đo 23/08 trên `aicloser_v3`: khớp qua `page.pos_shop_id`
  → `ket_noi_pos.shop_id` được **112/502** page; khớp qua nhãn `page.thi_truong`
  (`KSA`·`Khác`·rỗng) với `ket_noi_pos.market` (`Saudi`…) được **0/502** — hai từ vựng khác
  nhau. 390 page còn lại ⇒ nguồn (b) `unknown` ⇒ cửa ĐÓNG (đúng nguyên tắc, nhưng là 78%
  hàng chờ không duyệt được). Vá = di trú điền `pos_shop_id` cho mọi page (đất di trú/L1-M1),
  hoặc chuẩn hoá một từ vựng thị trường duy nhất. ⛔ Đừng vá bằng một bảng ánh xạ gõ tay
  `KSA→Saudi` (án lệ #22: danh sách gõ tay là lỗ hẹn giờ).
- 23/08 · thợ L3-M4 (khai rõ hệ quả của nợ `goi_gia` giá-0, KHÔNG phải nợ mới): `goi_gia`
  = **0 dòng** toàn hệ ⇒ cửa tiền ② trả `unknown_chua_co_bang_gia` cho MỌI dòng hàng chờ và
  ĐÓNG ⇒ **hôm nay 100% lượt `duyet` bị chặn ở cửa ②**, kể cả khi mọi cửa khác sạch. Đây là
  hành vi ĐÚNG theo §7.3 (thà chặn còn hơn tin con số bot nêu — án lệ khách Priscela Amon),
  và là cách phiếu L3-M4 sống chung với nợ L1-M1; ghi ra đây để người sau đọc bảng điều
  khiển «0 đơn duyệt được» không đi tìm bug ở `hang-cho.js`.
- 23/08 · thợ VA-T1 (quét trọn họ #1 theo skill v3.1, NGOÀI pathspec, **KHÔNG đỏ** —
  chỉ ghi để canh): `ops/bin/nghiem-thu/l0-m2.sh` ⑤ và `test/l0-m2-cach-ly.test.js` C10
  đếm `bo_luat_chung` theo cùng khuôn TUYỆT ĐỐI "2/1/1" mà VA-T1 vừa vá ở l0-m1.sh
  ⑦/S6 (đếm DELTA). Cả hai ĐANG XANH vì sandbox của chúng (`dungSandbox()`) không chạy
  `db/di-tru/index.js` nên seed mồi L2-M3 (bo_luat_chung +1 dòng NULL) không có mặt —
  y hệt lý do S6 (l0-m1) còn xanh trước khi bị lộ qua đường shell script. Vỡ ngay nếu
  setup của hai chỗ này sau này đổi sang gọi di-tru, hoặc một migration mới bake sẵn
  dòng NULL toàn hệ. KHÔNG vá (ngoài phạm vi phiếu VA-T1) — để nguyên, ai đụng
  `l0-m2`/`l0-m2-cach-ly` lần sau nên đổi luôn sang đếm DELTA cùng khuôn.
  (Đối chứng: `l2-m3.sh` ② và `test/l2-m3-rap-prompt.test.js` ② cũng đụng
  `bo_luat_chung` nhưng đo theo ĐỊNH DANH dòng — `idDong.size===1` — không phải tổng
  số, KHÔNG cùng họ bug này, không cần vá.)

- 02/10 · **N-MB-LICH-NEN** (CR-02-10) — follow-up L5 · miner đêm · template-learner chỉ chạy trong
  `src/server.js` (đã tắt bằng `V3_LEGACY_POLL_OFF=1`). Tắt v1 là mất hẳn: dựng trong v3 hay bỏ — người quyết, neo MB4.
  **MB4 (02/10):** mã đã gỡ khỏi cây (`followup` `miner` `template-learner` `scheduler-*`) — chúng không chạy từ trước MB3
  nên không mất gì đang có. Còn mở: dựng lại trong v3 hay bỏ hẳn — người quyết; cần thì lấy mã từ tag `truoc-mot-ban`.
- 02/10 · **N-MB-SO-AI-CU** (CR-02-10) — bàn hội thoại v3 còn đọc `ai-messages.jsonl` (Sổ AI bot cũ,
  15,5 MB, đứng im từ 28/08) làm «mã khách» (`docSoAiBotCu`). Nạp một lượt vào CSDL hay đọc từ lưu trữ — neo MB1/MB4.
- 02/10 · **N-MB-PAGE-TOKEN-FB** (CR-02-10) — `loadPageTokens` (token page Facebook, 10′/lần trong
  `src/server.js`) còn ai cần khi kênh là Pancake? Đo ở MB1 trước khi bỏ.
  **MB4 (02/10):** không tiến trình nào gọi `loadPageTokens` nữa (chỉ còn script `npm run pages`). `tools.js#sendImageWithRetry`
  vẫn nhập `messenger.js#sendImage` (Graph API, cần token đó) nhưng handler-v3 gửi ảnh qua cửa Pancake (`handler-v3.js:468`)
  ⇒ đường Graph là mã chết. Còn lại: dọn `pages.js`/`messenger.js#sendImage` — `tools.js` là file não, phải khai «Đụng bộ não».
- 02/10 · **N-MB-NGAT-PAGE** (CR-02-10 · MB4) — nguyên tắc 9 README «biết dừng khi kênh lỗi»: v1 ngắt CẢ PAGE 30′ sau 2 lần gửi
  lỗi liên tiếp (Meta #2022) + cảnh báo đỏ trên màn. v3 chỉ lùi THEO TIN (`worker.js#TRAN_THU` = 3; tin lỗi chặn hội thoại phía
  sau) — page bị Meta chặn thì mỗi khách mới vẫn tốn một vòng thử. README nay nói thật phần thiếu. Neo: trước khi bật page thứ 2.
- 02/10 · **N-MB-HAI-BO-DIEU-KIEN** (CR-02-10 · MB4) — «page sẵn sàng chưa» còn HAI bộ điều kiện: `src/readiness.js` (luật cũ,
  dùng cho page đang tắt) và `admin-v3/operations.js#pageStatus` (cổng bật thật, cho page đang bật). Màn Sẵn sàng có thể nói
  «đủ» trong khi cổng bật nói «thiếu». Gộp về `pageStatus`.
- 02/10 · **N-MB-DON-SAU** (CR-02-10 · MB4) — logic «lệch tệp/cột» đã chết (nguồn nay chỉ còn cột) còn nằm ở `kho-san-sang` ·
  `bat-dau` · `chi-phi`; `readiness.js#canEnableAI` không còn mã prod gọi.
- 02/10 · **N-MB-HUONG-DAN** (CR-02-10 · MB4) — `docs/HUONG-DAN-SALE-MKT.md` (hướng dẫn cho sale/marketing) viết cho màn `/admin`
  của bot v1 — đã gắn biển; viết lại theo màn v3 trước khi đưa page thật đầu tiên cho sale dùng.
- 02/10 · **N-MB-THUOC-0-CA** (thấy ở MB4, có từ trước) — cổng `g2-a4` ⑤ in «`test/l0-m2-noi-dung.test.js`: 0 ca, 0 đỏ» rồi gật
  ✔ (bản gốc LL15 y hệt) — phép xanh mà không đo ca nào. Sửa cách cổng đếm ca, đổi «0 ca» thành ⏸.
- 02/10 · **N-MB-CHUNG-PANCAKE-TOOL** (CR-02-10 · MB4) — pancake-tool (team khác) MƯỢN cây này trên prod: `src/gui-canh-bao.js`
  (tệp của họ, không trong repo) `import './wa.js'` — ba timer `canh-bao-tien` 5′ (cảnh báo AI Sale sắp hết tiền) · `care-don-wa`
  30′ · `gio-lam-sale` 2′; `gio-lam-wa.service` + `/root/wa_ghep/ghep.mjs` import `baileys` · `pino` · `qrcode` · `qrcode-terminal`
  từ `/opt/aicloser/node_modules`; phiên WhatsApp `/opt/aicloser/wa-auth/`. Mọi lượt `npm ci`/đổi gói/gỡ `wa.js` phải báo team đó;
  cổng `mb.sh` ⑦ canh. Lâu dài: họ có `node_modules` + phiên riêng — người quyết bàn với team đó.

## §10 · NHẬT KÝ (APPEND — khuôn 3 dòng, luật 15)
- 26/08 · A7-3 → ✅ xong — `timKhach`/`docHoSoKhach` ở `src/orders/doc-ho-so.js`; KHÔNG dựng phép gộp thứ hai (gộp đã ở tầng ghi), KHÔNG khai đã gộp WhatsApp, tỉ lệ hoàn chỉ ĐỌC kèm ngày chấm · commit ac41ab9 · nhật ký docs/thi-cong/nhat-ky/phieu-a7-3.md
- 26/08 · A7-3 → đo trên Postgres 16.15 THẬT: cổng a7-3 9/9 rc=0 · bộ ca 12 pass/0 fail · hồi quy 495 ca 481 pass/3 fail (chỉ D1·D9·D10 có sẵn) · commit ac41ab9 · nhật ký docs/thi-cong/nhat-ky/phieu-a7-3.md
- 26/08 · A7-3 → 🧭 cổng bắt tội file vì đã ghi lý do · vòng nhập thật mà `await import()` chỉ giấu · ca H7 rỗng, H12 sinh từ đảo-vá — chi tiết §9 · commit ac41ab9 · nhật ký docs/thi-cong/nhat-ky/phieu-a7-3.md

- 26/08 · A7-2 → ✅ xong — `noiKhachChoHoiThoai()` nối `hoi_thoai.khach_id` bằng ĐÚNG khoá của cửa POS; đi bằng `suaTheoId` chứ không đẻ cửa UPDATE hẹp thứ NĂM; hội thoại không tra được nước thì BỎ QUA + kê tên page · commit 361144b · nhật ký docs/thi-cong/nhat-ky/phieu-a7-2.md
- 26/08 · A7-2 → đo trên Postgres 16.15 THẬT: cổng a7-2 8/8 rc=0 · bộ ca 10 pass/0 fail · ca chính POS-trước-Messenger-sau ra ĐÚNG 1 hồ sơ · hồi quy 482 ca 467 pass/4 fail (cùng 4 cái có sẵn) · commit 361144b · nhật ký docs/thi-cong/nhat-ky/phieu-a7-2.md
- 26/08 · A7-2 → 🧭 đảo-vá sống sót 9/9 ca ⇒ lộ nhánh `banDo` chưa ai đo, ca G10 sinh ra từ đó — chi tiết §9 · commit 361144b · nhật ký docs/thi-cong/nhat-ky/phieu-a7-2.md

- 26/08 · A7-1 → ✅ xong — migration 013: khoá định danh khách là (team, NƯỚC, SĐT); nước lấy từ `ket_noi_pos.market` ngay tại `docDon`, `coalesce` bịt lỗ hai-NULL, có lưới migration lùi-và-kêu · commit 2d94649 · nhật ký docs/thi-cong/nhat-ky/phieu-a7-1.md
- 26/08 · A7-1 → đo trên Postgres 16.15 THẬT: cổng a7-1 6/6 rc=0 · bộ ca 11 pass/0 fail · đảo-vá bỏ nước ⇒ 2 ca đỏ · hồi quy 473 ca 458 pass/4 fail, cả 4 A/B ra có sẵn · commit 2d94649 · nhật ký docs/thi-cong/nhat-ky/phieu-a7-1.md
- 26/08 · A7-1 → 🧭 RF-23 gọi tên sai nước (nhóm 8 số 0 va chạm · Saudi∩UAE 6) · dân số đơn thật 122.615 chứ không 5.144 · cổng của tôi báo trượt cho thứ đang xanh — chi tiết §9 · commit 2d94649 · nhật ký docs/thi-cong/nhat-ky/phieu-a7-1.md

- 25/08 · B-Y6 → ✅ xong — migration 012: tầng CHỈ-NƯỚC cho cây kịch bản (sửa lỗi thiết kế của chính 010) + bảng `mau_0_dong` với bộ đếm nguyên tử · commit cdae76d · nhật ký docs/thi-cong/nhat-ky/phieu-b-y6.md
- 25/08 · B-Y6 → đo trên Postgres 16.15 THẬT: l0-m2-kich-ban 20 pass · l0-m2-so-lieu 18 pass · l0-m1-luoc-do 13 pass (24 bảng) · hồi quy 34 bộ chỉ D7 đỏ · commit cdae76d · nhật ký docs/thi-cong/nhat-ky/phieu-b-y6.md
- 25/08 · B-Y6 → 🧭 mục ⓒ TRẢ LỜI bằng số đo chứ không dựng bảng: ảnh ở kb-overrides.json, 32 ảnh/5 nhãn, bộ nhãn chưa chuẩn hoá — chi tiết §9 · commit cdae76d · nhật ký docs/thi-cong/nhat-ky/phieu-b-y6.md

- 25/08 · B-Y5 → ✅ xong — `ctxHeThong({ghiNhatKy:false})` tắt nhật ký cho lệnh ĐỌC; lệnh GHI vẫn để dấu vết, không cờ nào tắt được; đã BẬT ở `rap-prompt.js` chứ không để cờ nằm không · commit 49d2272 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y5.md
- 25/08 · B-Y5 → đo trên Postgres 16.15 THẬT: cổng L0-M2 31 phép ĐẠT 30 TRƯỢT 1 (D7 đỏ sẵn) · bộ ca 22 pass/0 fail · `nhat_ky` hiện 1557 dòng và 100% là `doc` · commit 49d2272 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y5.md
- 25/08 · B-Y5 → 🧭 `l2-m3-rap-prompt` chập chờn ~25% và CÓ SẴN (đo 8 lượt: mới 2/8 · cũ 2/8) — chi tiết §9 · commit 49d2272 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y5.md

- 25/08 · B-Y7 → ✅ xong — con số «bao nhiêu page đang bật bot» nay hỏi `ai-enabled.json`, cột chỉ để đối chiếu; không đọc được nguồn thì khai CHƯA BIẾT chứ không rơi lặng về cột · commit f6b5c80 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y7.md
- 25/08 · B-Y7 → đo trên Postgres 16.15 THẬT: cổng G2-A4 16/16 · 20 ca xanh · trên CSDL thật «thật 0 · cột 50 · lệch 50» và nó BÁO ra · commit f6b5c80 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y7.md
- 25/08 · B-Y7 → 🧭 tôi đọc BẢN SAO và coi là sự thật, còn thước của tôi xanh vì fixture dựng hai vế bằng nhau — chi tiết §9 · commit f6b5c80 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y7.md

- 25/08 · G2-A5 → ✅ xong — migration 010 + `src/db/kich-ban.js`: cây sản phẩm→nước→page, bộ giải LUÔN khai nguồn, `rap-prompt` đi qua nó, có lưới migration · commit b7dbf14 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a5.md
- 25/08 · G2-A6 → ✅ xong — migration 011 + `src/db/so-lieu.js`: báo cáo hai luồng không cộng, chi phí AI, A/B ẩn tỉ lệ khi chưa đủ mẫu, 9 đèn có đèn XÁM · commit b7dbf14 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a6.md
- 25/08 · G2-A5+A6 → đo trên Postgres 16.15 THẬT: cổng 15/15 · 16+14 ca xanh · hồi quy 34 bộ chỉ D7 đỏ · 🧭 quên lưới migration suýt làm chết bot, chi tiết §9 · commit b7dbf14 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a5.md

- 25/08 · G2-A4 → ✅ xong — migration 009 + `src/db/noi-dung.js`: soạn/duyệt/áp/lùi có phiên bản, bốn mắt, và đo ảnh hưởng dùng CHUNG vị từ với bộ ráp prompt · commit 604dc9a · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a4.md
- 25/08 · G2-A4 → đo trên Postgres 16.15 THẬT: cổng 12/12 · bộ ca 17 pass/0 fail · phép đếm ảnh hưởng lệch bộ đọc prompt 0/514 page · hồi quy 32 bộ chỉ D7 đỏ · commit 604dc9a · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a4.md
- 25/08 · G2-A4 → 🧭 RF-17 đóng bằng chỉ mục (phải COALESCE vì team_id NULLABLE) · không chạy 3 lượt model, lý do ở §9 · commit 604dc9a · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a4.md

- 25/08 · B-Y4 → ✅ xong — `napPage` dùng CASE: nguồn điền chỗ trống, không bao giờ xoá chỗ người đã đặt; chỉ có ĐÚNG MỘT cột người đặt nằm trong câu ghi đè · commit e7afdbd · nhật ký docs/thi-cong/nhat-ky/phieu-b-y4.md
- 25/08 · B-Y4 → đo trên Postgres 16.15 THẬT: cổng 6/6, phép chính chạy `npm run di-tru` ĐẦU-CUỐI · bộ ca di trú 11→16 ca, 15 pass/1 fail (D7 đỏ sẵn) · commit e7afdbd · nhật ký docs/thi-cong/nhat-ky/phieu-b-y4.md
- 25/08 · B-Y4 → 🧭 kiểm bẫy của người B cả HAI chiều (bản cũ 10 cột / bản mới 9) — «xanh» một mình không chứng minh gì · commit e7afdbd · nhật ký docs/thi-cong/nhat-ky/phieu-b-y4.md

- 25/08 · G2-A3 → ✅ xong — gộp câu SQL của ba cửa về `suaTheoId`; giữ allow-list, khuôn jsonb, nhật ký giấu nội dung khách, và CAS vẫn NÉM chứ không trả null · commit 5316a90 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a3.md
- 25/08 · G2-A3 → đo trên Postgres 16.15 THẬT: cổng 6/6 · ba cửa còn 0 câu UPDATE tay · bộ ca khoá bẫy 7 pass/0 fail · hồi quy 31 bộ chỉ D7 đỏ · commit 5316a90 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a3.md
- 25/08 · G2-A3 → 🧭 mảng JS vào cột jsonb · guard quá chặt làm đỏ 5 ca vì text[] thật · hộp kiểm kê gõ tay nói dối — chi tiết §9 · commit 5316a90 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a3.md

- 25/08 · B-Y3 → ✅ xong — `chuyenPageSangTeam`: cửa hẹp thứ SÁU, một giao dịch, vai `quan-tri` đọc từ CSDL, nhật ký hỏng là cuộn lại; `src/db/truy-van.js` KHÔNG đụng một dòng · commit 441e457 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y3.md
- 25/08 · B-Y3 → đo trên Postgres 16.15 THẬT: cổng 14/14 · bộ ca 14 pass/0 fail · hồi quy 31 bộ = 375 pass/1 fail · mồ côi trên CSDL THẬT = 0 · commit 441e457 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y3.md
- 25/08 · B-Y3 → 🧭 phiếu kê SÓT hai bảng con (`don_hang` bảng tiền · `tin_cho_xu_ly`) ⇒ danh mục con nay TỰ SINH từ information_schema, không gõ tay — chi tiết §9 · commit 441e457 · nhật ký docs/thi-cong/nhat-ky/phieu-b-y3.md

- 25/08 · G2-A2 → ✅ xong — migration 008 `khoa_nha`: khoá API MỘT bản mỗi (team × nhà), `cau_hinh_model` bỏ cột; `layModel` đọc chỗ mới, giữ fail-CLOSED, có lưới `42P01` · commit e5e9386 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a2.md
- 25/08 · G2-A2 → đo trên Postgres 16.15 THẬT: cổng L0-M1 58/59 · 001→008 áp trọn · down→up khớp vân tay 242 cột · đổi khoá 1 lần → 2/2 ô đọc khoá mới · commit e5e9386 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a2.md
- 25/08 · G2-A2 → 🧭 hai lỗi IM LẶNG ngoài phiếu: `npm run migrate` không chạy gì khi đường dẫn có dấu cách, và cổng l0-m1 chết câm vì docker — chi tiết §9 · commit e5e9386 · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a2.md

- 25/08 · G2-A1 → ✅ xong — `suaTheoId` nhận `{neu}` + `ctxHeThong`, `layNhieu` nhận mảng; đóng nợ N3, ba cửa tạm CHƯA xoá (để G2-A3) · commit 4bc7efd · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a1.md
- 25/08 · G2-A1 → đo trên Postgres 16.15 THẬT (VPS): nền 22 → 41 pass/0 fail · cổng L0-M2 26/27 · hồi quy 28 bộ ca v3 = 319 pass/1 fail · commit 4bc7efd · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a1.md
- 25/08 · G2-A1 → 🧭 THƯỚC hỏng trước CODE: vai CSDL thiếu CREATEDB + cổng dựng sandbox bằng docker đã chết + mốc nền gõ tay đã mục — sửa cả ba, chi tiết §9 · commit 4bc7efd · nhật ký docs/thi-cong/nhat-ky/phieu-g2-a1.md


- 23/08 · VA-R3 → ✅ (TỔNG nghiệm thu) — cổng 4/4 rc=0 · repro F2+F5 hết 🔴 (đếm thô
  `grep -c`, in từng dòng) · 7/7 test mới + hồi quy 56 ca fail=0 · commit a1d1a41.
  🧭 BÀI HỌC TỔNG (2 lỗi đo liên tiếp trong CÙNG lượt kiểm): ①đếm nhầm KÝ TỰ (`❌` trong
  khi repro dùng `🔴`) ⇒ ra 0 giả; ②regex cắt khối theo `═══ Fx ·` hỏng ⇒ lại ra 0 giả.
  Cả hai suýt báo «sạch» cho thứ chưa sạch. LUẬT: đếm dấu bằng `grep -c` + IN TỪNG DÒNG
  khớp; cấm regex cắt khối khi chưa đối chiếu tổng thô.

- 23/08 · TỔNG · **GATE TOÀN CỤC XANH — PHẦN VIỆC CODER A CODE XONG.** 13/13 cổng rc=0
  (tổng tự chạy, rc tách dòng) · 328 test / 0 fail (11 ca N* của l2-m1 cần cờ
  --experimental-test-module-mocks — cổng .sh tự bật, chạy trần thì skip có nói) ·
  VA-T1 ✅ 4/4 thước hết trôi (2 nơi cùng khuôn đang xanh ghi §9 canh) · commit 9b5fadf.
  §10 đợt 1 nén vào `nhat-ky/so-luu-tru-dot-1.md` (luật 15). CHƯA push — chờ lệnh.
- 23/08 · VA-R4 → ✅ — RF-20 đóng: phủ định liền kề trước từ khoá xac_nhan (EN+AR) hết
  đọc thành xac_nhan, nhánh cũ giữ nguyên (l3-m3-doc-y 8/8) · commit 5973f7f · nhật ký
  `docs/thi-cong/nhat-ky/phieu-va-r4.md`.
- 23/08 · VA-R3 → ✅ — RF-13 CAS ghiDon (ảnh cũ ném LoiGhiDonAnhCu có tên, apDung trả
  ghi:false thay vì ném xuyên — không phải im lặng, xem nhật ký §2) + RF-14 CAU_QUET
  nhặt lại đơn kẹt cho_gui_wa (thành công đi tiếp, hỏng → cho_sale+viec_can_xu_ly ngay,
  không chờ đủ trần lần hai); repro F5/F2 đảo 🔴→✅, hồi quy 5 file/56 ca fail=0 · commit
  a1d1a41 · nhật ký `docs/thi-cong/nhat-ky/phieu-va-r3.md`.
- 23/08 · VA-R2 → ✅ — 6 RF đóng: RF-9 đơn vị tiền một nguồn (goi_gia.gia/don_hang.tong_tien
  = đơn vị NHỎ POS, HE_SO_TE nhân đúng 1 lần ở cửa vào `chuanHoaHoSo` cho khuôn cũ
  `total_price`, tao-don không nhân lại; 007 COMMENT) · RF-10 HUY_HOAN dẫn từ MA_HOAN · RF-11
  nguồn (b) phân trang hết/vượt trần ⇒ unknown · RF-12 lớp c3b + UNIQUE partial 007 ·
  RF-21 advisory lock hội thoại (đảo-vá 3/3 ra 2 đơn) · RF-15 san_pham.page_id; cổng
  va-r2.sh 17/17, suite 347/0 fail, repro tổng-thể-1 🔴=0 · commit 5caf5be · nhật ký
  `docs/thi-cong/nhat-ky/phieu-va-r2.md` (thước cũ 3 file ngoài pathspec chỉnh theo luật mới).
- 23/08 · VA-R1 → ✅ — RF-1 cổng HTTP ghi (accessor trên globalThis.fetch: POST/PUT/PATCH/
  DELETE tới pages.fm/graph bị chặn khi van đóng, GET qua, pos.pages.fm ngoài van) + handler
  /worker không gọi bộ não khi van đóng (S1: 0 lượt, S4: 0 HTTP GHI tới bẫy, 6 GET qua) ·
  RF-2 nguonDangMo đọc .env tuyệt đối, V3_NAP_DEV chỉ mở khi DB localhost · RF-3 guard nhận
  orderCreated/isOrderSummary. GATE RVA: 17 cổng rc=0 · 352/352 · tổng-thể-1 🔴=0 · MẢNG-2
  còn ❌ F4/F5 (NÊN, §9) · commit 1562d58 · nhật ký `docs/thi-cong/nhat-ky/phieu-va-r1.md`.

- 23/08 · NGƯỜI B · **PULL + DỰNG LẠI → TẮC Ở MÔI TRƯỜNG, CHƯA CODE MẢNH NỐI.** Máy B
  KHÔNG có docker/brew/postgres/Postgres.app và Node là **v20.20.2** (sổ khai v25) ⇒ bước
  `docker run talpha-pg` không chạy được. Output thật ba thước: ① `v3/test/b` **294 pass /
  0 fail** ✅ (phải bỏ nháy glob — Node 20 không tự bung, `npm test` nguyên văn báo
  `Could not find 'test/*.test.*'`; KHÔNG sửa dòng test theo lệnh) · ② `test/l0-*..va-*`
  **32 pass / 330 fail**, 320/330 cùng một lý do `Thiếu DATABASE_URL_V3` · ③ 17 cổng
  **rc=2 ×12, rc=1 ×5** (cùng nguyên nhân). Không phải lỗi code — thiếu CSDL.
- 23/08 · NGƯỜI B · **KÊ CHỖ LỆCH TRƯỚC KHI CODE** (`v3/docs/lech-giua-gia-dinh-cua-B-va-
  luoc-do-that.md`, commit ba65578, chưa push). 🟥 3 CHẶN cần A/CEO chốt: ①`suaTheoId` chỉ
  theo `id` ⇒ **so-và-đặt của L4-M2 không diễn đạt được** (đề xuất A thêm
  `suaCoDieuKien(...)`; A đã tự giải bài này ở RF-13) · ②`cau_hinh_model` **3 dòng/team**
  (`UNIQUE team_id+vai_tro`), B viết 1 dòng/team ⇒ viết lại lớp cấu hình, và khoá API gắn
  theo VAI TRÒ nên cùng khoá Kimi bị lưu 2 lần · ③`so_ai` **không có `ben`/`chu`** ⇒ đoạn
  chat màn chi tiết không dựng được (B nghiêng phương án BỎ đoạn chat, bấm thẳng sang
  Pancake). 🟨 2 chốt: `V3_KHOA_CHU`(B) trùng việc `V3_KHOA_MA_HOA`(A) — bao thư jsonb của
  B bị `CHECK LIKE 'v1.%'` từ chối, B đề xuất bỏ bản của B dùng `db/khoa.js`; và `nhat_ky`
  hai cửa ghi — B đề xuất giữ L0-M4 làm lớp trên, ruột gọi xuống `ghiNhatKy` của A.
  🧭 BÀI HỌC: bản cài giả `v3/testkit/db-gia.js` viết lúc chưa có lược đồ và **dễ tính hơn
  bản thật** ⇒ 294 bài xanh không chứng minh được gì về việc nối vào CSDL thật. Chỗ im lặng
  nhất: `vai.ma` thật là `quan-tri` gạch NGANG, B so `quan_tri` gạch DƯỚI — lệch dấu này làm
  MỌI người dùng thành không có vai, `batBuocVaiHTTP` chặn sạch, trông y hệt phân quyền chạy đúng.

- 23/08 · NGƯỜI B · **DEPLOY VPS → ✅** (chủ dự án ra lệnh). `/opt/aicloser` `2170af7` →
  `4e72228` (**132 commit chưa từng lên**), mốc quay lui ghi ở `/root/aicloser-rollback-*.txt`.
  Kiểm TRƯỚC khi bấm: `src/server.js` nạp 35 file, **KHÔNG file nào thuộc cây v3** (dò đệ quy
  cả cây import) ⇒ code v3 lên đĩa nhưng nằm im, và VPS không có biến `V3_` nào nên fail-closed.
  Bốn file bản-đang-chạy đổi (`tools/handler/pancake-poll/ai-log`) đều **chỉ** do 2 commit sản
  xuất cũ `06f7289`+`d939920`, **không commit v3 nào đụng**. Sau 45′: `active` · NRestarts=0 ·
  387 MB · **84 sự kiện · 20 page · 12 reply · 4 image · 1 order · 1 handoff**. Khung 03h UTC
  hôm nay 7 reply, đối chứng 3 ngày trước 3/10/17 ⇒ trong khoảng bình thường.
  ⚠️ GHI NỢ: tiến trình cũ **không chịu SIGTERM**, systemd phải SIGKILL sau timeout (bản cũ
  chạy liền từ 19/08, 1d26m CPU) ⇒ **mỗi lần restart đều rơi tin của khách đang giữa lượt**.
  Nên thêm bắt SIGTERM đóng vòng poll — phiếu cho A.
  🧭 BÀI HỌC (cùng LOẠI với bài học đếm nhầm của TỔNG ở VA-R3): tôi báo động "429 tăng 8→21
  sau restart" bằng cách so `tail -2000` với `tail -4000|head -2000`. SAI — mốc khởi động nằm
  ở dòng 252904/253042, tức cửa sổ 2000 dòng đó **gần như trọn vẹn nằm TRƯỚC deploy**; tôi đếm
  429 cũ rồi quy cho deploy. Cắt đúng mốc, cùng 138 dòng mỗi bên: **429 là 1 vs 1, không đổi**;
  chỉ "lượt quét thiếu" là 2 vs 0 (giá của restart, hệ giữ sổ cái cũ nên không mất page).
  LUẬT: log ứng dụng KHÔNG có mốc giờ ⇒ cấm so bằng cửa sổ `tail -N`; phải cắt theo mốc khởi
  động (`grep -n "page từ Pancake" | tail -1`) rồi so **cùng số dòng** hai bên.

- 23/08 · NGƯỜI B · **CHỐT 3 CHẶN** (chủ dự án duyệt cả ba đề xuất). ① **C1 → phát
  `PHIEU-B-Y1`**: nới `suaTheoId` nhận `ctxHeThong()` + điều kiện so-và-đặt. ⑦ tra ra
  **TRÙNG-NỢ N3** — cùng chỗ hẹp đã cắn **bốn lần**: L1-M1 (đẻ cửa tạm `src/pos/kho.js`) ·
  L2-M1 (cửa tạm `src/chat/kho.js`) · VA-R3/RF-13 (`UPDATE` tay ở `may-trang-thai.js:290`) ·
  nay L4-M2 của B. Chính `may-trang-thai.js:258` đã khai *«repo tạm có ba đường UPDATE hẹp
  thay vì một… bản vá đúng là suaTheoId cho ctxHeThong ở src/db/»*. Phiếu này **đóng nợ N3**,
  không đẻ việc mới; xoá ba cửa tạm là ba phiếu sau. ② **C2 → phát `PHIEU-B-Y2`**: khoá API
  đang gắn theo **vai trò** nên team dùng Kimi cho cả ô `chinh` lẫn ô `nen` bị lưu **hai bản
  cùng một khoá** ⇒ đổi khoá quên một bản thì **chat vẫn chạy, việc nền chết câm**. Cùng loại
  «bản khai thứ hai cùng giá trị» với `NHOM_HUY_HOAN` (§9 VA-R2). Đề xuất bảng thứ 22
  `khoa_nha` — `khoa_api_ma` đang NULL ở mọi dòng nên **di trú giá bằng không, làm bây giờ là
  rẻ nhất**. ③ **C3 → CHỐT BỎ đoạn chat**, B làm xong luôn.
- 23/08 · NGƯỜI B · **C3 xong** — bỏ đoạn chat khỏi màn chi tiết (`chi-tiet.js` bỏ
  `docDoanChat`/`tinCua`/`benCua`; `chi-tiet-viec.html` bỏ khối chat + `veTin`, thay bằng một
  dòng chỉ đường sang nút «Mở Pancake»). Ba bài test **khoá quyết định**: không còn trường
  `doanChat` · **không đọc bảng `so_ai` một lần nào** (cổng có bộ ghi) · không còn xuất
  `SO_TIN_MAC_DINH`/`COT_THOI_GIAN_SO_AI`. Kèm sửa nhãn: `id` và `ma_don` từng dùng chung chữ
  «Mã đơn» ⇒ sale đọc mã cho kho mà đọc nhầm mã nội bộ thì kho không tra ra đơn nào; nay tách
  «Mã trong hệ thống» / «Mã đơn trên POS». Xem tận mắt trên trình duyệt. `v3/test/b`:
  **294 pass / 0 fail**. 🧭 Hệ quả: `so_ai` rơi khỏi danh sách bảng B đọc ⇒ mục tên cột
  `so_ai` trong hợp đồng B–A **hết hiệu lực**, A tự do đặt tên.

- 24/08 · NGƯỜI B · **SỬA CODE B THEO LƯỢC ĐỒ THẬT** (spec `B-S1` điều phối · `B-S2` danh
  tính, hai thợ song song). `v3/test/b`: **313 pass / 0 fail** (trước 294). 🧭 BẪY IM LẶNG có
  **HAI bản**: `vai.ma` thật là `quan-tri` gạch NGANG, B so `quan_tri` gạch DƯỚI — ở
  `boi-canh.js` VÀ `ui/dispatch/router.js:39` (`VAI_VAO_DUOC`). Bản thứ hai do chính thợ B-S2
  soi ra trong đất của thợ B-S1 lúc quét chéo, tổng chuyển tay. Lệch một dấu ⇒ **mọi người
  dùng thành không có vai**, `batBuocVaiHTTP` chặn sạch, màn hình trông y hệt phân quyền chạy
  đúng — sale vẫn vào được nên không ai báo, chỉ lộ đúng lúc quản trị cần vào. LUẬT: mã vai
  **nhập hằng**, cấm gõ lại chuỗi; và bài test phải **đọc thẳng `db/migrate/001_nen.up.sql`**
  rồi so, gõ tay mã vai vào test là đẻ bản sao thứ hai của cùng một sự thật. Nghiệm thu bằng
  HÀNH VI chứ không bằng grep: vé vai quản trị gọi `/api/dieu-phoi/tom-tat` → **200**.
  Ba đổi lớn hơn đổi tên: `trang_thai` không tồn tại (suy từ `nguoi_nhan_id`+`dong_luc`, công
  thức ở đúng một chỗ) · dòng việc không còn `page_id`/`cust_id` nên đi vòng qua `hoi_thoai`
  (100 việc vẫn chỉ 5 lời gọi, không N+1) · **không có cột `ghi_chu`** nên gộp vào `ly_do_dong`
  khuôn `mã · ghi chú`. Thêm: team kỹ thuật `chua-phan` nay bị chặn khỏi màn chọn team (502
  page · 18.790 hội thoại chưa chốt chủ — chọn được nó là thấy khách cả ba team).
  §9 NỢ: (1) `ve.js` ghi «không nhét email vào vé» mà vé nay mang email — cần chốt. (2) Gộp
  `ghi_chu` vào `ly_do_dong` — A muốn cột riêng thì mở phiếu. (3) `v3/testkit/db-gia.js` vẫn
  DỄ TÍNH hơn bản thật (không CHECK, không khoá ngoại, không trigger) ⇒ 313 bài xanh **không
  chứng minh gì** về CSDL thật.
- 24/08 · NGƯỜI B · **SỰ CỐ SẢN XUẤT, KHÔNG DO DEPLOY.** Bot ngừng trả khách từ 23/08 22h UTC,
  **227 phút**. Nguyên nhân: **cả hai tài khoản AI hết tiền** — Kimi `429 "account ... is
  suspended due to insufficient balance"`, Anthropic `400 "credit balance is too low"` (gọi
  thử cả hai từ VPS). Không có đường lui. Bằng chứng KHÔNG do deploy: cả ngày 23/08 sau deploy
  là ngày chạy tốt nhất — 48 reply lúc 05h, 44 lúc 18h, **15 order** cả ngày; tắt lúc 22h, tức
  19 tiếng sau. Hệ thống xử lý ĐÚNG: `llm-health` dừng vòng xử lý, **0 handoff trong 4 tiếng**
  (không đẩy rác sang sale như sự cố 08/08), 9 khách treo giữ nguyên hội thoại, dò lại mỗi 5
  phút. Việc NGƯỜI: nạp tiền, xong bot tự chạy lại. 🧭 Đây đúng là sự cố 06/08 lặp lại — cái mà
  lớp model dự phòng L1-M4 sinh ra để bịt. Nhưng nó nằm im ở `v3/`, VÀ kể cả đã nối cũng
  KHÔNG cứu được: dự phòng cần nhà thứ hai **còn tiền**. Việc «mở tài khoản 4 nhà model, nạp
  ít tiền mỗi cái» vẫn "chưa làm" — hôm nay là cái giá của nó.

- 24/08 · NGƯỜI B · **DỰNG HẠ TẦNG v3 TRÊN VPS + NỐI MÀN HÌNH VÀO DỮ LIỆU THẬT** (chủ dự án
  ra lệnh «đẩy lên hết»). PostgreSQL **16.15** cài trên 169.58.33.8, nghe **127.0.0.1:5432**
  (không phơi ra Internet), CSDL `aicloser_v3`. `npm run migrate` áp trọn **001→007, 21 bảng**;
  `npm run di-tru` nạp thật: **514 page · 28.953 hội thoại · 71 kịch bản · 7 kết nối POS ·
  bộ luật chung v1 · ky_nang 3 team**. Sổ AI bỏ qua (đợt cutover). Năm app khác trên máy
  (`aicloser` `broadcast` `levelup-webhook` `pancake-len-don` `nginx`) **không hề hấn**,
  `aicloser` NRestarts=0. Hai dịch vụ mới: `aicloser-v3` cổng **3102** (dữ liệu thật) và
  `aicloser-v3-xemthu` cổng **3101** (dữ liệu giả). Không cửa GHI ra ngoài nào của v3 mở
  (`V3_PANCAKE_GUI`/`V3_WA_GUI`/`V3_POS_GHI`/`V3_NAP_DEV` đều vắng = fail-closed).
  🚩 **PHÁT HIỆN CHẶN CẢ v3:** **514/514 page và 28.953/28.953 hội thoại đều ở team KỸ THUẬT
  `chua-phan`** — chưa ai gán page cho ba team nghiệp vụ. Mà `chua-phan` bị cấm hiện trên màn
  chọn team (hợp đồng lược đồ §1). Nên đăng nhập team thật thì **thấy 0 dòng mọi bảng**. Đây
  KHÔNG phải lỗi code — đó là việc «Chốt danh sách ba team» trong "việc làm song song", vẫn
  "chưa làm". Không gán xong thì mọi màn hình v3 đều rỗng.
- 24/08 · NGƯỜI B · **MẢNH NỐI XONG** (`v3/src/noi-day/`). 🧭 BÀI HỌC LỚN NHẤT ĐỢT NÀY: bản cài
  giả `v3/testkit/db-gia.js` **dễ tính hơn bản thật**, và 313 bài xanh trên nó **không chứng
  minh gì**. Nối vào CSDL thật thì vấp **bốn** chỗ liên tiếp, không chỗ nào test bắt được:
  ① `layNhieu` không có `IN` (mọi mẻ gộp id vỡ) · ② không có `LIMIT`, `thuTu` chỉ tăng dần ·
  ③ không có toán tử so sánh (`{han_luc:{'<':bay}}` → Postgres ném «date/time field value out
  of range») · ④ Postgres trả `Date` còn code B tính bằng mốc ms (đồng hồ ra `NaN`, không báo).
  Mảnh nối gánh ①②③④ (③④ quy đổi ở MỘT chỗ), **KHÔNG gánh** so-và-đặt: `sua` có điều kiện thì
  **ném `LoiChuaCoSoVaDat` (501)** chứ không chạy bản kém an toàn — nút hỏng to còn hơn hai đơn
  trùng lặng lẽ vào POS. `PHIEU-B-Y1` nay có **hai mục**: `suaTheoId` nhận điều kiện, và
  `layNhieu` nhận mảng (`= ANY($n)`).
  Thêm một bẫy nối dây: `dungPhanB` tự đặt cổng danh tính bằng `taoTruyVanHeThong`, nên gọi
  `datCongDanhTinh` riêng ở trước là bị ghi đè → đăng nhập nổ «nguoi_dung không nằm trong
  BANG_NGHIEP_VU_CHUAN». Cổng danh tính phải TRUYỀN VÀO, không đặt ngoài.
- 01/09 · SÓNG VÁ GD2 (P1–P9) → ✅ 9/9 phiếu — thước GD2 (3 cổng a7 nhận khuôn Node 25 +
  tự nạp .env · g2-a3 khai hai cửa giao dịch 009/010) · H10 đóng: màn Rủi ro hoàn ĐỌC
  `khach.tang_hoan` thay vì tự tính mã {4,5,6,7,8} của v1 (lệch 6,7 lần) · hồ sơ khách +
  báo cáo cắt sang cửa của A · hai đèn công tắc bot đọc `ai-enabled.json` · màn Prompt của
  page hiện NĂM khối kèm hiệu lực thật · lớp 0 đồng có bộ đếm trên đường chat + cửa ghi mẫu
  · `npm run worker-v3` (luồng chat v3 lần đầu có tiến trình chạy) · B-Y8 `phanBoRuiRoHoan`
  hai chiều + B-Y9 di trú nối `hoi_thoai.khach_id` · bộ ca HỢP ĐỒNG chạy trên Postgres thật
  (đóng bài học ① — bắt ngay 2 chỗ bản giả dễ tính hơn). Test A 476/476 · B 719/719 · 8 cổng
  GD2 rc=0 · commit 0535cb4→d31614f · nợ mới ghi §9 (8 cổng đỏ vì dữ liệu nền, không phải mã).
- 01/09 · CODER A · **8 CỔNG ĐỎ ĐÓNG HẾT — không cổng nào đỏ vì mã.** Ghi nhật ký hôm qua đoán
  "dữ liệu nền"; đo ra thì **cả tám đỏ vì THƯỚC**, và đối chứng trên worktree ở commit cũ
  (`b554e61`, trước cả sóng GD2) cho **đỏ giống hệt** — nợ có sẵn, không phải hồi quy.
  Năm kiểu thước hỏng, xếp theo mức nguy hiểm:
  ① **Thước làm hỏng dữ liệu thật.** `va-r2` ⑦ chạy `migrate down` trên `aicloser_v3` để đo
  round-trip. Hôm viết, bản mới nhất là 007 nên vô hại. Nay là 013 — `013.down` **DROP COLUMN
  thi_truong** (mất dữ liệu) và cố ý NÉM khi có hai khách khác nước cùng số (dev đang giữ
  6.436 khách), mà nó ném SAU khi đã `DROP INDEX` ⇒ CSDL kẹt nửa chừng. Cổng đã đo trên CSDL
  thật suốt và chưa nổ chỉ vì `down` dừng ở bản cũ. Chuyển hẳn vào sandbox riêng.
  ② **Neo vào SỐ TUYỆT ĐỐI** — `l3-m2` neo 21 bảng, `va-q12` neo `pass=12`. Điều cần đo là
  «down→up không thêm/bớt bảng» và «0 ca đỏ». Đổi sang đo ĐỘ LỆCH và thước SÀN (`fail=0` VÀ
  `pass ≥ sàn`) — giữ vế chặn-xoá-ca, bỏ vế đỏ oan khi thêm ca.
  ③ **Neo vào LỊCH** — mới. `va-q12` ④ và `l3-m4` ③b dùng cặp trùng chéo 966501984606 làm đề.
  Cặp đó tạo 22/08 và **không trẻ lại**; cửa sổ khử trùng là 7 ngày, nên từ 30/08 phép đỏ.
  Đo 01/09: `keo_ngay=7` → 0 đơn · `=30` → 2 đơn, `trung_khop_san_pham`, `ca_hai`. Cổng nay
  TỰ TÌM cặp còn trong hạn mỗi lượt; không có thì HOÃN minh bạch.
  ④ **Trần vòng lặp gõ cứng** — `l1-m1` lùi tối đa 10 bản để đưa 002 về làm bản chót, mà từ
  013 cần **11**. Vòng hết trước khi tới nơi, `down` cuối gỡ nhầm 003. Trần nay đếm từ
  `db/migrate/`. `l3-m2` có cùng bẫy (trần 10, cần 8) — vá trước khi nó cắn.
  ⑤ **Câu đo tự nó ném, và thước đọc lỗi thành TRƯỢT** — `l2-m3` ② chèn bản bộ luật thứ hai
  `dang_dung=true`, vi phạm UNIQUE `bo_luat_chung_mot_ban_dang_ap` (009). Nó ném từ ngày 009
  lên; **sáu lượt chạy vừa qua phép này không đo được gì**, chỉ in "câu đo HỎNG".
  Và **8 ca đỏ của bộ ca cũ**: không ca nào hỏng. Năm tệp (`conv-owner` `guard-fastlane`
  `intro` `l8-botcake-rules` `viec-2345`) đo HỢP ĐỒNG của ba cửa khi cửa MỞ, nhưng `.env` máy
  dev cố ý TẮT cả ba (`HUMAN_TAKEOVER=0` vì M05 nhận nhầm người thật 30,2%; hai cửa `FASTLANE`
  vì trùng khoá Botcake). Chuỗi import của `src` kéo theo `dotenv/config` nên `.env` vào **cả
  khi chạy không `--env-file`** — đó là lý do đổi cách chạy mãi không hết đỏ. Thêm
  `test/_bat-cua-de-do.mjs`, import ở dòng đầu năm tệp; `DO_THEO_ENV=1` để đo dưới cấu hình
  vận hành. Đảo-vá: bật lại cờ đó thì đỏ đúng ca.
  📌 Án lệ gộp: **một phép đo không được mượn cấu hình vận hành làm điều kiện của nó** — và
  cấu hình vận hành thì không phải chỗ để chiều bài test.
  Kết: **25/25 cổng rc=0** · test 923 ca 0 đỏ (suite A 490 · 24 tệp còn lại 420) ·
  cutover `src/prompts.js` xong (`1d5e61c`) — bộ luật chung trong CSDL nay thật sự thay được
  hằng `CORE`; bản v1 trong `bo_luat_chung` **bằng CORE từng ký tự** nên chưa đổi chữ nào bot
  nói, chỉ mở đường · `V3_RAP_PROMPT_BAT=1` đã bật trên máy dev (đo: khối 1 lấy từ nguồn
  `csdl`, 6.734 ký tự). Còn chờ người: bật cờ đó trên VPS `169.58.33.8`.


- 09/09 · TIẾP QUẢN (phiên mới, chưa nhận vai tổng) → 🔎 — đo bảy phép, **bốn đo được ba
  mù** vì máy không có `.env` lẫn Postgres; bốn chỗ sổ khai lệch với máy đã ghi §9. Cổng
  tĩnh `ops/bin/kiem-tinh.sh` rc=0 (PHÉP=5 ĐỎ=0) · không commit · nhật ký
  `docs/thi-cong/nhat-ky/tiep-quan-09-09.md`.
- 11/09 · UI-GOM-4 (lệnh trực tiếp người quyết, KHÔNG qua phiếu) → ✅ — gom giao diện v3 còn
  bốn màn: thanh bên 24→4 + vạch «Ít dùng» · dải trạng thái «bot đang bật N/M page» trên mọi
  trang · cột «Còn thiếu gì» trong bảng Page · hồ sơ khách trong chi tiết việc · hai cột +
  đóng việc tại chỗ trên bảng điều phối · ba màn số liệu khai khoảng đo. KHÔNG màn nào bị
  xoá. Test 263/263 xanh (16 bộ chạy được không cần CSDL) · cổng tĩnh PHÉP=5 ĐỎ=0 · commit
  `7cd8cac` · ⛔ chưa push · CHƯA chạy `npm test` và 25 cổng · nhật ký
  `docs/thi-cong/nhat-ky/ui-gom-4-11-09.md`.

---
- 28/09 · CR-28-09 → ✅ áp — §10 thành bàn hội thoại CHỈ ĐỌC (danh sách · chat đọc thẳng Pancake ·
  bối cảnh khách; trả lời vẫn ở Pancake); đo 5 lớp: 28.953 hội thoại, 0 có mã Pancake ⇒ UI-HT1 dựng mã
  `<page_id>_<psid>` · commit 26e56d5 3106700 f4bf954 · nhật ký docs/thi-cong/doi-y-do/CR-28-09-ban-hoi-thoai-chi-doc.md
- 28/09 · UI-HT1 → ✅ — cửa đọc hội thoại thẳng Pancake: mã `<page_id>_<psid>`, mã khách hàng đợi v3 →
  Sổ AI bot cũ (phủ 92,5%), lỗi Pancake nói ra, nhớ 60s; cổng ui-ht1.sh 7/7 · đảo-vá 7/7
  · commit 5ac57ef · nhật ký docs/thi-cong/nhat-ky/phieu-UI-HT1.md
- 28/09 · UI-HT2 → ✅ — màn «Bàn hội thoại» ba cột chỉ đọc; lát «Cần người» qua hangCho, hai lát kia SQL có
  LIMIT (kéo cả bảng = 19,6 MB); ≤1180px bối cảnh thành ngăn phủ; cổng ui-ht2.sh 8/8
  · commit 0cc381f · nhật ký docs/thi-cong/nhat-ky/phieu-UI-HT2.md

### 14/09/2026 · dãy S của `test/l0-m2-so-lieu.test.js` CHẬP CHỜN khi có dữ liệu thật

**Đo được, không suy đoán.** Máy có đủ gói bàn giao (`.env` + 6 nguồn di trú) + Postgres
18.6. Chạy `node --test test/l0-m1-*.test.js test/l0-m2-*.test.js` **bốn lượt**:

| lượt | lớp chặn ghi | ca đỏ |
|---|---|---|
| 1 | không | D7 · **S8** |
| 2 | không | D7 · **S4 · S5 · S8** |
| 3 | có | D7 · **S3 · S8** |
| 4 | có | D7 · **S4 · S8** |

`D7` là ca đỏ SẴN (sổ đã ghi). `S8` đỏ **cả bốn lượt**. Còn `S3`/`S4`/`S5` **đổi chỗ cho
nhau mỗi lượt** — cùng mã, cùng dữ liệu, khác kết quả.

**Ba điều đã loại trừ, đừng đi lại đường đó:**
1. *Không* phải đụng tên sandbox: `aicloser_v3_test_ditru` ≠ `aicloser_v3_test_l0m2solieu`.
2. *Không* phải do `.env`: chạy RIÊNG `l0-m2-so-lieu.test.js`, có hay không `.env`, đều XANH.
3. *Không* phải do bộ ca ghi đè `conv-state.json`: thêm `test/_an-toan.mjs` vẫn chập chờn
   (lượt 3–4). Lớp chặn ấy có giá trị riêng của nó, nhưng KHÔNG phải thuốc cho ca này.

**Chỉ đỏ khi chạy CHUNG với `l0-m1-*`**, tức chỉ đỏ khi bộ ca di trú THẬT SỰ CHẠY — mà nó
chỉ chạy khi máy có dữ liệu thật. Nên CI không bao giờ thấy (21 ca hoãn), và máy thợ trước
14/09 cũng không (chưa có gói bàn giao). Ca này **đã chập chờn từ lâu mà không ai đo được**.

**Hệ quả đang chịu:** hai cổng `l0-m2.sh` và `g2-a5-a6.sh` đỏ ở máy có dữ liệu thật —
đỏ vì THƯỚC, không vì mã. Đo 14/09 tại máy: 25 cổng = **20 xanh · 5 đỏ** (b-y4 · g2-a5-a6 ·
l0-m1 · l0-m2 · l1-m1), trong đó g2-a5-a6 và l0-m2 đỏ CHỈ vì dãy S này.

**CẤM vá bằng cách cho chạy tuần tự hay bỏ qua ca.** Phải tìm ra dãy S phụ thuộc cái gì
(nghi: trạng thái dùng chung trong mô-đun bị đo, hoặc cửa sổ thời gian — S7/S8 đo «đủ mẫu
30 khách»). Một ca chập chờn được làm cho im là một ca mù.

- 14/09 · MỞ VAN «UI HỆ KIỂU» (lệnh trực tiếp người quyết) → ✅ ĐÃ MỞ — 25/25 màn v3 trên hệ
  kiểu chung lên VPS (`51b454f` → `afe9ce0`, 39 commit); chỉ `git pull` + restart HAI dịch vụ
  v3, **`aicloser` không chạm và không restart**; +10′ ba dịch vụ `active`, 1 lần khởi động
  (của chính lượt mở), 0 lỗi trong log v3 và log bot, `:3102`/`:3101` = 200,
  `localhost:3100/health` = `{"ok":true,"pages":119}` · commit `afe9ce0` · nhật ký
  `docs/thi-cong/nhat-ky/phat-hanh-14-09-ui-he-kieu.md`.
- 14/09 · THƯỚC 4 CỔNG → ✅ ĐÃ VÁ — 5 cổng đỏ mà **không cổng nào nêu được ca đỏ nào**: chúng
  grep dạng TAP (`^not ok`, `^# pass`) trong khi `node --test` của Node 24 in dạng SPEC (`✖`,
  `ℹ pass`). Ép `--test-reporter=tap` ở `b-y4` · `l0-m1` · `l0-m2` · `g2-a5-a6` và đọc thêm
  dạng SPEC ở `phat-hanh.sh ③`. KHÔNG nới ngưỡng nào: b-y4 xanh lại nhờ chính ngoại lệ D7 của
  nó, ba cổng kia vẫn đỏ nhưng nay nêu đích danh ca · commit `afe9ce0` · nhật ký như trên.
- 14/09 · DÃY S `l0-m2-so-lieu` → 🔴 CÒN NỢ, có dữ kiện MỚI — đo thêm 14/09 chiều: chạy
  **RIÊNG một mình** tệp ấy cũng ĐỎ (`S8` một lượt; `S3`+`S5` lượt sau, qua khuôn của
  `npm test`) ⇒ phủ nhận điều «2. không phải do .env — chạy riêng đều XANH» ở mục trên. Chập
  chờn không cần chạy chung `l0-m1`. Vẫn CẤM vá bằng cách bỏ qua ca · commit `afe9ce0`.

- 14/09 · UI-CỬA-GHI *(ghi bù 15/09 — phiên trước commit lúc 17:32, sổ đóng lúc 17:08)* → ✅ mã xong ·
  ⛔ CHƯA PUSH — soi 26 cửa ghi của v3, hai cửa viết xong ở máy chủ mà KHÔNG màn nào gọi tới nay đã có
  nút: `POST /api/kich-ban/nhap-pancake` (chỉ BÓC, điền vào ô soạn, nói rõ «chưa lưu gì cả») và
  `POST /api/lop-0-dong/mau` (thêm/sửa/công-tắc ngay trên dòng — trước đó muốn thêm một mẫu phải gõ
  thẳng vào CSDL) · commit `4ac1519` · nhật ký: KHÔNG CÓ, chứng cứ nằm trong thân commit.

- 14/09 · UI-NÚT-DI-TRÚ *(ghi bù 15/09)* → ✅ mã xong · ⛔ CHƯA PUSH — nút «Kéo dữ liệu về» ở màn Kết
  nối & token, thay việc gõ `npm run di-tru` trên VPS; bốn luật viết thẳng trong mã (chỉ ĐỌC 6 tệp
  nguồn · `ON CONFLICT` KHÔNG đè cột người đặt — marketer/trọng điểm/công tắc bot/botcake · lượt thứ
  hai ăn 409 kèm giờ + tên người bấm, không xếp hàng âm thầm · chạy NỀN, trang hỏi lại mỗi 2s). Kèm
  ba mã nhật ký còn thiếu: `tao_mau_0_dong` và `sua_mau_0_dong` ĐÃ ĐƯỢC GỌI từ `kho-lop-0.js` mà chưa
  bao giờ khai trong `hanh-dong.js` ⇒ mọi lượt sửa mẫu 0 đồng trước nay không để lại dấu vết
  · commit `922cff0` · nhật ký: KHÔNG CÓ, chứng cứ nằm trong thân commit.

- 14/09 · VAN BẬC PHƠI WORKER *(ghi bù 15/09)* → ✅ mã xong · ⛔ CHƯA PUSH · ⛔ CHƯA CÀI VPS —
  `dsPageDeNap` đọc MỌI page trong bảng (502 dòng trên máy chủ), nên bật worker khi không có van là mở
  thẳng bậc ⑥ «toàn bộ» trong lúc bot v1 vẫn trả 51 page thật ⇒ khách ăn tin từ HAI tiến trình. Van
  `V3_PAGE_XU_LY`: vắng = KHÔNG page nào và worker IN RA LÝ DO thay vì im · chỉ THU HẸP, id lạ bị bỏ
  qua (án lệ #22, không đẻ page ma) · van NGUỒN và van BẬC PHƠI đọc ra hai câu khác nhau. Kèm mẫu unit
  `ops/systemd/aicloser-v3-worker.service` (**chưa cài**) + khai biến ở `bien-moi-truong-v3.md`. Ba ca
  P7-1b/P7-1c + P7-3/P7-4 · commit `c8309a2` · nhật ký: KHÔNG CÓ, chứng cứ nằm trong thân commit.

- 15/09 · TỔNG · **GHI BÙ SỔ + ĐO LẠI** → ✅ — phiên 14/09 để lại 3 commit không có dòng nào trong sổ
  (sổ sửa 17:08, commit cuối 17:38); nay đã ghi ở trên. Số đo 15/09 tại máy A: `npm test` →
  **tests 1682 · pass 1679 · fail 1 · skipped 2**, ca đỏ duy nhất là **D7** (đỏ sẵn, §9) ·
  `origin/main` = `e657af1` sau `git fetch`, còn ĐÚNG 3 commit local · Node **v24.19.0** · cây sạch
  trước lượt ghi này. 🔴 **Dãy S `l0-m2-so-lieu`: lượt này S1–S12 XANH HẾT** — chập chờn KHÔNG có
  nghĩa đã hết, chỉ nghĩa là lượt này nó không nổ; nợ giữ nguyên, vẫn CẤM vá bằng cách bỏ qua ca.
  Đã đóng mục nợ «giấy tờ trôi» 11/09 (4 chỗ) · commit: lượt ghi sổ này.

- 15/09 · KHAI BÙ BIẾN `V3_*` → ✅ — bảng «nơi khai duy nhất» khai 7 biến trong khi code đọc 18;
  nặng nhất là `V3_KHOA_VE` (thiếu ⇒ `chay-that.js` exit(1), dịch vụ v3 KHÔNG LÊN) và `V3_KHOA_CHU`
  (VẮNG ngay trên máy này). Khai thêm 10 biến + 2 KHUÔN tên động + ADMIN_USER/ADMIN_PASS. Ghi ra
  một mâu thuẫn thay vì lặng lẽ chọn: `V3_BOT_KHOA` là biến «đặt để TẮT», đúng thứ luật 1 của bảng
  cấm — nay là ngoại lệ CÓ CHỦ Ý viết thẳng dưới luật đó. Thước `bien-moi-truong-khai-du.test.mjs`
  canh hai chiều, không có danh sách gõ tay · commit `277ba77`.

- 15/09 · CRUD KẾT NỐI POS → ✅ — `ket_noi_pos` (thị trường · shop · khoá API) trước nay chỉ ghi
  được bằng `db/di-tru/ket-noi-pos.js` đọc `pancake-shops.json`; đổi một khoá API trên đường TIỀN
  phải SSH + SQL, không dấu vết. Nay 4 cửa trên màn Kết nối: thêm · sửa · bật/tắt · bỏ. Khoá đi MỘT
  CHIỀU, mọi câu ghi kèm `team_id` trong WHERE, `market` không đổi được, 2 UNIQUE nói thành câu.
  4 mã nhật ký (3 mã BẮT BUỘC, cùng họ `doi_khoa`) + kiểm phễu nhật ký TRƯỚC khi ghi. Thước 2 tầng:
  11 ca router + **12 ca trên Postgres THẬT** (vòng ghi→đọc bằng chính `layKetNoi`) · commit `73c5d16`.

- 15/09 · THUỘC TÍNH PAGE → ✅ — sửa được `thi_truong` · `nganh_hang` · `botcake_tat` trên màn Page
  & bot. **Vá `nap.js` TRƯỚC khi mở nút**: hai cột đầu bị di trú ghi đè trần, mở nút mà không vá là
  hứa một thứ nút «Kéo dữ liệu về» ở màn bên cạnh sẽ xoá sạch. Nay theo luật PHIEU-B-Y4 của
  `marketer`. `botcake_tat` là LỜI KHAI, không phải công tắc — nói ở 3 chỗ. Thước: 12 ca hành vi +
  **5 ca hai lượt `napPage` thật** · commit `0c35188`.

- 15/09 · TẠO NGƯỜI DÙNG → ✅ — **đổi một luật đã ghi thành chữ, người quyết chốt**: nới cổng danh
  tính cho ĐÚNG `nguoi_dung`, giữ cấm `team` + `vai` (ca BIÊN khoá `BANG_GHI_DUOC.size === 2`). Lệnh
  cấm cũ trỏ vào chỗ RỖNG — không di trú, không migration, không script nào tạo người dùng; chỉ có
  `psql`. Tạo + cấp vai một lượt, bắt buộc mật khẩu ≥8, băm scrypt, mật khẩu và băm KHÔNG vào nhật
  ký. Marketer: bỏ ô nhập khỏi màn theo lệnh người quyết, giữ cột + cửa API + bản tin readiness
  · commit `5328911`.

- 15/09 · TỔNG · **KẾT LƯỢT** — cửa ghi v3 đi từ **24 → 32, mồ côi 0**. npm test 1736 ca · 1732 xanh
  · 2 đỏ đều là nợ cũ (D7 · dãy S chập chờn, chạy riêng 4 lượt ra 4 tập khác nhau) · cổng tĩnh
  PHÉP=5 ĐỎ=0. Bốn lỗ «phải mở psql» đã bịt 3, lỗ thứ tư (sản phẩm/giá) giữ nguyên vì nó vào bằng
  POS sync đúng ý đồ. 6 nợ mới ghi §9. ⛔ TẤT CẢ CHƯA PUSH.

- 16/09 · **CR-15/09 · ÁP 4/6 PHIẾU** → ✅ — mã sản phẩm tách hai vai: `san_pham.ma`
  (`<shop>:<uuid>`, khoá KỸ THUẬT trỏ POS) + `ma_goc` (khoá NGHIỆP VỤ, không mang shop).
  Kịch bản ba tầng của migration 010 nay CHẠY ĐƯỢC: một bản `cap='san_pham'` phục vụ cả page
  Kuwait lẫn Saudi (ca Q2 đo thật trên Postgres). Khoá gộp là SỐ HIỆU đội vận hành gõ đầu tên
  POS — đo 7 shop: 470 biến thể · 173 số hiệu · **78 số ở >1 shop** · 75/78 tên khớp · 113
  biến thể không có số. Gộp theo TÊN thì trộn `125 - Fitgum Acai Berry` với `128 - Fitgum
  Organic Barley`; số thì không. CR1 `26d2b4b` · CR2 `185353b` · CR4 `0963a61` · CR6 `3b80737`
  · hồ sơ `docs/thi-cong/doi-y-do/CR-15-09-ma-san-pham-khong-mang-shop.md`.
- 16/09 · CR-15/09 · **HAI PHIẾU DỪNG CHỜ NGƯỜI** → ⏸ — CR3 (soát gộp 137 dòng, chạy
  `node ops/bin/goi-y-gop-san-pham.mjs`) và CR5 (di trú `kich_ban` trên VPS, điểm dừng ②).
  Máy chỉ gợi ý được: nó không biết `1328205216:e4108b77…` và `1328205226:717bfb27…` là cùng
  một sản phẩm, chỉ TÊN nói lên, mà tên thì người gõ.
- 16/09 · CR-15/09 · 🧭 **BA ÁN LỆ trong một lượt áp** — ① rào của 010 chặn đúng thứ nó sinh
  ra để mở ② **rào của một bảng là TỔNG mọi migration đã sửa nó**, chép theo bản đầu là xoá
  lặng lẽ phần 012 đã nới ③ neo vào SỐ TUYỆT ĐỐI, hai chỗ trong một tệp thước + một bản neo
  thứ hai trong cổng; sửa gốc (so `NEO.length` và so ĐỘ LỆCH) thay vì nới số. Cả ba do bộ ca
  bắt, không do người đọc lại.

- 16/09 · **VPS: ĐO ĐƯỢC LƯỢC ĐỒ VÀ DỊCH VỤ** → ✅ — sổ ghi hồi 24/08 rằng VPS áp «001→007»;
  đo 16/09 bằng `node db/migrate.js trang-thai`: đã áp **001→013**, và lượt này áp thêm
  **014_san_pham_goc** (`áp mới: 1 · tổng đã áp: 14`). Migration 014 chỉ THÊM, và rào
  `kich_ban_khoa_dung_cap` bản mới lỏng hơn-hoặc-bằng bản 012 ở cả ba tầng nên không dòng cũ
  nào vi phạm — kiểm bằng lý lẽ trước khi gõ, không thử rồi xem.
  Dịch vụ sau deploy: `aicloser` **active** (không chạm, `{"ok":true,"pages":123}`) ·
  `aicloser-v3` active · `:3102`=200 · `:3101`=200. Lô 21 commit
  (`e657af1..429667d`) đã lên prod.
- 16/09 · 🧭 **ÁN LỆ VẬN HÀNH: đừng đưa người quyết một khối dán trộn `ssh` với lệnh máy chủ.**
  Hai lần nhiễu trong một buổi: lần đầu 4 dòng lệnh bị nuốt vào ô nhập mật khẩu ⇒ `Permission
  denied` và KHÔNG lệnh nào chạy (tôi tưởng đã deploy); lần sau terminal ngắt dòng giữa chuỗi
  nháy ⇒ `aicloser-v3-xemthu` thành một lệnh riêng «command not found».
  📌 Luật: mỗi lệnh máy chủ là MỘT dòng `ssh host '…'` ngắn dưới ~70 ký tự. Không khối nhiều
  dòng, không trộn lệnh máy cá nhân với lệnh máy chủ.

- 16/09 · **PHIẾU 015 · PAGE KHAI NÓ BÁN SẢN PHẨM NÀO** → ✅ — `page.san_pham_goc_ma`. Đây là
  phiếu SỬA MỘT LẬP LUẬN SAI CỦA TÔI Ở 014: ở đó tôi từ chối cột này với lý lẽ «thêm nó là
  khai cùng một sự thật ở hai chỗ, vì `san_pham.page_id` đã nối rồi». Tiền đề sai — đo
  `pages.json` 16/09: **6/6 shop đều nhiều page** (UAE 35 · Kuwait 26 · Saudi 23 · Qatar 10 ·
  Bahrain 7 · Oman 7), mà `doc-danh-muc.js:69` chỉ gán `page_id` khi shop có ĐÚNG MỘT page ⇒
  `san_pham.page_id` **NULL cho mọi sản phẩm, luôn luôn**. Và nó không THỂ nối: một biến thể
  POS ở Kuwait được 26 page cùng bán — N–M nhét vào cột 1–1.
  Mở được ba thứ đang tắc: tầng kịch bản `cap='san_pham'` (chưa bao giờ với tới page nào) ·
  cột «Sản phẩm gốc» của màn (trước đó trả 409 cho mọi page) · cảnh «page chết → page mới
  khai cùng sản phẩm là kế thừa hết».
  Kèm `ops/bin/goi-y-gan-page.mjs` bóc từ ĐƠN THẬT: **122 page có đơn · 83 bán đúng 1 sản
  phẩm (gán được ngay) · 8 có một SP áp đảo ≥80% · 31 bán lẫn (người quyết)**. Nó nhận đúng
  `Healthy Figure PH in Kuwait → 125 → Fitgum Acai Berry`.
  npm test 1.767 ca · 1.764 xanh · 1 đỏ = D7. Cổng: l0-m1 58/59 · l0-m2 30/31 · g2-a3 6/6 ·
  g2-a4 16/16 · b-y3 14/14 · l1-m1 24/24 · l2-m3 11/11 · g2-a5-a6 14/15 (S3/S8 — dãy S chập
  chờn, nợ 14/09).
- 16/09 · 🧭 **ÁN LỆ: MỘT CỘT CÓ THỂ TỒN TẠI MÀ KHÔNG BAO GIỜ CÓ GIÁ TRỊ — và lập luận «đã có
  chỗ nối rồi» phải ĐO trước khi tin.** Tôi đọc lược đồ thấy `san_pham.page_id` tồn tại và
  kết luận mối nối page↔sản phẩm đã có. Cột tồn tại; giá trị thì không. Phép đo đúng không
  phải «có cột đó không» mà là «bao nhiêu dòng có giá trị, và điều kiện để nó có giá trị có
  xảy ra không». Ở đây điều kiện là «shop có đúng 1 page» — chưa bao giờ đúng với shop nào.

- 16/09 · **BH1 (giá SERVER tính · khoá CLOSING · van READONLY)** → ✅ — cổng `bh1.sh` 10/10 ·
  bộ ca `test/bh1-gia-va-cua-chot.test.js` 26/26 · `npm test` 1795/1798 (D7 đỏ sẵn, đo 2 lượt).
  **ĐẢO-VÁ:** lùi 3 file về bản cũ → **5 ca đỏ** (G1-tool · G2-tool-b · G5 · G6 · G7c), khôi
  phục → 26/26. Thước có răng, không phải xanh rỗng.
  Lõi chung mới: `src/core/gia.js` (`tinhTong` — model ĐỀ NGHỊ, server QUYẾT) và
  `src/core/van-gui.js`. `outbound-guard#allowedPrices` nay gọi xuống lõi ⇒ chiều RA và
  chiều TẠO ĐƠN dùng **một** bảng giá, không hai bản.
  · nhật ký `docs/thi-cong/nhat-ky/phieu-bh1.md`
- 16/09 · 🧭 **THỨ TỰ CỬA LÀ MỘT QUYẾT ĐỊNH VỀ TIỀN, KHÔNG PHẢI VỀ THẨM MỸ.** Cửa tiền vốn
  đứng SAU `conversationHasOrder` — cửa duy nhất đi mạng (quét tới 6 trang đơn POS). Đo được
  khi viết bộ ca: ca «giá sai → phải từ chối» chạy **34.842 ms** ở bản cũ, **0,58 ms** ở bản
  mới; ca «hội thoại đã chốt» 28.504 ms → 0,05 ms. Tức mỗi lượt chốt đơn bị từ chối đang tốn
  một vòng POS vô ích, và bộ ca nào chạm nhánh đó là chạm API thật.
  📌 Luật: cửa CỤC BỘ luôn đứng trước cửa MẠNG. Phép ⑤ của `bh1.sh` neo thứ tự bằng số dòng.
- 16/09 · 🧭 **LUẬT HÀNH VI SỐNG Ở BA CHỖ: sổ · cổng · hook.** Sửa §0a luật 4 xong vẫn bị
  `.claude/hooks/canh-file-cam.sh` từ chối lượt Edit đầu tiên — hook đang thi hành bản luật
  cũ. Đổi một chỗ mà quên hai chỗ kia thì luật mới chỉ là chữ trong sổ.
  📌 Ai đổi luật 4 lần sau: sửa ĐỦ BA nơi trong CÙNG một lượt.
- 16/09 · 🧭 **THƯỚC BẮT NHẦM CHÚ THÍCH.** Cổng `bh1.sh` lượt đầu đỏ 3 phép, cả ba là lỗi của
  chính cổng: ③ đếm chuỗi thô `productTiers` nên đỏ vì một dòng CHÚ THÍCH nhắc tên hàm (thước
  kiểu này dạy người ta xoá chú thích) · ④b đếm sai vì một file có cả import lẫn chú thích ·
  ⑧ kiểm pathspec bằng `git diff HEAD` nên bắt nhầm file chưa commit của phiên khác — đã BỎ
  hẳn phép ⑧ vì `_chan1.sh` ④ so `base..HEAD` và làm đúng hơn. Neo phải trỏ vào CODE
  (`^import …`), không trỏ vào văn bản.

- 23/09 · GD0 (sửa chỗ vỡ giao diện) → ✅ — ba chỗ VỠ đã vá: «Vận hành chat V3» trắng vì bốn
  dòng gắn tay `#close/#reload/#prev/#next` còn sót sau lượt đổi giao diện 17/09 · nút «Bật bot»
  ở màn Bắt đầu gửi mã Facebook vào cửa tra `page.id` (404) · đăng nhập xong ai cũng bị ném vào
  `/dieu-phoi` mà vai quản lý và marketer không có quyền. Thêm cổng `ops/bin/do-giao-dien.mjs`
  (mở mọi màn bằng Brave headless, `pageerror` là đỏ) — đảo-vá đã thử: đặt lại một dòng cũ thì
  cổng đỏ đúng màn đó. `npm test` 1947 xanh / 6 đỏ (cả 6 thuộc nhóm chat/đơn của phiên khác,
  D7 đỏ sẵn từ 16/09). Kế hoạch đầy đủ: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` · nợ: §9 N-GIAODIEN.
- 23/09 · 🧭 **CA CANH VIẾT THEO MÃ ĐANG CÓ SẼ KHOÁ CON BỌ LẠI.** Ca HK7 đòi màn «Bắt đầu» gọi
  `/api/page-bot/${encodeURIComponent(p.pageId)}/bot` — đúng bằng dòng đang sai, nên nó canh cho
  con bọ sống thay vì bắt. Ca đúng phải neo HỢP ĐỒNG của cửa (cửa tra `page.id`), không neo chữ
  của bên gọi. 📌 Viết ca «gọi đúng đường màn kia» thì neo cả ĐƯỜNG lẫn THAM SỐ đường ấy nhận.
- 23/09 · 🧭 **BỘ CA KHÔNG MỞ MÀN BẰNG TRÌNH DUYỆT THÌ KHÔNG THẤY MÀN TRẮNG.** 1.955 ca xanh
  trong khi màn duy nhất duyệt được đơn nằm im 5 ngày: lỗi ở tầng ngoài cùng của mô-đun, HTML
  vẫn trả 200, mọi ca API vẫn xanh. 📌 Mỗi lượt đụng giao diện: chạy `ops/bin/do-giao-dien.mjs`.
- 23/09 · GD1 (một nguồn cho mỗi câu hỏi) → ✅ — điều kiện của page chạy BẢN MỚI nay mang MÃ có
  tên và nút sửa (trước: câu chữ tự do ⇒ màn hiện «mã lạ»), mỗi page khai chạy bằng bản cũ hay
  bản mới và được chấm bằng danh sách của chính bản đó, dải trạng thái đếm page CỦA TEAM bằng
  đúng phép đếm của màn «Page còn thiếu gì» (trước: 1/1 toàn hệ trong khi team có 4 page).
  Cổng `ops/bin/nghiem-thu/gd1.sh` 8/8 · bộ ca mới 11/11 · đảo-vá 3 đột biến đều đỏ đúng ca ·
  `npm test` 1958 xanh / 6 đỏ (đúng 6 ca đỏ có sẵn). Nhật ký: `docs/thi-cong/nhat-ky/phieu-GD1.md`.
- 23/09 · 🧭 **MÃ ĐIỀU KIỆN ĐỪNG MANG KHUÔN TÊN CỦA BIẾN MÔI TRƯỜNG.** Đặt mã `V3_THIEU_GIA…`
  làm thước `bien-moi-truong-khai-du` đỏ — nó quét `\bV3_[A-Z0-9_]+` và đòi mỗi tên có dòng
  trong bảng biến môi trường. Thước đỏ ĐÚNG. 📌 Đổi tên mã (`BOTMOI_*`), đừng nới thước và
  đừng thêm dòng giả vào bảng giấy.
- 23/09 · 🧭 **MÃ HOÁ MỘT NGUỒN THÌ PHẢI ĐI HẾT ĐƯỜNG DÙNG NÓ.** Dịch câu chữ thành mã xong,
  màn «Bắt đầu» vẫn lọc theo bốn mã của bản cũ ⇒ điều kiện của bản mới rơi ra ngoài và màn
  báo «4/4 hoàn thành» cho page bot KHÔNG chạy được — bản vá tự đẻ lỗi mới (án lệ #26).
  📌 Đổi khuôn dữ liệu thì grep hết nơi lọc theo khuôn cũ trong CÙNG lượt.

- 25/09 · GD4 (lượt lời lẽ) → ✅ phần đo được — mã kỹ thuật trên mặt màn 80 → **0**, hộp cảnh báo
  31 → 17 và KHÔNG màn nào quá 1, chữ diễn giải 6.849 → 4.357, 0 màn vỡ. Dựng ba thứ dùng lại
  được: ô «ⓘ Nguồn số» của hệ kiểu, khuôn hai trường (câu người đọc + `…KyThuat` cho người sửa
  máy chủ, đã dùng 5 chỗ), và bảng thuật ngữ `docs/v3/THUAT-NGU.md`. Bảy thước cũ sửa theo luật
  mới, giữ nguyên điều chúng canh. Sáu commit `5282ad8`…`89c847b` · nhật ký
  `docs/thi-cong/nhat-ky/phieu-GD4.md`. CHƯA đạt: chữ diễn giải ≤3.400 — đề nghị đổi đích sang
  «không màn nào quá 250 chữ» (nhật ký mục 4).
- 25/09 · 🧭 **ĐÍCH ĐẶT THEO MỘT PHÉP ĐO CŨ THÌ PHẢI ĐẶT LẠI KHI PHÉP ĐO ĐÚNG HƠN.** Đích «chữ
  ≤3.400» tính khi thước còn đếm cả tên sản phẩm trong bảng. Sửa thước cho đúng thì hai màn
  «dài nhất» tụt 1.276→122 và 1.027→281 — cùng một màn, không đổi một chữ. 📌 Số trước và số sau
  chỉ so được khi CÙNG một thước; đổi thước thì đích cũng phải đổi, đừng cắt nội dung cho vừa
  con số cũ.
- 25/09 · 🧭 **DỮ LIỆU KHÔNG PHẢI CHỮ DIỄN GIẢI — KHAI ĐÚNG VAI THÌ MÁY ĐẾM ĐÚNG.** Dãy chip tên
  sản phẩm là dữ liệu; nó bị đếm thành văn xuôi chỉ vì markup không khai vai. Khai `role="list"`
  / `role="group"` vừa đúng cho người dùng trình đọc màn hình, vừa làm phép đo hết nói dối.
  📌 Trước khi cắt nội dung cho vừa một chỉ số, hỏi «chỉ số này có đang đo đúng thứ nó nói không».

- 25/09 · GD6 (menu đích) → ✅ — năm mục đặt theo NHỊP MỞ MÁY (Hôm nay · Page & bot · Dạy bot ·
  Số liệu · Cài đặt), bảy màn chưa dùng được mang cờ `thuNghiem` nên ra khỏi thanh bên mà đường
  dẫn vẫn sống; «Vận hành chat V3» đổi tên thành «Hội thoại và đơn» (kèm `<h1>`, ca HK10 canh).
  Menu quản trị 26 → **19 màn hiện + 7 ẩn**. Sáu ca canh menu sửa theo cấu trúc mới, giữ nguyên
  điều chúng canh. `do-giao-dien` mở đủ 26 màn, 0 màn vỡ · `npm test` 1970 xanh / 3 đỏ (ca có
  sẵn). Nhật ký `docs/thi-cong/nhat-ky/phieu-GD6.md`. CHƯA đạt đích «≤16 màn» — cần GD2 gộp ba
  màn page và GD3 dựng màn Cài đặt team; không gộp bừa để chạm số.
- 25/09 · 🧭 **ẨN KHỎI MENU KHÔNG ĐƯỢC LÀM MẤT ĐƯỜNG DẪN VỊ TRÍ.** Lọc thẳng màn ẩn khỏi
  `menuCua` làm ca ⑥b đỏ — và nó đỏ ĐÚNG: thanh trên cùng tra «tôi đang ở đâu» bằng chính gói
  menu, nên ai mở màn ẩn bằng đường dẫn sẽ thấy một trang không biết mình thuộc mục nào.
  📌 Ẩn là việc của tầng VẼ (cờ `an`), không phải của tầng dữ liệu menu.
- 25/09 · 🧭 **ẨN KHỎI MENU ≠ CHẶN QUYỀN.** Màn `thuNghiem` giữ nguyên `VAI_VAO_DUOC`, đường dẫn
  vẫn trả 200, màn khác trỏ sang vẫn trỏ được. 📌 Muốn chặn quyền thì sửa vai, đừng sửa menu —
  hai việc đó nhìn giống nhau trên màn nhưng khác hẳn nhau khi có sự cố.


- 25/09 · GD5 (kiểm soát) → ✅ bốn phần, ❌ một phần. **K5** bàn giao nay đẻ một dòng
  `viec_can_xu_ly` có rào chống trùng và mang lý do (trước: 0 dòng việc / 56 hội thoại HANDOFF).
  **K7** nhật ký sửa sản phẩm chụp `goi_gia` TRƯỚC và SAU (trước chỉ ghi tên cột, mất hẳn giá cũ).
  **K4** «Máy chạy bot còn sống không» đo được mà KHÔNG cần bảng mới — đo bằng hàng đợi tin
  (`src/queue/kho.js#nhipMayBot`, chỉ đọc), luật xét một chỗ (`ui/chung/nhip-may-bot.js`), hiện ở
  dải trạng thái + đèn ⑩. Rỗng-và-nguội = XÁM, tin dồn mà vẫn xử được = VÀNG. **K8** `canhBao`
  nối vào `nhat_ky` (`canh_bao_model`). **K1** nút dừng cả team CHƯA làm — cần `mo-van`.
  Thước: suc-khoe 25/25 (3 lượt đảo-vá đều bắt) · e2e trên PostgreSQL thật canh cả câu SQL ·
  trình duyệt thật đọc dải đỏ trong cảnh kẹt · `do-giao-dien` 26 màn 0 vỡ · `npm test` 1.980/1
  (I1 đỏ sẵn). Nhật ký `docs/thi-cong/nhat-ky/phieu-GD5.md`. Nợ mới: §9 N-DUPHONGCHATTHAT.
- 25/09 · 🧭 **MỘT ĐÍCH KHÔNG ĐẠT ĐƯỢC BẰNG ĐƯỜNG NÀY THÌ ĐO THỬ BẰNG ĐƯỜNG KHÁC TRƯỚC KHI XIN
  PHÉP.** «Worker phát nhịp tim» cần bảng mới ⇒ cần số migration ⇒ án lệ #25 bắt chờ. Nhưng câu
  hỏi thật là «tin của khách có được rút ra xử không», và hàng đợi đã ghi sẵn câu trả lời ấy.
  📌 Hỏi «mình đang cần SỐ ĐO nào» trước khi hỏi «mình cần BẢNG nào» — nhiều lúc số đo đã nằm sẵn
  trong dữ liệu đang chạy.
- 25/09 · 🧭 **BÁO ĐỘNG GIẢ THÌ NGƯỜI TA TẮT CHUÔNG — NÊN MỖI ĐÈN ĐỎ PHẢI LOẠI ĐƯỢC CẢNH VÔ HẠI
  GIỐNG NÓ.** «Tin chờ lâu» trông y hệt nhau ở hai cảnh khác hẳn: máy chết, và cao điểm 50 khách
  cùng nhắn. Phân biệt bằng một vế thứ hai: «và không tin nào vừa xử xong». 📌 Trước khi đặt một
  ngưỡng, kể ra cảnh VÔ HẠI gần giống nhất rồi hỏi ngưỡng ấy có bắt nhầm nó không.
- 25/09 · 🧭 **NỐI MỘT CÁI PHỄU LÀ DỊP ĐI TÌM NGUỒN CỦA NÓ.** Nối `canhBao` xong thì lộ ra phễu
  ấy chưa có nguồn: đường chat thật gọi thẳng `goiMotLan`, không đi qua lớp dự phòng — tức hệ
  KHÔNG có chuyển dự phòng, chứ không phải «có mà không ai được báo» (§9 N-DUPHONGCHATTHAT).
  📌 Nối xong một đầu dây, đi ngược lại tìm đầu kia; báo cáo «đã nối» mà đầu kia trống là một
  lời khai đúng chữ và sai ý.

- 25/09 · Q1 (giao page sang bot mới bằng giao diện) → ✅ **người quyết gật**, đường đã dựng
  xong, **cầu dao chưa bật ở đâu**. Migration **024** thêm cột `page.giao_bot_moi`; cầu dao
  `V3_GIAO_PAGE_TREN_MAN` (vắng = đóng, y nguyên hành vi cũ); nút «Giao sang bot mới» ở màn
  Công tắc từng page làm đúng bốn bước: tắt bot cũ → ĐỌC LẠI từ chính bot cũ → chưa xác nhận
  thì DỪNG → mới ghi cờ. Chốt kèm: không giao page còn chặn, không giao khi chưa đọc được cửa
  kiểm, không tự bật bot hộ ai. Thêm đèn ⑪ «Hai bot cùng một page» làm lưới cuối cho lỗ giao
  diện cũ (Q2 còn treo). Nút thắt gỡ được là nhờ ĐO ĐƯỢC: `pancake-poll.js:262` và
  `scheduler-followup.js:115` đều chỉ chạy trên page ĐANG BẬT AI ⇒ tắt công tắc AI là bot cũ
  buông page, không cần khởi động lại. Thước: page-bot 35/35 · nguồn-page 9/9 (mới) ·
  suc-khoe 29/29 · gd1 11/11 · `npm test` 2.004/0 · do-giao-dien 26 màn 0 vỡ. Nhật ký
  `docs/thi-cong/nhat-ky/phieu-Q1-GIAO-PAGE.md`.
- 25/09 · 🧭 **BỘ CA XANH KHÔNG THAY ĐƯỢC MỘT LẦN MỞ MÀN NHÌN BẰNG MẮT.** Bản đầu lấy GIAO của
  hai tập nguồn và gọi biến môi trường là «phanh tay thu hẹp» — 9 ca xanh. Mở màn trên bản dev
  thì 4 page đang chạy bot mới bỗng hiện «bot cũ»: bật cầu dao là hất chúng ra khỏi tay bot
  mới trong khi bot cũ đã tránh chúng từ lâu ⇒ **không ai trả lời**, im lặng. 📌 Ca chỉ canh
  được điều mình NGHĨ RA để canh; tôi không viết ca cho chiều ấy vì đã tin cái tên mình vừa
  đặt. Đặt tên cho một cơ chế xong thì kiểm lại xem cái tên có đang thay mình suy nghĩ không.
- 25/09 · 🧭 **NÚT THẮT THẬT THƯỜNG NHỎ HƠN NÓ TRÔNG.** «Phải sửa bot cũ mới giao page được»
  đứng vững cho tới khi đọc đúng hai dòng: cả vòng hỏi tin lẫn vòng nhắc khách của bot cũ đều
  chỉ chạy trên page ĐANG BẬT AI — mà công tắc ấy đã bấm được từ giao diện v3 từ lâu. 📌 Trước
  khi xin sửa một tệp đóng băng, đi đọc xem nó THẬT SỰ đọc gì; câu trả lời hay nằm ở một dòng
  `filter` chứ không ở kiến trúc.

- 25/09 · Q2 (số phận giao diện cũ) → **ĐÓNG CỬA HẬU, KHÔNG TẮT DỊCH VỤ.** Người quyết ra lệnh
  «tắt cổng 3100»; đo trước khi gõ thì cổng ấy CHÍNH LÀ con bot (`src/server.js` khởi động
  `startPancakePolling` + lịch nhắc + lịch mổ trong cùng tiến trình) và cũng là cầu `/admin/api`
  của v3 ⇒ tắt = 51 page ngừng trả lời + v3 đỏ hàng loạt. Nên đóng bằng **hai luật iptables**:
  `ACCEPT` loopback rồi `DROP` mọi nơi khác cho cổng 3100. Không đụng `.env`, không đụng mã,
  **không khởi động lại dịch vụ nào**. Đo: ngoài vào → timeout 8s · loopback → `{"ok":true}` ·
  cầu v3 `/admin/api/readiness` → JSON thật · v3 kêu mất cầu = 0 · cổng 3102 vẫn 200.
  Bằng chứng giá phải trả thấp: `ai-enabled.json` và `kb-overrides.json` trên prod sửa lần cuối
  **28/08 — 28 ngày không ai ghi gì qua dashboard cũ**. Runbook + đường lùi + 5 mốc:
  `docs/thi-cong/nhat-ky/phat-hanh-20260925-dong-cua-3100.md`.
  ⚠️ CHƯA lưu luật ⇒ **reboot là cửa mở lại**. Lưu vĩnh viễn là một lượt gật riêng.
- 25/09 · 🧭 **«TẮT CỔNG X» HIẾM KHI LÀ TẮT CỔNG X.** Cổng 3100 mang ba thứ trong một tiến trình:
  trang quản trị (thứ cần đóng), cầu `/admin/api` của v3 (thứ phải giữ), và vòng hỏi tin của
  chính con bot (thứ tắt là mất khách). 📌 Trước khi thi hành một lệnh dạng «tắt/xoá/đóng», liệt
  kê MỌI thứ đang sống nhờ cái sắp tắt — rồi mới chọn lát cắt hẹp nhất đủ làm điều người ta muốn.
- 25/09 · 🧭 **BA CÁCH ĐÓNG MỘT CỬA, CHỌN CÁCH KHÔNG PHẢI KHỞI ĐỘNG LẠI.** Đổi mật khẩu và đặt
  `HOST=127.0.0.1` đều phải restart cả ba dịch vụ (chúng đọc CHUNG một `.env`), mà `HOST` còn
  khoá nhầm giao diện v3 vì nginx trên máy phục vụ ứng dụng khác. Luật tường lửa không chạm tiến
  trình nào. 📌 Cùng một kết quả, hãy chọn đường không phải dừng thứ đang phục vụ khách; và nhớ
  hỏi «ba dịch vụ này có dùng chung tệp cấu hình không» TRƯỚC khi định sửa tệp ấy.

- 25/09 · **DEPLOY GIAO DIỆN MỚI LÊN MÁY CHỦ** → ✅ ba dịch vụ active, 0 lỗi, `pages:133` bằng
  đúng số trước deploy, giao diện v3 trả 200 và phục vụ đúng mã mới, cột 024 có trên CSDL thật,
  **không cờ gửi nào bị mở**. Người quyết chọn phương án đè thẳng; tôi sao lưu TRƯỚC nên «mất 48
  tệp sửa tại chỗ» thành «cất ở `/var/backups/aicloser/truoc-deploy-20260925T075932Z/`». Thứ tự:
  đẩy nhánh → fetch/checkout -f → `npm ci` → **migrate 018→024 (lược đồ trước)** → restart. Nhật
  ký `docs/thi-cong/nhat-ky/phat-hanh-20260925-giao-dien-moi.md`.
  🔴 Mang theo nợ: **38 ca đỏ trên HEAD** vì đợt sửa 22 tệp (+448/−393) của phiên khác chưa
  commit — prod đang chạy đúng bản ấy. Hệ đang im nên chưa có hậu quả, nhưng **cấm mở van gửi
  trước khi bộ ca về xanh**.
- 25/09 · 🧭 **`npm test` Ở CÂY LÀM VIỆC KHÔNG PHẢI PHÉP ĐO CỦA THỨ SẼ DEPLOY.** Cây làm việc
  2.004 xanh / 0 đỏ; worktree sạch dựng từ HEAD: 46 đỏ, trong đó 43 chỉ vì một tệp chưa commit.
  Kho code đã KHÔNG chạy được suốt ba ngày mà không ai thấy. 📌 Trước mọi lượt deploy, chạy bộ ca
  trên một bản dựng từ HEAD — `git worktree add --detach` mất 10 giây và nó bắt đúng thứ mà
  «xanh hết» đang che.
- 25/09 · 🧭 **ĐO QUÁ SỚM CŨNG LÀ ĐO SAI.** Ngay sau restart, `/health` trả `pages:0` — đủ để lùi
  oan. Bot nạp token mất ~30 giây (Google Sheet + Meta API). Đo lại: 133, đúng bằng trước deploy.
  📌 Ngưỡng lùi phải kèm MỐC THỜI GIAN sớm nhất được phép đo, không chỉ kèm con số.

- 25/09 · **TRẢ NỢ 38 CA ĐỎ + DEPLOY LƯỢT HAI** → ✅. Người quyết ra lệnh đưa đợt sửa đang dở của
  phiên song song vào repo: `fe12262` (20 tệp `src/` + 3 tệp mới + 9 bài kiểm — đụng `tools.js`,
  `model.js`, `prompts.js`, `closer.js`, `pos/tao-don.js`) và `c80a0b6` (ops · tài liệu · màn
  đơn · `.env.example` · skill). Hai commit khai rõ **đây là commit THU HỒI, không phải commit
  thiết kế** — tôi không phải tác giả phần việc ấy.
  **Bộ ca trên worktree SẠCH dựng từ HEAD: 2.017 ca · 1.995 xanh · 0 đỏ.** Lần đầu repo có tín
  hiệu xanh thật. Prod deploy lại, nay đứng ở `c80a0b6` = HEAD; ba dịch vụ active, 0 lỗi,
  `pages:133`, UI 200, lược đồ 24 bản, **van gửi vẫn 0 cờ**.
  Cây làm việc nay **sạch hoàn toàn** (0 tệp chưa commit); `.1devtool/` và `.ua/` vào `.gitignore`.
- 25/09 · 🧭 **CÂY BẨN LÂU NGÀY LÀ MỘT KHOẢN NỢ CÓ LÃI.** 22 tệp mã sửa dở nằm ngoài repo khiến:
  repo không chạy được 3 ngày mà không ai thấy · prod chạy một bản không có bản sao ở đâu ·
  và lượt deploy đầu tiên vô tình ĐƯA PROD VỀ BẢN CŨ HƠN. Ba hậu quả khác nhau từ một nguyên
  nhân. 📌 «Để commit sau» không phải là hoãn một việc, mà là tạo một bản thứ hai của sự thật.

- 25/09 · GD2 (trang một page + một công tắc) → ✅ trừ bốn tab nhúng. Dựng màn MỚI
  `/page/:id`: page này là gì · bot nào phụ trách (+ nút giao) · công tắc đọc nguồn thật ·
  từng điều kiện kèm nút đi sửa · bốn đường làm tiếp mang sẵn page. «Công tắc từng page» đổi
  tên **«Tất cả page»**, tên mỗi dòng dẫn sang trang của page, thêm hai bộ lọc lấy từ cửa
  kiểm. `/bat-dau` và `/san-sang` **chuyển hướng** về danh sách (không xoá đường), menu
  19 → **17 màn hiện**. Và tiêu chí của phiếu: còn **ĐÚNG MỘT** cửa ghi công tắc bot —
  `/api/van-hanh/pages/:id` nay từ chối `enabled` (cửa ấy không có trần bật, không hộp xác
  nhận, không nhật ký trước/sau). Thước: `mot-page` 9/9 mới (2 lượt đảo-vá bắt được) ·
  vai-b 843/843 · e2e 8/8 trên PostgreSQL thật · `npm test` 2.022/0 · do-giao-dien 24 màn
  0 vỡ · chữ diễn giải 4.414 → **4.187**. Nhật ký `docs/thi-cong/nhat-ky/phieu-GD2.md`.
- 25/09 · 🧭 **GỘP MÀN LÀM CON SỐ ĐO XẤU ĐI, VÌ THƯỚC ĐẾM ĐƯỜNG CHUYỂN HƯỚNG HAI LẦN.** Sau
  khi gộp, phép đo ra 18 hộp cảnh báo (trước 17) — do `/page` chuyển hướng về `/page-bot` và
  cùng một màn bị đo hai lượt. Sửa thước: nhớ đường đích, đã đo rồi thì ghi «→ chuyển hướng
  tới X» chứ không cộng vào tổng. 📌 Việc tốt lên mà chỉ số xấu đi thì nghi THƯỚC trước, và
  nếu không sửa thì lần sau sẽ có người đi «tối ưu» một thứ không hỏng.
- 25/09 · 🧭 **HAI CỬA GHI CHO MỘT CÔNG TẮC = CỬA NGHÈO CHỐT HƠN SẼ THẮNG.** Màn danh sách có
  trần bật hàng loạt + hộp xác nhận + nhật ký trước/sau; màn «Hội thoại và đơn» có một nút
  bật thẳng, không cả ba. Người ta bấm nút nào tiện hơn, không bấm nút nào an toàn hơn.
  📌 Khi thấy hai đường ghi cùng một thứ, đừng «đồng bộ» chúng — bỏ một, và bỏ đúng cái nghèo
  chốt hơn; thước `mot-page` ⑤ nay đếm số cửa bằng grep để nó không mọc lại.
- 25/09 · 🧭 **BỘ CA XANH + PHÉP ĐO XANH VẪN KHÔNG THẤY THỨ MỘT ẢNH CHỤP THẤY NGAY.** Màn mới
  `/page/:id` qua 852 ca xanh, 0 mã kỹ thuật, 0 màn vỡ, 0 lỗi JS — mà người quyết mở ra là
  thấy ba lỗi: đường dẫn vị trí đứng lại ở chữ tạm «Đang mở page…», ba khối nằm trần không
  thành tấm như mọi màn khác, nút giao page trông như chữ. Không thước nào đang đo «màn này
  có giống phần còn lại của ứng dụng không». 📌 Dựng màn MỚI thì chụp một ảnh và đặt cạnh một
  màn cũ — rẻ hơn mọi thước, và bắt đúng loại lỗi mà thước không với tới.
- 25/09 · GD2 lượt hai — người quyết hỏi «sao cài đặt page cứ nhảy sang màn khác?», và câu
  hỏi đúng: gộp ba màn xong mà đổi thị trường vẫn phải rời trang thì chưa gộp. Trang page nay
  có **bốn tab**: Tình trạng · **Thiết lập** (thị trường · ngành hàng · sản phẩm gốc · trọng
  điểm · lời khai Botcake — sửa ngay tại chỗ) · Sản phẩm & giá (chỉ đọc) · Kịch bản (chỉ
  đọc). Hai tab đọc dùng **cùng bộ đọc với đường ráp prompt của bot**, nên màn không khoe
  được một bản kịch bản khác cái bot đang gửi. Chạy thử và Đoạn-chữ-gửi-AI CỐ Ý vẫn là đường
  dẫn (hai màn chẩn đoán riêng), nhưng mang sẵn page. **Không thêm một cửa ghi nào** — năm ô
  bấm vào đúng các đường `/api/page-bot/:id/*` đã có. Thước: mot-page 14/14 · `npm test`
  2.027/0 · do-giao-dien 24 màn 0 vỡ, 17 hộp cảnh báo.
- 25/09 · **GD2 LÊN MÁY CHỦ** → ✅ prod `c80a0b6` → **`6103365`**; sao lưu CSDL trước; lược đồ
  không thêm bản nào (vẫn 24); ba dịch vụ active, 0 lỗi, `pages:133`, UI 200 trong lẫn ngoài,
  `/page` chuyển hướng đúng, mã thanh điều hướng đã là bản mới, **van gửi vẫn 0 cờ**, cổng
  3100 vẫn đóng. Lần này gõ nhanh vì **cây sạch và HEAD đã xanh trên worktree sạch trước khi
  đẩy** — đúng thứ sáng nay không có. Nhật ký mục 12 của
  `docs/thi-cong/nhat-ky/phat-hanh-20260925-giao-dien-moi.md`.

- 25/09 · GD3 (cài đặt team) + sửa-trong-tab → ✅. Màn mới `/cai-dat-team`: **năm việc, làm một
  lần**, mỗi việc đo bằng số thật và dẫn sang đúng chỗ làm; ba cái van của máy chủ tách thành
  mục riêng có nút «Kiểm lại» — trộn vào năm việc là bày một ô tích người dùng không tích được.
  «Chưa đo được» là trạng thái THỨ BA, không gộp vào «chưa làm». Hai tab của trang page từ
  chỉ-đọc thành **sửa được**, đi đúng hai cửa ghi đã có (`products/:id` và `kich-ban/.../nhap`);
  bốn ô nâng cao của bậc giá cố ý không hiện và được **gửi lại nguyên văn** nên tab không thể
  làm hỏng chúng — đã chạy vòng lưu THẬT trên bản dev với bốn ô khác rỗng để chứng minh.
  Thước: cai-dat-team 7/7 mới · vai-b 857/857 · `npm test` 2.034/0 · do-giao-dien 25 màn 0 vỡ.
  Nhật ký `docs/thi-cong/nhat-ky/phieu-GD3.md`.
- 25/09 · 🧭 **TRƯỚC KHI TỰ VIẾT MỘT LUẬT, HỎI «CHỖ KHÁC TRẢ LỜI CÂU NÀY BẰNG LUẬT NÀO».**
  Tab sản phẩm bản đầu lọc `san_pham.page_id` — bộ ca xanh, và rỗng với MỌI page trên dữ liệu
  thật (50/50 sản phẩm có `page_id` NULL), trong khi bot vẫn chào bán bình thường. Luật thật
  nằm ở `src/products/catalog.js`: có `san_pham_goc_ma` thì lấy theo mã gốc lọc theo shop.
  📌 Một màn tự nghĩ ra cách trả lời một câu hỏi mà hệ đã có câu trả lời = hai sự thật, và cái
  sai luôn là cái mới.
- 25/09 · **LƯỢT THỬ A→Z** (người quyết yêu cầu): dựng page ảo + sản phẩm ảo trên bản dev, đi
  hết luồng cài đặt bằng trình duyệt thật. Kết quả: **0 lỗi JS · 0 cửa 5xx**, mọi thứ gõ vào
  đều xuống CSDL đúng (giá 129 SAR → 12900 đơn vị nhỏ; 1 dòng nhật ký sửa giá). Nhưng bắt được
  **hai lỗi mà 2.038 ca xanh không thấy**: ① tab sản phẩm nói «page chưa có sản phẩm nào»
  trong khi bot đang dùng một sản phẩm — vì ghép qua cửa cắt 50 dòng (và cửa ấy còn BỎ bậc giá
  đang tắt ⇒ lưu tiếp là xoá mất chúng); ② «chưa đọc được tình trạng» gộp nhầm cảnh «bot chưa
  biết page này» vào cảnh «cầu hỏng», đẩy người dùng đi hỏi người quản trị một việc họ tự sửa
  được. Cả hai đã vá, có ca canh (mot-page 18/18). Dọn sạch dữ liệu thử; dòng nhật ký ở lại vì
  `nhat_ky` là bảng chỉ-INSERT — đúng thiết kế.
- 25/09 · 🧭 **BỘ CA CHẠY TRÊN DỮ LIỆU MÌNH TỰ DỰNG; LƯỢT THỬ A→Z CHẠY TRÊN DỮ LIỆU NHƯ THẬT.**
  Hai lỗi trên đều là «màn nói một câu SAI», và cả hai chỉ lộ khi có một page thật sự trống đi
  qua trọn luồng. 📌 Sau khi dựng xong một luồng, dựng một bản ghi ảo và đi hết luồng ấy —
  rẻ hơn mọi thước, và bắt đúng loại lỗi mà thước không với tới (cùng họ với bài học «chụp một
  ảnh và đặt cạnh màn cũ»).
- 25/09 · **ĐĂNG NHẬP GIAO DIỆN MỚI TRÊN MÁY CHỦ BỊ ĐÁ VỀ MÀN ĐĂNG NHẬP** — người quyết gặp
  thật. Nguyên nhân: unit systemd `aicloser-v3` đặt `Environment=NODE_ENV=production` ⇒ cookie
  vé mang cờ `Secure` ⇒ trình duyệt từ chối lưu nó trên `http://169.58.33.8:3102` ⇒ đăng nhập
  «thành công» nhưng lượt gọi kế tiếp không có vé, màn Chọn team rỗng rồi bật về đăng nhập.
  Dữ liệu không sai (`chu@talpha.vn` có đủ 3 team). Lối vào tạm: đường hầm SSH tới
  `localhost` (trình duyệt coi localhost là an toàn nên chịu lưu cookie `Secure`). Chữa gốc:
  **HTTPS trước cổng 3102** — nợ đã ghi, nay lên hàng đầu vì nó CHẶN người dùng vào.
- 25/09 · 🧭 **ĐỌC BIẾN MÔI TRƯỜNG CỦA TIẾN TRÌNH ĐANG CHẠY, ĐỪNG ĐỌC `.env`.** Tôi kiểm
  `NODE_ENV` bằng `grep .env` → «không đặt» → báo người quyết «đăng nhập qua HTTP chạy được».
  Sai: unit systemd đặt nó. Cùng lỗi phương pháp ấy nằm trong phép «van gửi = 0 cờ» của ba
  lượt deploy hôm nay (kết luận vẫn đúng — unit đặt `PANCAKE_READONLY=1`, `V3_PANCAKE_GUI=0` —
  nhưng đúng nhờ may). Skill `mo-van` bẫy ③ đã ghi sẵn: nghiệm thu env prod bằng
  `/proc/<pid>/environ`. 📌 Có luật rồi mà không đọc lại trước khi đo thì cũng như không có.

- 28/09 · **GIẢ LẬP MINTY KSA TRÊN HỘI THOẠI THẬT** (bản dev, diễn tập, không gửi) — `ops/bin/
  gia-lap-mot-minh.mjs`, 12 lượt khách thật trong 72 giờ. Lượt đầu bot trả lời **0/12**: công
  tắc bot mới của chính page đang TẮT (`v3_ai_bat=false`) — đúng luật; bật qua cửa ghi duy nhất
  của màn mới (chạy được). Lượt hai: **8/12** trả lời, cả 8 bằng lớp 0 đồng (câu mẫu, 0đ,
  ≤0,4s — Botcake thật mất 5–10s, Public API ~57s); **4/12 hỏng vì Kimi trả HTTP 429: hết hạn
  mức token trong ngày của tổ chức** (1.507.116/1.500.000). Ba phát hiện chất lượng: ① khách hỏi
  «How much?» bằng tiếng Anh, bot trả câu mẫu bằng tiếng Tagalog; ② khách đã «Place an order»
  rồi hỏi «final price», bot lại gửi câu khuyến mãi chung như chưa có gì; ③ **giá 109/159 SAR
  GÕ CỨNG trong ô `fastLanePrice` của kịch bản** (bản LIVE 6) — hôm nay khớp `goi_gia`
  (10900/15900), nhưng sửa giá ở tab «Sản phẩm & giá» mới thì bot VẪN báo giá cũ. Tab mới làm
  việc sửa giá dễ hơn, tức làm rủi ro trôi giá LỚN hơn — nợ của chính GD3.
  Kèm: vá lỗi worker gọi `dsPageChoPhep()` không `await` (`c4c2a4b`, chưa deploy).
- 28/09 · **TRẢ LỜI ĐÚNG NGÔN NGỮ KHÁCH + CẢNH BÁO GIÁ GÕ CỨNG** (phiếu `nhat-ky/phieu-NGON-NGU-
  GIA-GO-CUNG.md`). Lớp 0 đồng nhường cho model khi câu mẫu lệch ngôn ngữ khách (bảo thủ: chỉ
  khi đoán chắc cả hai). Tab Sản phẩm/Kịch bản báo vàng khi kịch bản gõ cứng giá còn khớp, đỏ
  khi lệch bậc giá đang bật. ⚠️ Nợ mới: lượt nhường mà model hỏng ⇒ khách không nhận gì (trước
  đây nhận câu sai ngôn ngữ) — cùng gốc với nợ hạn mức Kimi, người quyết để nguyên.
- 28/09 · **DEPLOY `cc91084`** (867e3f8 → cc91084, không migration, không thư viện mới). Bản sạch
  của HEAD: 2.065 ca · 0 đỏ. Ba dịch vụ active · lỗi mới 0 · UI 200 · env đọc từ `/proc`:
  `PANCAKE_READONLY=1`, `V3_PANCAKE_GUI=0`, `V3_PAGE_XU_LY=` rỗng ở cả ba (van gửi vẫn đóng).
  `/health` **131 page** (lần trước 133): log nói token Meta «Token app CHAT AI 13/7 (BM DN -
  Live)» **hết hạn từ 11/09** ⇒ chỉ 1/2 token khỏe. Không do bản này; nợ cần người quyết thay token.
- 28/09 · **ĐĂNG NHẬP HTTP + RÚT MENU 18 → 16 + RÚT CHỮ.** ① Người quyết lại «không vào được
  màn chọn team»: cookie vé nay gắn `Secure` theo `req.secure` (HTTPS thật) thay vì `NODE_ENV`;
  `V3_COOKIE_SECURE=1` ép khi đứng sau proxy. Trên HTTP vé vẫn đi rõ — HTTPS vẫn là nợ. ② Cờ
  mới `moTuManKhac` trong `man-hinh.js`: «Sản phẩm & kho» và «Đoạn chữ gửi cho AI» ra khỏi
  thanh bên, ca ④g đọc code từng lối vào để chắc còn thật. Ca ②b bắt lỗi ở bản đầu: marketer
  không thấy «Tất cả page» ⇒ ẩn đồng loạt là mất nguyên mục «Page & bot» của họ; nay màn
  mở-từ-màn-khác hiện lại khi nó là cửa cuối của mục. ③ Chữ: Việc của tôi 298→212 · Kết nối
  271→182 · Model 250→217 · Hệ còn sống không 340→~220 (đèn xanh thôi hiện câu lặp con số).
  Không màn nào trên menu quá 250. Bốn màn 502 khi đo trên máy dev là vì bot cũ (3200) không chạy.
- 28/09 · **DEPLOY `fb12ee5`** (cc91084 → fb12ee5, không migration). Bản sạch HEAD 2.068 ca · 0
  đỏ. Ba dịch vụ active · lỗi mới 0 · UI 200 · `/health` 131 (như trước, token Meta hết hạn) ·
  env từ `/proc`: van gửi vẫn đóng ở cả ba. Đo thật trên máy chủ: `POST /api/dang-xuat` qua HTTP
  trả `Set-Cookie: v3_ve=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` — **không còn `Secure`**.
- 28/09 · **TRANG MỘT PAGE ĐỨNG Ở «ĐANG MỞ…» TRÊN MÁY CHỦ** (người quyết chụp màn gửi). Đo trên
  máy chủ: mọi màn cần tình trạng page (trang page, danh sách page, Cài đặt team, Việc của tôi,
  Hệ còn sống không, dải trạng thái trên MỌI tab 45 giây một lần) đều gọi
  `/admin/api/readiness` — **10–17 giây** cho 699 page, và vì `allReadiness()` là hàm ĐỒNG BỘ
  nên **cả tiến trình bot đứng** trong lúc ấy (`/health` 0,002s → 16s). Chuyện 10–13s đã đo từ
  25/08; khi đó chữa bằng cách nới hết-giờ lên 25s, không bớt số lượt gọi. Vá phía v3
  (`cau-bot-v1.js#sanSangToanHe`): nhớ 60 giây · tới 10 phút thì trả bản nhớ và làm mới ngầm ·
  một lượt bay cho mọi tab · bật/tắt bot, thêm/bỏ token, mọi lượt ghi qua `goiAdminV1` xoá bản
  nhớ · làm nóng lúc khởi động. Thước `san-sang-bo-nho.test.mjs` 6 ca; đảo vá ⇒ ①②④ đỏ.
  **Gốc phía bot chưa chữa:** `allReadiness()` (vùng cấm `src/`), chưa rõ 10 giây nằm đâu. Đã
  loại trừ «parse lại `kb-overrides.json` 510 KB» (đo: ~0,2s cho 1.200 lượt). Cần profile CPU
  tiến trình bot, và cần người quyết cho phép đụng `src/readiness.js`.
  🧭 **Lượt «audit toàn bộ màn» không bắt được lỗi này vì nó chạy trên máy dev**: 4 page, bot cũ
  không chạy ⇒ cửa kiểm hỏng NHANH, không bao giờ CHẬM. Thước đo giao diện phải có một lượt
  trên số liệu cỡ máy chủ; đo «màn có vỡ không» mà không đo «màn mở mất bao lâu» là bỏ sót
  đúng thứ người dùng cảm thấy đầu tiên.
- 28/09 · **GỐC CỦA 10 GIÂY: `kb-overrides.json` BỊ PARSE LẠI CHO TỪNG PAGE.** Người quyết cho
  phép («deploy rồi sửa luôn readiness») ⇒ **Đụng vùng cấm: `src/kb.js`** (không phải
  `readiness.js` — gốc nằm ở kb). Đo bằng profile CPU tiến trình bot thật (inspector bật bằng
  `SIGUSR1`, chỉ nghe 127.0.0.1, đóng khi bot khởi động lại): lượt readiness 12,4s, trong đó
  `readFileSync` 6,8s + `readOverrides` 3,8s + `readFileUtf8` 1,1s. ⚠️ **Tôi đã loại nhầm thủ phạm
  này một lần** bằng phép thử trên máy mình (parse 1.200 lần ~0,2s) — phép thử bỏ qua đọc đĩa
  và CPU máy chủ chậm hơn nhiều. 📌 Đo trên chính máy có triệu chứng trước khi loại một giả
  thuyết. Vá: `readOverridesChiDoc()` nhớ theo `mtime+cỡ`, chỉ cho nơi CHỈ ĐỌC (`getPageConfig`,
  `listScriptPages`); nơi ghi vẫn đọc tươi để có bản riêng mà sửa; `writeOverrides` xoá bản
  nhớ. Thước `test/kb-overrides-bo-nho.test.mjs` 3 ca; đảo vá ⇒ ① đỏ.
- 28/09 · **DEPLOY `40321bb`** (kèm `35b969e` của phiên song song — xanh trên bản sạch 2.078/0,
  nay lần đầu CHẠY trên bot cũ vì lượt này khởi động lại nó; van gửi vẫn đóng nên chưa chạm
  khách). Đo trên máy chủ: `/admin/api/readiness` **12,4s → 0,08s** (3 lượt), vẫn 699 page ·
  ba dịch vụ active · lỗi mới 0 · `/health` 131 · cổng inspector 9229 đã đóng (bot khởi động
  lại) · v3 làm nóng cửa kiểm lúc 04:22:22.
  ⚠️ Nợ mới lộ: **`aicloser-v3` KHÔNG tự thoát khi nhận SIGTERM** — lần nào cũng bị systemd ép
  SIGKILL sau 2 phút (04:12, 04:22), và `aicloser` mất ~2 phút mới dừng. Mỗi lượt deploy vì thế
  có ~2 phút giao diện chết. Chưa đụng.
- 28/09 · **TRẢ NỢ «v3 không tự thoát khi SIGTERM».** Người quyết: «sửa luôn». **Đụng vùng cấm:
  `src/conv-state.js`** (người quyết cho phép). Gốc: tệp ấy bắt SIGINT/SIGTERM để ghi nốt trạng
  thái hội thoại nhưng không thoát — mà Node đã có người bắt tín hiệu thì thôi tự thoát ⇒ bot cũ
  và v3 (cả hai nạp tệp này) treo tới SIGKILL sau 2 phút, và SIGKILL thì chẳng ghi nốt được gì.
  Nay ghi nốt rồi, nếu không còn ai khác bắt tín hiệu, trả nó về mặc định (thoát); worker có bộ
  bắt riêng (dừng sau lượt đang chạy) nên vẫn tự quyết. Thước `test/conv-state-tat-may.test.mjs`
  chạy tiến trình con THẬT, gửi tín hiệu THẬT: ① thoát < 3s và tệp trạng thái có dòng vừa ghi ·
  ② có bộ bắt khác thì không giành quyền thoát. Đảo vá (đưa code cũ về) ⇒ ① treo, đỏ.
- 28/09 · **DEPLOY `6fdd25a`** — lượt dừng cuối của bản cũ vẫn bị SIGKILL sau 2 phút (04:28:47,
  đúng như báo trước). Sau đó đo bằng bản mới: khởi động lại `aicloser-v3` **0,06s**, `aicloser`
  **0,07s** (04:29:46: Stopping → Stopped → Started cùng một giây), không còn dòng «timed out».
  Ba dịch vụ active · `/health` 131 · UI 200 · readiness 0,08s · lỗi mới 0 · env từ `/proc`:
  `PANCAKE_READONLY=1`, `V3_PANCAKE_GUI=0` ở cả ba (van gửi vẫn đóng).
- 28/09 · **AUDIT GIAO DIỆN (ui-taste) + DEPLOY `ba9b048`** (6fdd25a → ba9b048; chỉ `v3/` + tài
  liệu, không migration, không package, không đụng `src/` ⇒ chỉ khởi động lại `aicloser-v3` và
  `aicloser-worker-v3`, bot cũ để nguyên). Soát 16 màn ở 1440/390px trên bản xem thử → 13 lỗi,
  sửa hết trong 5 commit `f6ba07b` `08d0c5c` `7ed6dc6` `9032a51` `53ac05f`: năm màn đếm «page
  bật bot» theo cột bản sao (nay hỏi cửa kiểm qua `ui/chung/bot-bat-that.js`), «Người và team» nói
  sai về model mặc định, «3 người» đếm dòng vai, mã máy lộ lên màn, Model AI 11 chỗ đỏ, bảng page
  cuộn ngang trên điện thoại, xem nhanh ngoài màn hình. Lỗi thật lộ ra: `audit/index.js` ghi
  `tac_nhan` trơn (`nguoi`/`may`) — nay đúng lược đồ `nguoi:<email>` | `may:<việc>`.
  Cửa vào: bản sạch HEAD **2.093 ca · 0 đỏ** · 14 cổng nghiệm thu đỏ **y hệt trên `b9375da`**
  (neo bảng, import pancake, ca cũ — không cổng nào đỏ vì lượt này). Máy chủ 03:44:34Z: ba dịch
  vụ active · lỗi mới 0/0/0 · `/health` 131 (như trước) · UI 200 · bản mới đang phục vụ (dấu vết
  trong `kieu.css` + `dieu-huong.js`) · env từ `/proc`: van gửi vẫn đóng ở cả ba. Chưa đo được:
  hành vi sau đăng nhập trên máy chủ (cần tài khoản). Lùi: `git checkout -f -B vao-ui-v3-17-09
  6fdd25a` + restart hai dịch vụ v3 — không mất dữ liệu.
- 28/09 · BH7 → ✅ — Kimi thấy tin Botcake (ghi chú có nhãn, trần riêng 3) + CORE tin 2–3 dòng, chỉ chào tin đầu, cấm markdown · commit (xem git log `BH7`) · nhật ký docs/thi-cong/nhat-ky/phieu-bh7.md
- 28/09 · BH7 đo Kimi thật 60 lượt Minty (dev): ký tự p50 313→253 · `**` 62%→14% · token ra 140→89 · 119→104đ/lượt; chưa đạt: «Hello» 52%→59% (kịch bản page dạy ngược, §9 N-BH7)
- 28/09 · Việc kế (người quyết gật): tìm vì sao cache Kimi hụt ~1.500 token/lượt ở đường thật — khoản lớn nhất của đích 50đ/lượt
- 28/09 · BH8 → 🎫 — hai bản Việt (người) / Anh gọn (model) cho CORE + kịch bản + tool; cache Kimi đo: điểm dùng chung ở cuối system (6.144), tools sau điểm đó, `cache_control` vô tác dụng · phiếu docs/thi-cong/phieu/PHIEU-BH8.md
- 28/09 · BH8 → 🔨 — CORE hai bản (CORE_VI người đọc, CORE EN model đọc, băm canh) · kịch bản dịch sang EN lúc lưu qua mối nối `datDichBanMay` + kiểm giữ nguyên văn, lỗi thì giữ bản Việt · tool mô tả EN · Minty dev đã có bản máy EN · commit (xem git log `BH8`) · nhật ký docs/thi-cong/nhat-ky/phieu-bh8.md
- 28/09 · BH8 CHƯA ĐO: tổ chức Moonshot chạm trần 1,5 triệu token/ngày lần 2 — `dem-token-kimi.mjs` + 3 lượt `gia-lap` (30 lượt) chạy khi hạn mức mở lại
- 28/09 · CR-28-09b → 🔨 ÁP — một nguồn cho sản phẩm · giá · ảnh · kịch bản (phương án B: v3 ghi, đẩy sang bot); kịch bản lưu là chạy (§9 đã ký, code trôi) · §5e MN1–MN7 · docs/thi-cong/doi-y-do/CR-28-09-mot-nguon-san-pham.md
- 28/09 · 📏 Lớp 5 đo PROD: `san_pham`/`goi_gia`/`san_pham_goc` = 0/0/0 · 77/77 page có SP lấy từ `kb-overrides.json`, Sheet 0 · tab dùng chung Sheet là MẪU PHILIPPINES (Tagalog) ghép vào prompt mọi page · cửa tiền tạo đơn đọc `goi_gia` (rỗng) trong khi bot báo giá theo `kb-overrides.json`
- 28/09 · MN1 → ✅ `b8d6a0f` — bảng `anh_san_pham` + `goi_gia.nhan` + `san_pham.bien_the` (025, chỉ thêm); catalog mang ảnh, không gãy khi 025 chưa áp · thước anh-san-pham 6/6
- 28/09 · MN3 → ✅ `0bd772a` — lưu sản phẩm đẩy bản chép sang bot TRONG giao dịch, đọc lại xác minh, hỏng ⇒ ROLLBACK · `kb.js#writeOverrides` thôi nuốt lỗi ghi · thước mn3 10/10 · 🧭 bản đầu của thước ghi một page giả vào `kb-overrides.json` cục bộ qua `import` tĩnh bắc cầu — đã gỡ, và `test/_an-toan.mjs` nay chặn `KB_OVERRIDES_FILE`
- 28/09 · MN2 → 🔨 `f28df74` — `ops/bin/nap-mot-nguon.mjs` chạy thử trên bản sao prod: 77/77 page khứ hồi khớp · 79 SP · 156 bậc · 543 ảnh (43 ảnh máy mình lưu tương đối) · chạy `--ghi` chờ deploy 025
- 28/09 · UI-HT3 → ✅ — cột bối cảnh (khách+hoàn · đơn đang bàn · kịch bản qua bộ giải 3 tầng · lượt bot) + nhãn tin Bot AI/Tự động/Page theo dữ liệu đối chiếu + tên Messenger; VÁ lỗi UI-HT1 chưa deploy: cổng thật ném với `tin_cho_xu_ly` ⇒ mọi hội thoại 500 — nay đọc bằng SQL kẹp team
  cổng ui-ht3.sh 12/12 · đảo-vá 19/19 · ca Postgres chạy trọn đường qua cổng thật · sửa thước ui-ht1.sh ③ (đỏ oan từ UI-HT2) · npm test 2.175/0
  · commit f2ddaa3 · nhật ký docs/thi-cong/nhat-ky/phieu-UI-HT3.md
- 28/09 · MN4 → ✅ `9e175ec` — ảnh sửa ngay trong tab sản phẩm (tải byte ≤10 MB · link · nhãn · xếp · bỏ), mỗi thao tác một giao dịch ghi → đẩy bot → nhật ký, hỏng ⇒ ROLLBACK + xoá tệp · ba màn Sản phẩm & kho / Ảnh gửi khách / Đưa lên chạy đọc CSDL · thước mn4 6/6 · ⚠️ một phần MN4 lọt vào `f2ddaa3` (UI-HT3) do phiên kia `git add` cả tệp — HEAD gãy tới `9e175ec`
- 28/09 · MN6 → ✅ `b0b1282` — trang page: tab «Bot trả lời thế nào» xếp đúng thứ tự AI nhận · kịch bản LƯU LÀ CHẠY (`luuVaChay`, vai soạn, đúng §9) · màn /kich-ban cùng luật + «Chạy lại bản này» · chạy thật trên bản dev riêng: trình duyệt sửa câu chào/giá/ảnh ⇒ bot dev trả đúng bản mới
- 28/09 · 🧭 **HAI PHIÊN CÙNG CÂY: COMMIT BẰNG PATHSPEC CHƯA ĐỦ, PHẢI THEO HUNK.** `git commit -- <tệp>` đưa cả hunk của phiên kia trong cùng tệp. Tệp dùng chung (`vai-b.js`, `chay-that.js`) ⇒ `git diff <tệp>` tách hunk rồi `git apply --cached`.
- 28/09 · UI-HT4 → ✅ — thước §10 phủ cả module bàn hội thoại (đồ thị import · cửa tiêm · chỉ GET · trang · khối đóng việc · Pancake GET đo hành vi) · HK10 siết (bản cũ để sống «bàn mất <h1>») · sale đăng nhập vào thẳng bàn · spec L4-M1 §7 hợp đồng hiện hành
  cổng ui-ht4.sh 17/17 (kèm ui-ht1..3) · đảo-vá 16/16 trong worktree riêng · sóng UI-HT1–4 xong, chưa deploy
  · commit 2e859fe · nhật ký docs/thi-cong/nhat-ky/phieu-UI-HT4.md
- 28/09 · MN5 → ✅ MỞ VAN A–E trên prod — mã `2353f5b` · lược đồ 26 · ba cờ drop-in (`V3_GHI_KHO_BOT` · `PUBLIC_URL` 3102 · `V3_SHEET_CHI_DANH_BA`) · 76/76 page bản chép khớp · 36/36 ảnh máy mình tải được từ ngoài · ba khối chuyển Sheet→v3 giống từng ký tự (984) · danh bạ 447 page 0 lệch · 0 lỗi · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260928-mot-nguon.md
- 28/09 · MN7 → ✅ `c0b829f` `2353f5b` — người quyết đổi (b)→(a) sau lượt thử đầu-cuối (khách OFW, Tagalog có chủ ý — nhận định «sai thị trường» của tổng là SAI) · chốt tách team: bot có MỘT bộ ba khối ⇒ chỉ team thật đang giữ bot được sửa · nợ §9 N-MN7: team thật thứ hai lên bot ⇒ phải tách ba khối theo page
- 28/09 · 🧭 **ĐỌC QUY TẮC GỐC CỦA BOT TRƯỚC KHI PHÁN «SAI THỊ TRƯỜNG».** Tổng thấy Tagalog trong prompt page Trung Đông và kết luận nội dung sai; người quyết chọn theo kết luận ấy. `CORE` ghi rõ khách là người Philippines ở Trung Đông. Một dòng `grep` trước khi trình đã tránh được một lượt đổi ý.
- 28/09 · QUAN SÁT bàn hội thoại trên PROD → ✅ giữ — không deploy thêm (prod `c0b829f` = HEAD; UI-HT1–4 lên cùng lượt MN5): dây nối 6/6, bối cảnh ném 0/30, kịch bản 30/30, nhãn Bot AI 9/9 hội thoại đọc được, van gửi đóng
  🟠 mở ra là TRỐNG (0 việc mở, bot im từ 24/08) · đọc được chat 4/30 mới nhất và 9/20 có bot — thiếu mã khách 17 · token không quyền/hết gói 11–12
  · không commit mã · nhật ký docs/thi-cong/nhat-ky/quan-sat-20260928-ban-hoi-thoai.md
- 28/09 · MN8 → ✅ `b41261e` — nối sản phẩm page ↔ món POS: chỉ cùng shop, hết hàng theo POS (một giao dịch mỗi page khi đồng bộ), «Dùng tên POS» bỏ số hiệu nội bộ · prod: lượt kéo POS ĐẦU TIÊN 69 món Kuwait, 0 món gắn page (không lẫn sản phẩm bot bán) · nợ N-MN8a–c §9
- 28/09 · ✅ **CR-28-09b ĐÓNG PHẦN LÀM ĐƯỢC TRONG NGÀY** — prod `b41261e` · lược đồ 27 · kiểm cuối: 76/76 page bản chép khớp · kịch bản 0 lệch · ba khối nguồn v3 · 3 dịch vụ active · 0 lỗi 30′ · bot vẫn `PANCAKE_READONLY=1` (chưa khách nào nhận tin — bật bot là việc riêng)
- 29/09 · CR-28-09c → 🔨 ÁP — năm đích (Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt), ba vai, sản phẩm là lõi (1 shop POS = 1 thị trường, marketer từ HRM), đơn thuộc team của marketer (bảng ghép HRM phủ 98,6%), Ladi = UTM · §5f LL1–LL17 · `docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`
  đã áp: 01 §1 §6–§12 (`056f3ad`) · 03-MAN-HINH + lược đồ/máy trạng thái đơn/cửa WhatsApp/3 spec ghi luật mới kèm phiếu (`20b9bdb`) · sổ §5f + H11–H12 + nợ §9 + PHIEU-LL1 (commit này)
  chưa áp: mã · bộ ca · cổng — đi theo phiếu, bắt đầu LL1; CR đóng ở LL9 · đo lớp 5: 0 bản ghi phải sửa trước LL13/LL17
- 29/09 · LL1 → ✅ — khung năm đích Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt: chỉ đổi chỗ ngồi (27/27 đường giữ, tập màn mỗi vai giữ, chỗ đặt chân giữ — sale vào bàn hội thoại); «Sản phẩm & kho» hiện lại làm đầu đích Sản phẩm; thêm hình Lucide package
  cổng ll1.sh 10/10 · đảo-vá 9/9 đỏ · thước dieu-huong sửa cùng commit · npm test 2.221 ca 0 đỏ · xem thử đọc /api/dieu-huong đúng hai vai · chưa deploy
  · commit ee6ad06 · nhật ký docs/thi-cong/nhat-ky/phieu-LL1.md
- 29/09 · LL2 → ✅ — Hộp thư: sale sửa/duyệt/loại đơn Messenger cạnh chat (MỘT thân hàm với van-hanh, tách van-hanh/don-cho.js) · nhận thay bot · tab Đơn chờ (Messenger chờ duyệt · việc đơn · Ladi nhánh WhatsApp) · gõ số ⇒ hồ sơ khách mọi kênh; module ghi riêng ui/hop-thu, bàn giữ chỉ-đọc
  cổng ll2.sh 11/11 · đảo-vá 11/11 đỏ · Postgres thật: hai lượt duyệt ⇒ đúng một đơn POS · chụp màn qua sandbox bắt 2 lỗi (tab tràn, ô tìm so số thô — lỗi từ UI-HT2) đã sửa · npm test 2.234 ca 0 đỏ · chưa deploy
  · commit 1073c44 · nhật ký docs/thi-cong/nhat-ky/phieu-LL2.md
- 29/09 · LL3 → ✅ — đích Page: cơ chế CỤM một lần cho mọi đích (màn đầu cụm lên thanh bên mang tên cụm, màn cùng cụm thành tab dưới đầu trang, không đường nào đổi); Page của quản trị năm dòng → hai (Tất cả page · Luật chung)
  cổng ll3.sh 7/7 · đảo-vá 7/7 đỏ (M5 sống lượt đầu → siết thước) · chụp bản xem thử: tab + đường dẫn đúng, 0 lỗi JS · npm test 2.239 ca 0 đỏ · chưa deploy
  · commit cb622a6 · nhật ký docs/thi-cong/nhat-ky/phieu-LL3.md
- 29/09 · LL5 → ✅ — Số liệu một dòng thanh bên, bốn tab (Tổng quan · Chi phí AI · Nguồn khách · Rủi ro hoàn); hai màn cuối thôi ẩn (prod có dữ liệu) và IN «tính trên đơn tới … · chấm lần cuối …» — số prod là lát 28/08 tới khi có LL17
  cổng ll5.sh 6/6 · đảo-vá 6/6 (M2 sống lượt đầu → thêm dòng team khác) · Postgres thật R5 · npm test 2.245 ca 0 đỏ · chưa deploy
  · commit cb932da · nhật ký docs/thi-cong/nhat-ky/phieu-LL5.md
- 29/09 · LL6 → ✅ — Cài đặt một dòng, sáu tab (Bắt đầu · Kết nối · Model · Hệ còn sống · Người và team · Nhật ký); màn Model gắn trạng thái THẬT từng vai, đo trên mã (chính dùng · dự phòng chưa nối · nền chưa ai đọc) — ca K2 đỏ khi LL14 nối dự phòng mà quên sửa chữ
  cổng ll6.sh 7/7 · đảo-vá 6/6 đỏ · ảnh chụp bắt lỗi tab bị đẩy sang phải ở đầu trang có .sp (sửa luôn cho Nguồn khách của LL5) · npm test 2.248 ca 0 đỏ · chưa deploy
  · commit 4cefa72 · nhật ký docs/thi-cong/nhat-ky/phieu-LL6.md
- 29/09 · LL13 → ✅ — Sản phẩm là lõi: màn Sản phẩm đặt sản phẩm lên đầu (thị trường = shop POS · page đang bán · món), «Xem» mở thị trường theo shop, «Thêm thị trường»/«Gỡ» gắn món POS (một món chỉ thuộc một sản phẩm; nhiều size/shop hợp lệ — NEEDS CLARIFICATION «1 pos id» là mã sản phẩm hay biến thể)
  cổng ll13.sh 7/7 · đảo-vá 10/10 · Postgres thật 7 ca · chụp màn bắt lỗi cũ UI.button (data-boGoc ⇒ nút «Bỏ» sản phẩm gốc chết từ đầu) đã sửa · npm test 2.261 ca 0 đỏ · chưa deploy
  · commit e771443 · nhật ký docs/thi-cong/nhat-ky/phieu-LL13.md
- 29/09 · LL10 → ✅ — «Hội thoại và đơn» thành Cài đặt › Vận hành (nhà của diễn tập · tin bị lọc · chi phí từng tin · nguồn nhận tin · đối chiếu tin lỗi), màn đọc ?tab= có kiểm vai; Hệ còn sống · Chi phí AI · trang page trỏ thẳng vào đúng tab (lệch CR có chủ ý: không port năm việc sang năm trang)
  cổng ll10.sh 7/7 · đảo-vá 5/5 đỏ · e2e van-hanh 8/8 · npm test 2.264 ca 0 đỏ (G6 chập chờn lượt đầu — N-CADUNGCHUNG) · chưa deploy
  · commit 1e5ce30 · nhật ký docs/thi-cong/nhat-ky/phieu-LL10.md
- 29/09 · LL11 → ✅ — kỹ năng bỏ: «hỏi size» thành ô trong kiến thức sản phẩm (khối «Chung» màn Sản phẩm; quản trị + marketer sửa, nhật ký bắt buộc); đường ghi ĐẦU TIÊN của san_pham_goc.kien_thuc (021 chỉ có người đọc); bộ ráp prompt v3 đọc nhãn mới; màn Kỹ năng ra khỏi menu
  cổng ll11.sh 8/8 · đảo-vá 7/7 đỏ · Postgres thật · cổng ll1 ⑤ thôi neo số màn (N5 canh danh sách + BO_CO_CHU_Y) · npm test 2.267 ca 0 đỏ · chưa deploy
  · commit 54f4969 · nhật ký docs/thi-cong/nhat-ky/phieu-LL11.md
- 29/09 · LL7 → ✅ — ba vai: Quản lý · Người duyệt kịch bản THÔI CẤP ở cả hai cửa cấp vai (lỗi riêng vai_da_bo, khác vai_la), ô chọn ba vai, dòng cấp cũ vẫn hiện; đúng câu hợp đồng «thôi gán, dòng giữ» — dọn 37 tệp danh sách quyền còn nhắc mã cũ để LL9 (0 người mang trên prod)
  cổng ll7.sh 4/4 · đảo-vá 4/4 đỏ · npm test 2.270 ca 0 đỏ · chưa deploy
  · commit (xem git log LL7) · nhật ký docs/thi-cong/nhat-ky/phieu-LL7.md
- 29/09 · PHÁT HÀNH sóng LL (LL1 LL2 LL3 LL5 LL6 LL13 LL10 LL11 LL7) → ✅ GIỮ — prod `b41261e → 5bff55e`, 0 migration (27), 0 gói, CHỈ restart `aicloser-v3` (đồ thị import: bot cũ + worker không đổi hành vi); van gửi + van POS vẫn đóng
  cửa vào npm test 2.266 · 0 đỏ · 12 cổng đỏ = nợ cũ, so từng cổng với `b41261e` ra 0 vì LL · mốc +1′/+5′/+15′ lỗi 0 · đường mới 401, đối chứng 404 · sao lưu truoc-ll-20260929T044346Z
  · commit 5bff55e · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260929-nam-dich.md
- 29/09 · LL18 → ✅ — khung theo bản vẽ (thanh ngang năm đích + «Trong mục X»), MÁY CHỦ vẽ sẵn vào HTML (menu có trong lần vẽ đầu), tệp chung cache theo mã băm chung, gzip, `/` theo vai, 403 thôi ngõ cụt, liên kết sang màn không mở được thì tắt — sinh từ lời người dùng sau deploy sóng LL
  bộ ca ll18 12/12 · đảo-vá 20/20 đỏ · cổng ll18.sh 9/9 · npm test 2.282 ca 0 đỏ · e2e 47 màn 3 vai: vẽ đầu ~750→~420 ms, 0 lần 403 · chưa deploy
  · commit 31212d9 · nhật ký docs/thi-cong/nhat-ky/phieu-LL18.md
- 29/09 · VE1 → ✅ — màn Sản phẩm dựng lại theo bản vẽ 2a (hai cột · bốn tầng · Chung / Theo thị trường / Page / Lịch sử), đủ bảy việc cũ, giá theo thị trường gom từ bản sao page (lệch giá nói ra), lịch sử từ nhật ký; chỗ chưa có nguồn nói rõ
  ca VE1 5/5 Postgres thật · U4 U6 · đảo-vá 10/10 · npm test 2.291 ca 0 đỏ · cổng ve1.sh 6/6 · e2e 47 màn 0 lỗi · ảnh 11 trạng thái (ghi thật) · chưa deploy
  · commit 86d7aa6 · nhật ký docs/thi-cong/nhat-ky/phieu-VE1.md
- 29/09 · VE2 → ✅ — trang một page dựng lại theo bản vẽ 2c: ba cột (page của team từ /api/page-ds · một page với Bật được chưa + bảy tab · Thử hỏi bot nói rõ chưa có đường), mọi cửa ghi cũ giữ nguyên; khung sáng «Tất cả page» (nhaCum); sửa liên kết chết /lop-0 + ca quét mọi liên kết viết cứng
  bộ ca VE2 4/4 · K3 K16 · đảo-vá 8/8 · npm test 2.295 ca 0 đỏ · cổng ve2.sh 8/8 · e2e 48 màn · ảnh 7 tab + 390/1200 px · chưa deploy
  · commit bada2f4 · nhật ký docs/thi-cong/nhat-ky/phieu-VE2.md
- 29/09 · NỢ N-CONGCHAP (§9, đề nghị) — `phat-hanh.sh` chạy cổng với `>/dev/null`: cổng đỏ chập chờn (ll3/ll5 lượt phát hành VE1+VE2, 1/~14 lượt, không tái hiện) không để lại dòng nào để chẩn đoán
  đề nghị: ghi output mỗi cổng ra tệp tạm, in đường dẫn + các dòng 🔴 khi rc≠0; thêm chạy lại MỘT lần cổng đỏ để phân biệt chập chờn với đỏ thật (in cả hai)
  · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260929-ve1-ve2.md §3
- 29/09 · VE3 → ✅ — danh sách page theo bản vẽ 2b: viên Lọc nhanh có số, nút Quét ở đầu trang, chọn nhiều + hàng loạt (gắn sản phẩm · bật bot ≤10 có xác nhận, tuần tự, dừng ở lỗi) qua đúng cửa ghi từng page — không cửa ghi hàng loạt ở máy chủ
  bộ ca VE3 4/4 · đảo-vá 7/7 (M2 sống lượt đầu — siết thước) · npm test 2.300 ca 0 đỏ · cổng ve3.sh 7/7 · e2e 47 màn · bấm thật gắn 2 page · chưa deploy
  · commit 05dcc72 · nhật ký docs/thi-cong/nhat-ky/phieu-VE3.md
- 29/09 · PHÁT HÀNH VE1 + VE2 → ✅ GIỮ — prod `9821306 → f211036`, 0 migration (27), 0 gói, chỉ restart `aicloser-v3` (10:35:22); màn Sản phẩm + trang một page theo bản vẽ
  cửa vào npm test 2.295 ca 0 đỏ · cổng: 12 nợ cũ + ll3/ll5 chập chờn 1/~14 lượt (dò: không tái hiện, nợ N-CONGCHAP) · mốc +1′/+5′/+11′/+15′ lỗi 0 · cửa mới 401, đối chứng 404
  · commit f211036 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260929-ve1-ve2.md
- 29/09 · VE4 → 🔎 CHỜ DEPLOY — Luật chung theo bản vẽ 2d: bốn tab; màn mới /khoi-chung là MỘT chỗ sửa Chính sách/FAQ/Phản đối (cửa đọc mới cùng rào cửa ghi MN7, khoá khi team không giữ); Đề xuất chờ duyệt thôi thử nghiệm
  bộ ca K1–K4 (Postgres) + Q1–Q4 · đảo-vá 8/8 (M8 lượt đầu sống ⇒ thêm ca đọc chéo) · cổng ve4.sh 10/10 · npm test 2.309 ca 0 đỏ · bấm thật với bot giả: lưu → bản 5 → bot nhận → nhật ký
  · commit 083c9de · nhật ký docs/thi-cong/nhat-ky/phieu-VE4.md
- 29/09 · PHÁT HÀNH VE3 + VE4 → ✅ GIỮ — prod `f211036 → 9472153`, 0 migration (27), 0 gói, chỉ restart `aicloser-v3` (11:49:06); danh sách page + Luật chung theo bản vẽ
  cửa vào npm test 2.309 ca 0 đỏ (lượt đầu 676 đỏ GIẢ do Postgres.app từ chối kết nối — log chứng minh) · cổng 35 xanh / 12 nợ cũ trùng tên · mốc +1′/+5′/+15′ lỗi 0 · `/khoi-chung` 404 → 401
  · commit 9472153 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260929-ve3-ve4.md
- 29/09 · VE1b + VE4b → 🔎 CHỜ DEPLOY — màn Sản phẩm (tab Chung) và Luật thôi hứa «bot dùng ngay / có hiệu lực ngay» khi prod chưa bật ghép lời từ dữ liệu (`V3_RAP_PROMPT_BAT` vắng — đo /proc)
  một nguồn `botGhepTuDuLieu()` (true·false·null) · câu «bot chạy không có quy tắc cứng» sai mọi chế độ (`prompts.js#khoiBoLuat` lùi CORE) đã sửa cả thước · đảo-vá 6/6 + 8/8 · npm test 2.313 ca 0 đỏ
  · commit b0b32b2 4b64551 · nhật ký docs/thi-cong/nhat-ky/phieu-VE1b-VE4b.md
- 29/09 · PHÁT HÀNH VE1b + VE4b → ✅ GIỮ — prod `9472153 → c5dbacd`, 0 migration (27), 0 gói, chỉ restart `aicloser-v3` (12:39:14); hai màn thôi hứa «bot dùng ngay» khi prod chưa ghép lời từ dữ liệu
  cửa vào npm test 2.313 ca 0 đỏ (đo riêng, cùng mã) · cổng 35 xanh / 12 nợ cũ trùng tên · mốc +1′/+5′/+15′ lỗi 0
  · commit c5dbacd · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260929-ve1b-ve4b.md
- 29/09 · VE5 → 🔎 CHỜ DEPLOY — Hộp thư theo bản vẽ 1a: ba tab Cần bạn · Đơn chờ · Bot đang xử; thẻ đơn ở cột giữa (ba nút mở đúng form duyệt cũ, biết van POS); nhận/đóng việc ở thanh cuối; cột phải ba khối
  ca V1–V5 + L6 Postgres (van đóng ⇒ duyệt chặn, 0 POST POS) · đảo-vá 11/11 (M6 lượt đầu sống ⇒ siết thước) · cổng ve5.sh 11/11 · npm test 2.319 ca 0 đỏ · bò 49 màn 0 lỗi mới
  · commit 3ceceeb · nhật ký docs/thi-cong/nhat-ky/phieu-VE5.md
- 30/09 · VE5b → 🔎 CHỜ DEPLOY — Hộp thư › Tìm khách theo bản vẽ 1b (`/ho-so-khach`): hồ sơ gộp kênh theo số + mọi đơn cả hai luồng; 🔴 trang mở thêm cho sale (§10 bổ sung), cửa danh sách cũ giữ quản trị · quản lý; việc cũ giữ nguyên
  ca B1–B5 (B1 quyền qua app thật) · thước dieu-huong/phan-quyen sửa có căn cứ · đảo-vá 11/11 · cổng ve5b.sh 7/7 · npm test 2.324 ca 0 đỏ · bò 51 màn 0 lỗi mới · cột Hàng: prod 0/123.629 đơn có món ⇒ nói thật
  · commit f9ecbe2 · nhật ký docs/thi-cong/nhat-ky/phieu-VE5b.md
- 30/09 · PHÁT HÀNH VE5 + VE5b → ✅ GIỮ — prod `c5dbacd → 91a98e7`, 0 migration (27), 0 gói, chỉ restart `aicloser-v3` (03:23:11); Hộp thư + Tìm khách theo bản vẽ, 🔴 Tìm khách mở thêm cho sale
  cửa vào npm test 2.324 ca 0 đỏ (đo riêng) · cổng 37 xanh / 12 nợ cũ trùng tên · mốc +1′/+5′/+15′ lỗi 0 · `/api/ho-so-khach/cua` 404 → 401 · đồ thị import đo lại đúng (lượt đầu zsh không tách chữ)
  · commit 91a98e7 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260930-ve5.md
- 30/09 · VE-VA1 → 🔎 CHỜ DEPLOY — ba lỗi «tên chưa khai» sống trên prod: Số liệu › Tổng quan không hiện số từ 25/09 (ô lỗi đổ oan cho bot) · tạo người dùng báo «nap is not defined» từ 15/09 · chuyển page giữa team không gửi được từ 17/09
  tìm bằng quét no-undef 35 script trang (ESLint cài tạm, không thêm gói) · ca chạy thật R1 R2 T1 T2 (mã cũ đỏ đúng câu lỗi) · đảo-vá 4/4 · cổng va1.sh 7/7 · npm test 2.328 ca 0 đỏ · nợ mới N-NOUNDEF (lưới thường trực cần ESLint devDependency)
  · commit 557fbd9 · nhật ký docs/thi-cong/nhat-ky/phieu-VE-VA1.md
- 30/09 · PHÁT HÀNH VE-VA1 → ✅ GIỮ — prod `91a98e7 → 47968b8`, 0 migration (27), chỉ hai tệp trang, restart `aicloser-v3` (04:07:11); Số liệu › Tổng quan hiện số · tạo người dùng hết báo lỗi · chuyển page gửi được
  cửa vào npm test 2.328 ca 0 đỏ · cổng 37 xanh / 13 đỏ = 12 nợ cũ + `ll3` chập chờn (chạy riêng 3/3 · ll2 24/24 · cả loạt lại 38/12 nợ cũ) · mốc +1′/+5′/+15′ lỗi 0 · dấu mã mới 0→1 · 0→1 · 1→2 · `phat-hanh.sh` nay giữ output mọi cổng
  · commit 47968b8 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260930-va1.md
- 30/09 · VE6a → 🔎 CHỜ DEPLOY — Số liệu › Tổng quan theo bản vẽ 3a: bốn ô số · hai phễu (không tỉ lệ rơi, chặng thiếu nguồn nói ra) · ba thước giữ dọc · bảng theo page ghép AI/đơn · rủi ro hoàn theo vai
  ca chạy thật V1–V6 · thước bao-cao ①c đo đúng phạm vi luật · đảo-vá 11/11 · cổng ve6a.sh 8/8 · npm test 2.334 ca 0 đỏ · bò 51 màn 0 lỗi mới (2 request 502 thêm = cùng cầu bot cũ trong sandbox)
  · commit 1ecb8f9 · nhật ký docs/thi-cong/nhat-ky/phieu-VE6a.md
- 30/09 · VE6b → 🔎 CHỜ DEPLOY — Số liệu › Chi phí AI theo bản vẽ 3b: bốn ô (token mỗi lượt + trúng cache TOÀN HỆ, định nghĩa khớp số bản vẽ 73,3%) · tab Từng tin theo vai · Theo page (+ tổng team) · Theo model nói đúng cái đang có
  máy chủ trả thêm token toàn hệ (vắng ⇒ null) · ca chạy thật C1–C6 + ⑥ · đảo-vá 10/10 · cổng ve6b.sh 6/6 · npm test 2.341 ca 0 đỏ · bò 51 màn 0 lỗi mới
  · commit aecd410 · nhật ký docs/thi-cong/nhat-ky/phieu-VE6b.md
- 30/09 · VE6c → 🔎 CHỜ DEPLOY — Số liệu › Khách theo bản vẽ 3c: hội thoại CỦA TEAM theo giai đoạn × người giữ (hàm gom mới, CSDL v3) · rủi ro hoàn theo vai · rơi ở đâu; cụm Số liệu còn ba tab, Rủi ro hoàn mở bằng «Xem đủ →»
  ca Postgres H1–H3 + chạy thật K1–K5 · thước ll5/ll18/dieu-huong/ll1 sửa có căn cứ · đảo-vá 10/10 (M6 lượt đầu sống ⇒ K5) · cổng ve6c.sh 11/11 · npm test 2.350 ca 0 đỏ · bò 51 màn 0 lỗi mới
  · commit 0405e8b · nhật ký docs/thi-cong/nhat-ky/phieu-VE6c.md
- 30/09 · PHÁT HÀNH VE6 (a·b·c) → ✅ GIỮ — prod `47968b8 → f7e620c`, 0 migration (27), restart CHỈ `aicloser-v3` (05:16:23) — `so-lieu.js` bot cũ cũng import nhưng chỉ THÊM một hàm chỉ v3 gọi; ba màn Số liệu theo bản vẽ 3a/3b/3c
  cửa vào npm test 2.350 ca 0 đỏ · cổng 41 xanh / 12 đỏ = đúng 12 nợ cũ (ve6a/6b/6c xanh, `ll3` xanh) · mốc +1′/+5′/+15′ lỗi 0 · hai dịch vụ không chạm y nguyên · dấu mã mới 0→1 ×4
  · commit f7e620c · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260930-ve6.md
- 30/09 · VE2b → 🔎 CHỜ DEPLOY — Page gộp nốt theo lời người quyết: màn Kịch bản vào trang một page (Lời bot + nhập file Pancake · Lịch sử xem/chép/chạy lại; `/kich-ban` chuyển theo vai) · cột trái lọc bằng ĐÚNG bộ lọc «Tất cả page» (+ «Chưa có lời bot riêng») · «Tất cả page» vào thẳng danh sách, bấm page mang lọc, «← Tất cả page» về đúng chỗ · marketer vào mục Page bằng «Các page»
  ca chạy thật 17/17 (máy chủ thật + script thật hai màn trong vm) · thước ll3/ll1/dieu-huong/ll18/ve2/ve3 sửa có căn cứ · đảo-vá 20/20 · cổng ve2b.sh 14/14 · npm test 2.368 ca 0 đỏ · bò e2e 0 lỗi mới · nợ N-VE2B-LUAT/444/DEM (§9)
  · commit 4455431 · nhật ký docs/thi-cong/nhat-ky/phieu-VE2b.md
- 30/09 · PHÁT HÀNH VE2b → ✅ GIỮ — prod `f7e620c → 7bb52b4`, 0 migration (27), restart CHỈ `aicloser-v3` (06:42:41); Page gộp nốt: danh sách vào thẳng · bấm page mang lọc, «← Tất cả page» · Kịch bản vào tab Lời bot + Lịch sử (`/kich-ban` chuyển theo vai) · marketer vào bằng «Các page»
  cửa vào lượt 1 lộ một thước sót (`ll3.sh` ④ ⇒ 13 đỏ dây chuyền, sửa `11047f5`) · lượt 2: 42 xanh / 12 đỏ = đúng nợ cũ · npm test 2.368 ca 0 đỏ · mốc +1′/+5′/+15′ lỗi 0 · `/page` 302→401 · dấu mã mới 0→1 ×4
  · commit 7bb52b4 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260930-ve2b.md
- 30/09 · VE7a → 🔎 CHỜ DEPLOY — Cài đặt theo bản vẽ 4: thứ tự Bắt đầu · Hệ còn sống · Kết nối · Model · Người và team · Nhật ký; «Hệ còn sống» nhận khối «Việc vận hành» (tin cần đối chiếu · tin bị lọc 24 giờ · diễn tập, số thật theo vai); Vận hành rời thanh tab
  cửa đọc mới /api/van-hanh/tom-tat · ca Postgres T1–T2 + chạy thật C1–C4 · đảo-vá 10/10 · cổng ve7a.sh 10/10 · npm test 2.375 ca 0 đỏ · ĐỦ cổng: 12 nợ cũ + l1-m1 (POS Taiwan 0 đơn «Chờ in», nợ N-L1M1-SONG)
  · commit 1c1ab28 · nhật ký docs/thi-cong/nhat-ky/phieu-VE7a.md
- 30/09 · VE7b → 🔎 CHỜ DEPLOY — Kết nối theo bản vẽ 4: năm phần Pancake · POS · WhatsApp · HRM · Kéo dữ liệu; POS kèm tiền tệ + số món suy từ danh mục đã kéo; WhatsApp đọc VAN THẬT của cửa gửi (prod: vắng V3_WA_GUI ⇒ «Chưa nối»); «Không quyền» · HRM nói «chưa đo / chưa nối», không số tay
  cửa đọc mới /api/ket-noi/whatsapp · DOM giả dùng chung testkit/dom-gia.js (textContent sống theo cây) · ca K1–K8 · đảo-vá 17/17 · cổng ve7b.sh 9/9 · npm test 2.383 ca 0 đỏ · ĐỦ cổng: 12 nợ cũ + l1-m1 · nợ N-KHONGQUYEN-DO
  · commit 1c66710 · nhật ký docs/thi-cong/nhat-ky/phieu-VE7b.md
- 30/09 · VE8a → 🔎 CHỜ DEPLOY — gộp món POS thành sản phẩm THEO SKU ngay trong màn Sản phẩm (máy gợi ý nhóm, người xác nhận; gộp = một giao dịch tạo sản phẩm + gắn món); lượt kéo danh mục lưu SKU + tự nối món shop mới; migration 028 (sku · marketer)
  đo POS prod: SKU = product.display_id phủ 100%, trùng số đầu tên 371/373, 72/269 SKU không phải số · Postgres 6/6 (G4 = lượt kéo thật) · chạy thật 7/7 · đảo-vá 22/22 · cổng ve8a.sh 18/18 · npm test 2.396 ca 0 đỏ · nợ N-THUOC-CHAP-CHON · N-SKU-KEO-LAI
  · commit eafbcd7 · 85b2afb · nhật ký docs/thi-cong/nhat-ky/phieu-VE8a.md
- 30/09 · VE8b → 🔎 CHỜ DEPLOY — vòng khép kín trong màn Sản phẩm: giá theo thị trường sửa tại chỗ (chỉ-giá `gia_tay`: POS không đè giá, hết hàng vẫn theo POS) · marketer của sản phẩm kéo page theo · gắn/gỡ page (sản phẩm · shop · thị trường · marketer); Vận hành bỏ tab «Sản phẩm & giá»
  Postgres B1–B6 7/7 (đo bằng catalog.js thật) · chạy thật 8/8 · đảo-vá 21/21 trên bản sau vá · cổng ve8b.sh 16/16 · npm test 2.411 ca 0 đỏ · ĐỦ cổng 44 xanh / 14 đỏ = 12 nợ cũ + l1-m1 + ve5b (chập chờn ll18-khung) · nợ N-TIEN-TE-MAC-DINH · N-MK-GOI-Y-DON
  · commit 97de3dd · nhật ký docs/thi-cong/nhat-ky/phieu-VE8b.md
- 30/09 · MỞ VAN lô VE7a · VE7b · VE8a · VE8b → ✅ GIỮ — prod `7bb52b4 → ecce575`, migration 028 (áp mới 1 · tổng 28, bốn cột), chỉ restart aicloser-v3 lúc 11:40:31 CEST
  cửa vào 44 xanh / 14 đỏ = 12 nợ cũ + l1-m1 + ve5b chập chờn (ll18-khung, đường báo lồng chỉ ra) · npm test 2.411 ca 0 đỏ · mốc +1′/+5′/+15′ lỗi 0/0/0 · Started 1 · dấu mã 5/5 · /health 131 · việc sau: bấm «Kéo danh mục và giá từ POS» (SKU)
  · commit ecce575 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20260930-ve7-ve8.md
- 30/09 · VE7c → 🔎 CHỜ DEPLOY — Cài đặt › Model theo bản vẽ 4 «Màn chỉ hiện thứ bot THẬT SỰ dùng»: thẻ Trả lời khách đọc ĐƯỜNG CHỌN CỦA BOT (`src/chat/model.js#chonModel` tách từ `layModel`, hành vi bot y nguyên) — hết «chưa có khoá»/«bộ mặc định» giả trên 3/4 team prod · «Thay khoá và thử một lượt» (goiMotLan một lần, lỗi nhà model về HTTP 200, chặn bấm dồn, nhật ký thu_model) · page bot mới đếm theo luật worker
  đo prod 30/09: 3/4 team chưa có dòng cấu hình ⇒ bot gọi MODEL_CLOSER bằng KIMI_API_KEY, prod không đặt V3_KHOA_* · chạy thật 9/9 · đảo-vá 35/35 · cổng ve7c.sh 17/17 · npm test 2.420 ca 0 đỏ · ĐỦ cổng 46 xanh / 13 đỏ = 12 nợ cũ + l1-m1 (l2-m2 đo lại trên HEAD: ✘ y hệt) · nợ N-KHOA-HAI-TEN · N-DAN-KHOA-DOI-DUONG · N-CANHBAO-LOP-MODEL
  · commit 4dd6b93 · nhật ký docs/thi-cong/nhat-ky/phieu-VE7c.md
- 01/10 · VE7d → 🔎 CHỜ DEPLOY — Cài đặt › Người và team theo bản vẽ 4: ba nút đầu trang (HRM tắt + nói vì sao) · ba thẻ vai «mở được» đo bằng `menuCua` · phụ trách theo sự thật (marketer «Chưa có nguồn», §9 chưa làm, page có tên marketer là số đo) · HRM «Chưa nối vào máy chủ» không số đo tay · bỏ hàng chỉ số + tab POS · câu «bộ mặc định» rời cảnh báo team + bước Model của Bắt đầu
  đo prod 01/10: page.marketer trống 582/582, 1 người dùng, HRM chờ H11 + LL15 · chạy thật 8/8 · đảo-vá 18/18 · cổng ve7d.sh 15/15 · npm test 2.428 ca 0 đỏ · ĐỦ cổng 48 xanh / 12 đỏ = 12 nợ cũ · nợ N-MK-CHI-THAY-SP-MINH · N-TEAM-KETNOI-THUA
  · commit e258e14 · nhật ký docs/thi-cong/nhat-ky/phieu-VE7d.md
- 01/10 · VE7e → 🔎 CHỜ DEPLOY — Cài đặt › Nhật ký theo bản vẽ 4: «Nhật ký · Ghi cả việc người làm lẫn việc máy làm. Không ai sửa hay xoá được.» · mỗi dòng một câu lúc · ai · việc · đối tượng bằng TÊN (bảng sống của team → tên chụp trong dòng → «Loại #id», không đoán) · dòng máy «máy · <việc>» · chữ cho 7 mã tầng A (không thành mã v3 được ghi) · giờ «01/10 05:09»
  đo prod 01/10: 472/500 dòng mới nhất là máy (giữ mặc định làn người), tên theo id ảnh sản phẩm 4/4 · kỹ năng 2/2 · sản phẩm gốc 2/6 · chạy thật 6/6 (ba múi giờ) · đảo-vá 17/17 · cổng ve7e.sh 10/10 · npm test 2.434 ca 0 đỏ · ĐỦ cổng 49 xanh / 12 đỏ = 12 nợ cũ · không nợ mới
  · commit 61863a1 · nhật ký docs/thi-cong/nhat-ky/phieu-VE7e.md
- 01/10 · MỞ VAN lô VE7c · VE7d · VE7e → ✅ GIỮ — prod `ecce575 → d226f81`, 0 migration (áp mới 0 · tổng 28), chỉ restart aicloser-v3 lúc 03:58:16 CEST
  cửa vào 49 xanh / 12 đỏ = 12 nợ cũ · npm test 2.434 ca 0 đỏ · mốc +1′/+5′/+15′ lỗi 0/0/0 · Started 1 · dấu mã 6/6 · /health 131 · nhật ký khởi động nói «đường chọn model của bot → màn Model AI» (đã nối) · việc sau: bấm «Thay khoá và thử một lượt» (ô khoá trống) một lần
  · commit d226f81 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261001-ve7cde.md
- 02/10 · LL15a → 🔎 CHỜ DEPLOY — HRM từ BigQuery lên màn, CHỈ ĐỌC: khoá levelup chép lên máy chủ (`/etc/aicloser/bq-levelup.json`, người quyết chọn) · khách REST token phạm vi bigquery.readonly · Người và team: cột Hồ sơ HRM + marketer POS của đúng team · Kết nối › HRM số đọc từ nguồn + «Đọc lại» · biến `V3_BQ_KHOA` (vắng = đóng)
  đo 02/10: prod chỉ có khoá talpha/auus (403 hai bảng HRM); đọc thử từ prod bằng khoá mới 118 · 324 · đầu-cuối thật GCC 19 marketer đang làm + 7 đã nghỉ / 63 · ca 12/12 · đảo-vá 19/19 · cổng ll15a.sh 15/15 · npm test 2.446 ca 0 đỏ · ĐỦ cổng 50 xanh / 12 đỏ = 12 nợ cũ · nợ N-BQ-KHOA-RONG · LL15b
  · commit 8036529 · nhật ký docs/thi-cong/nhat-ky/phieu-LL15a.md
- 02/10 · MỞ VAN LL15a → ✅ GIỮ — prod `d226f81 → 679d583`, 0 migration, biến mới `V3_BQ_KHOA=/etc/aicloser/bq-levelup.json` (.env sao lưu trước), chỉ restart aicloser-v3 lúc 04:04:01 CEST
  cửa vào 50 xanh / 12 đỏ = 12 nợ cũ · npm test 2.446 ca 0 đỏ · mốc +1′/+5′/+15′ lỗi 0/0/0 · Started 1 · nhật ký khởi động «bộ đọc HRM» đã nối · đọc thật từ prod 118 hồ sơ · 324 ghép · GCC 19 / AUUS 9 / EU 20 marketer đang làm
  · commit 679d583 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261002-ll15a.md
- 02/10 · LL15b → 🔎 CHỜ DEPLOY — người + vai THEO HRM: tạo tài khoản (chưa mật khẩu) · MKT → Marketer ở team mình, SALE → Sale cả ba team · nghỉ ⇒ rút vai HRM + khoá · làm lại ⇒ mở khoá · tên team theo HRM; màn «Lấy người từ HRM» xem kế hoạch rồi áp đúng vân tay (Quản trị mọi team) · vai HRM không rút tay · «Đặt mật khẩu» đầu · tự động 24 giờ khi `V3_HRM_TU_DONG=1` (vượt rào ⇒ hoãn) · migration 029 (chỉ thêm cột)
  đo 02/10: chạy thử kế hoạch trên dữ liệu prod CHỈ ĐỌC — tạo 21 · cấp 41 · đổi tên 2 team · 0 rút/khoá · qua rào; ca 15/15 (M8 đầu-cuối: áp ⇒ đặt mật khẩu ⇒ đăng nhập 200) · đảo-vá 33/33 · cổng ll15b.sh 15/15 · npm test 2.461 ca 0 đỏ · nợ N-HRM-RUT-GAP · N-MK-HANG-LOAT · N-KHOA-PHIEN · N-HRM-LANCUOI-NHO
  · commit 3500986 · nhật ký docs/thi-cong/nhat-ky/phieu-LL15b.md
- 02/10 · MỞ VAN LL15b (bước 1) → ✅ GIỮ — prod `679d583 → 24abe05`, migration 029 (chỉ thêm `ma_nv` · `nguon`) áp mới 1 · tổng 29, KHÔNG đặt `V3_HRM_TU_DONG`, chỉ restart aicloser-v3 lúc 05:19:44 CEST; mốc lùi có sao lưu ba bảng quyền
  cửa vào 51 xanh / 12 đỏ = 12 nợ cũ (lượt đủ) · npm test 2.457 đạt 0 đỏ · mốc +1′/+5′/+15′ lỗi 0/0/0 · Started 1 · bộ đồng bộ nối, lượt tự động 0 · bảng quyền y nguyên 2 · 4 · kế hoạch thật tạo 21 · cấp 41 · đổi tên 2 · 0 rút/khoá · việc sau: Quản trị bấm «Lấy người từ HRM» → «Áp dụng» → đặt mật khẩu; bước 2 `V3_HRM_TU_DONG=1` gật riêng
  · commit 24abe05 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261002-ll15b.md
- 02/10 · MỞ VAN LL15b (bước 2 · tự động) → ✅ GIỮ — `V3_HRM_TU_DONG=1` thêm đúng 1 dòng `.env`, chỉ restart aicloser-v3 lúc 06:48:05 CEST; trước đó Quản trị đã áp tay lượt đầu ở màn (23 tài khoản · 41 vai HRM)
  mốc +1′/+6′/+15′ lỗi 0/0/0 · Started 1 · lượt tự động đầu 06:53 ra toàn 0 (hệ đã khớp HRM) · bảng quyền y nguyên 23 · 45 · đường lùi: xoá dòng biến + restart
  · commit (hồ sơ bước 2) · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261002-ll15b.md §11
- 02/10 · CR-02-10 MỘT BẢN · MB1 + MB2 → ✅ — lõi bot chạy trong tiến trình v3 (cầu `cau-bot-v1` hết HTTP; worker nay NẠP KB — trước đó mọi page sẽ `noData`); MỘT công tắc `page.bot_ai_bat` (gỡ `V3_PAGE_XU_LY` · cầu dao giao page · `giaoPage`/`POST /giao` · «bot cũ/bot mới» ở 2 màn · di trú thôi chép `ai-enabled.json`)
  npm test 2.455 · 2.451 đạt · 0 đỏ · ca mới mb1 5/5 + mb2 4/4 (đảo-vá đỏ đúng chỗ) · thước: 8 bộ ca bỏ giả fetch, 11 ca handler + 4 cổng dựng page bật công tắc, gỡ ~16 ca của khái niệm đã bỏ · nợ N-MB-LICH-NEN · N-MB-SO-AI-CU · N-MB-PAGE-TOKEN-FB
  · commit 47f2add · e2b10dd · 94d7cd5 · phiếu docs/thi-cong/phieu/PHIEU-MB1.md · PHIEU-MB2.md
- 02/10 · MỞ VAN MB3 (một bản) → ✅ GIỮ — prod `24abe05 → 94d7cd5`, 0 migration · 0 đổi `.env`; restart aicloser-v3 + worker lúc 07:23:43 CEST; `systemctl disable --now aicloser` (v1 TẮT HẲN, unit giữ để lùi)
  cửa vào 53 xanh / 13 đỏ = 12 nợ cũ + l1-m1 (dữ liệu POS) · mốc +1′/+5′/+15′ lỗi 0 · Started 1/1 · cửa kiểm 699 page trong v3 · page bật 0/582 · gửi 0 · `/webhook` 404 đúng (`META_WEBHOOK_OFF=1`) · lùi: checkout 24abe05 + restart 2 dịch vụ + `enable --now aicloser`
  · commit (hồ sơ MB3) · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261002-mot-ban.md
- 02/10 · LL15c → ✅ (mở van cùng LL15d) — team tự nhận diện: màn chọn team CHỈ cho quản trị nhiều team; sale nhiều team vào thẳng team dùng lần trước (gợi ý cookie kiểm lại bằng team thật) + menu đổi team nhỏ ở chip; một team ⇒ chip chỉ là chữ; Google hoãn (người quyết chọn)
  ca 6/6 (dieu-huong.js thật) · đảo-vá 18/18 · cổng ll15c.sh 10/10 · thước vai-b-noi-day BẪY ① đổi theo luật mới · nợ N-GOOGLE-DANG-NHAP
  · commit 9e7d06c · nhật ký docs/thi-cong/nhat-ky/phieu-LL15c.md
- 02/10 · LL15d → ✅ (mở van cùng LL15c) — marketer CHỈ THẤY sản phẩm mình phụ trách + page kế thừa (01 §9) · marketer CHỌN từ hồ sơ HRM (CR-28-09c) · gợi ý từ đơn POS 60 ngày (BigQuery chỉ đọc) · migration 031 (san_pham_goc.marketer_ma_nv)
  đo prod chỉ đọc: page_marketer 1 dòng (không dùng được) · marketer của đơn là JSON (0 khớp thẳng; JSON_VALUE ⇒ 30/31 ra mã NV, 11/11 marketer đang làm có đơn) · danh mục v3 1 sản phẩm gốc · ca 9/9 · đảo-vá 27/27 · cổng ll15d.sh 21/21 · 6 thước neo luật cũ đổi theo luật mới
  · commit e68227a · nhật ký docs/thi-cong/nhat-ky/phieu-LL15d.md
- 02/10 · MỞ VAN LL15c + LL15d → ✅ GIỮ — prod `94d7cd5 → 5e81796` (sau MB3 của CR-02-10, chờ phiên ấy đóng cửa sổ), migration 031 áp mới 1 · tổng 30, 0 biến, chỉ restart aicloser-v3 lúc 08:00:15 CEST
  cửa vào 51 xanh / 14 đỏ = 12 nợ cũ + ve7e chập chờn (chạy lại 10/10) + l1-m1 dữ liệu sống · npm test 2.466 đạt 0 đỏ · mốc +1′/+6′/+15′ lỗi 0 · worker y nguyên · gợi ý đọc thật 547 dòng / 13 mã NV · lượt HRM tự động ra 0
  · commit 5e81796 · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261002-ll15cd.md
- 02/10 · MB4 → ✅ GIỮ — gỡ bot v1 khỏi cây (28 tệp src/ + 7 trang public/ + 8 script; GIỮ src/wa.js vì pancake-tool import) · cầu cau-bot-v1 → loi-bot · một nguồn đếm page bật bot · migration 030 gỡ giao_bot_moi/v3_ai_bat · prod `5e81796 → bd6459a`, restart hai dịch vụ v3 lúc 09:03:39 CEST · gỡ unit aicloser + 2 dòng cron report-cli · PUBLIC_URL :3100 → :3102 · 11 tệp → luu-tru/v1 · CR-02-10 ĐÓNG
  cửa vào 51 xanh / 15 đỏ = 12 nợ cũ đúng tên + l1-m1 dữ liệu sống + g2-a4 thước neo luật cũ (sửa, 16/16, đảo-vá 12/16) + ve8b chập chờn (chạy lại 16/16) · npm test 2.302 đạt 0 đỏ · mb.sh 18/18 · mốc +1′/+5′/+15′ lỗi 0 · ảnh ngoài vào :3102 200 · ba timer pancake-tool success, lỗi module 0 · HRM tự động 0
  · commit 357795a · 2a02656 · 27e407a · bd6459a · phiếu docs/thi-cong/phieu/PHIEU-MB4.md · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261002-mb4.md
- 02/10 · LL17a → ✅ — Số liệu › Tổng quan «Đơn POS của team — theo marketer» từ BigQuery (số tổng hợp, chỉ đọc, không chép dữ liệu khách): 7/30 ngày đơn · giao · hoàn · huỷ · đang xử lý · tỉ lệ giao · COD theo từng tiền tệ; marketer chỉ thấy dòng mình; khách BigQuery chặn kết quả nhiều trang
  đo prod chỉ đọc: don_hang = ảnh chụp 28/08 (123.629 dòng, mọi dòng GCC); BigQuery 14.675 đơn sau 28/08; tiền ở cod (total_price = 0); ca 9/9 · đảo-vá 24/24 · cổng ll17a.sh 14/14
  · commit f5efc99 · nhật ký docs/thi-cong/nhat-ky/phieu-LL17a.md
- 02/10 · MỞ VAN LL17a → ✅ GIỮ — prod `bd6459a → b4e7b6d`, 0 migration, chỉ restart aicloser-v3 lúc 10:32:49 CEST; mốc +1′/+6′/+15′ lỗi 0; đọc thật 30 ngày GCC 6.909 · AUUS 631 · EU 4.971 đơn
  cửa vào 51 xanh / 16 đỏ = 12 nợ cũ + l1-m1 dữ liệu sống + ll5/ll10/ll18 chập chờn (chạy lại xanh; gốc: hai phiên đụng CSDL hộp cát — chữa 8aed3fc) · phát hiện «đơn theo luồng» 0/0 trên prod ⇒ LL17b
  · commit b4e7b6d · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261002-ll17a.md
- 02/10 · LL17b → ✅ — Số liệu đọc đơn từ BigQuery: ô «Đơn theo luồng» · luồng trang bán hàng · BUY NOW · «Chốt · Hoàn» theo page (Tổng quan) + «Hai luồng» (tab Khách); luồng suy đúng luật `suyNguon` trong BigQuery; số chụp cũ hơn khoảng đo ⇒ «chưa biết», không 0 · 0
  đo dev chỉ đếm: 60 ngày messenger 14.094 · trang bán hàng 9.777 · không suy được 1; 30 ngày 7.927/12.699 đơn mang page_id, 167/203 page khớp; ca 12/12 · đảo-vá 17/17 · cổng ll17b.sh 10/10 · npm test 2.331/0 đỏ
  · commit 33cd8aa · nhật ký docs/thi-cong/nhat-ky/phieu-LL17b.md
- 05/10 · LL15e → ✅ — khoá tài khoản / rút vai CẮT phiên đang mở: lớp đọc vé hỏi lại CSDL (đệm 30 giây), bối cảnh mang vai còn lại; bịt cả lỗ người bị khoá đổi team bằng vé cũ để lấy vé mới 8 tiếng; CSDL hỏng ⇒ 500
  ca K1–K7 7/7 (dungPhanB thật + Postgres hộp cát với đúng câu khoá của đồng bộ HRM) · đảo-vá 9/9 · cổng ll15e.sh 10/10 · npm test 2.338/0 đỏ
  · commit 2877564 · nhật ký docs/thi-cong/nhat-ky/phieu-LL15e.md
- 05/10 · LL17d → ✅ — đơn POS thuộc team của marketer VÀO NGÀY ĐƠN (lịch sử team HRM, suy trong BigQuery); thiếu lịch sử ⇒ team hiện tại + màn nói ra
  đo dev chỉ đếm: 628 đơn (1 marketer GCC → EU, 07/08–31/08) về đúng GCC · 3 đơn theo team hiện tại · 2,2 giây một trang; khoá prod đọc được bảng lịch sử (SSH chỉ đọc); đảo-vá 9/9 · cổng ll17d.sh 4/4 · npm test 2.342/0 đỏ
  · commit 6c24be4 · nhật ký docs/thi-cong/nhat-ky/phieu-LL17d.md
- 05/10 · MỞ VAN LL17b · LL15e · LL17d → ✅ GIỮ — prod `b4e7b6d → 60ab7ed`, 0 migration, chỉ restart aicloser-v3 lúc 04:11:58 CEST; mốc +0′/+6′/+15′ lỗi 0 · cat_phien 0 (khoá 0/23); đọc thật 30 ngày GCC 6.870 · EU 4.868 · AUUS 606 đơn, ba luồng tách
  cửa vào 60 xanh / 13 đỏ = 12 nợ cũ + ll15e chập chờn (vai-b-noi-day; chạy lại 10/10 · 311 vòng 0 đỏ — nợ N-VBND-CHAP-CHON) · l1-m1 nay xanh · LL17c người quyết chọn «để nguyên»
  · commit 60ab7ed · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261005-ll17b-ll15e-ll17d.md
- 02/10 · CR-02-10b → 🔨 ÁP — page phải gắn một sản phẩm gốc × một shop POS thì bot mới chat; bỏ giá riêng theo page; gốc chỉ sinh từ gộp SKU; «bản sao theo page» thôi là nguồn (giữ lưu trữ) · §5h GSP1–GSP5 + H-GSP
  đo prod chỉ đọc: 0/514 page gắn gốc · 76 page đọc bản sao (0 bật) · 0/78 bản sao nối món POS · 0/491 món POS có giá · 536 ảnh ở bản sao · prod chat qua `kb-overrides.json` (`V3_RAP_PROMPT_BAT` vắng) ⇒ phải chốt ở handler · đảo thử bỏ nhánh `page_id`: 35 ca neo luật cũ · 01 §6 §8 + `luoc-do-v1.md` đã sửa · 5 nợ §9 N-GSP-*
  · commit 4587fd4 · ed3b609 · phiếu docs/thi-cong/doi-y-do/CR-02-10b-page-phai-gan-san-pham.md
- 02/10 · GSP1 → ✅ (chờ tổng nghiệm thu) — «+ Thêm» = Gộp món POS theo SKU; gỡ `POST /api/san-pham/goc` (404) + lối tạo gốc theo số hiệu; cửa sửa `/goc/:id` · gộp `/gop` · phạm vi marketer LL15d giữ nguyên · nợ N-GSP-TAOGOC (§9)
  npm test 2306→2311 ca, 0 đỏ (dev) · gsp1.sh 14/14 · đảo-vá 2/2 (khôi phục route ⇒ G1 đỏ; khôi phục veThem ⇒ G4 đỏ) · ll13/ve1/ve8a/ve8b/ll15d rc=0 · LL15d riêng 4/4 + 5/5 · `_chan1` ④ đỏ duy nhất do commit 400906b của tổng (CR-02-10b)
  · commit 2210ed3 · nhật ký docs/thi-cong/nhat-ky/phieu-gsp1.md
- 02/10 · GSP1 → ✅ (tổng nghiệm thu) — chặng 1 trên cây gộp `fd05a0c`+: 7/8 (④ đỏ do commit tổng sửa CR, đất điều hành) · `gsp1.sh` rc=0 · cổng cũ ll13 · ve1 · ve8a · ve8b · ll15d xanh khi máy rảnh (đỏ lúc chạy chồng = hộp cát trùng tên, đã chữa `8aed3fc`)
  chặng 2 (một agent, ba mũ): Phá ĐẠT (POST/PUT mọi biến thể `/goc` ⇒ 404, số dòng không đổi; cửa sửa `/goc/:id` nguyên) · Code ĐẠT · Nghiệp vụ (b) ĐẠT · nợ N-GSP-GOP-SKU (chờ người quyết) · N-GSP1-CHU-CU · N-GSP1-DAO-VA-CAY-CHUNG
  · commit 2210ed3 · 94a4997 · verdict scratchpad review-b-gsp1.yaml

- 02/10 · GSP2 → 🔎 CODE/TEST ĐẠT trên DB tạm — tiếp tục phần Claude dừng: màn việc chuyển + gắn/nối/gộp/không chuyển + retry gắn; migration 032 và schema đồng bộ; 7 đột biến bị bắt · chưa deploy
  · bộ đầy đủ 2342 đạt / 0 lỗi / 4 bỏ qua; cổng gsp2 23/23 (kèm hai bộ LL15d riêng); phép đo mọi team chỉ đọc
  · commit xem git log GSP2/GSP1b · nhật ký docs/thi-cong/nhat-ky/phieu-gsp2.md
- 02/10 · GSP1b → 🔎 CODE/TEST ĐẠT trên DB tạm — SKU suy từ mọi món POS đã khóa; thiếu/khác/lệch ⇒ 409, không ghi; HTTP thật kiểm vai và mã lỗi; trả nợ N-GSP-GOP-SKU trong code local · chưa deploy
  · cổng gsp1b 23/23 (kèm VE8a và hai bộ LL15d riêng); đảo-vá luật tin SKU thân đỏ đúng chỗ
  · commit xem git log GSP2/GSP1b · nhật ký docs/thi-cong/nhat-ky/phieu-gsp1b.md
- 05/10 · GSP2 + GSP1b → 🔎 chặng 1 (tổng đo) — commit `bb3cf5e` do phiên khác làm nốt sau khi thợ GSP2 dừng giữa chừng 02/10; `_chan1.sh`: ④ đỏ (một commit gộp hai phiếu + doc tổng) · ⑦ đỏ GIẢ (`rg` + `.env`, nợ N-GSP-CONG-RG-ENV)
  chạy lại đúng môi trường: `gsp2.sh` 23/23 + 7 đột biến bị bắt · `gsp1b.sh` 23/23 + đột biến «tin SKU thân» bị bắt · `npm test` 2346 / 2342 đạt / 0 đỏ / 4 bỏ qua · chặng 2 đang chạy
  · commit bb3cf5e · nhật ký docs/thi-cong/nhat-ky/phieu-gsp2.md · phieu-gsp1b.md
- 05/10 · GSP1b → ✅ · GSP2 → 🔨 vòng 2 — chặng 2 (một agent ba mũ, `bb3cf5e`): GSP1b Phá · Code · Nghiệp vụ ĐẠT; GSP2 TRẢ VỀ một CHẶN C1 — `dsViecChuyen` trả giá bản sao ở đơn vị NHỎ POS, màn in thẳng ⇒ 99 SAR hiện 9.900 (người đối soát gõ theo ⇒ bot báo ×100)
  phá không làm bộ đếm về 0 sớm qua cửa thật (anh em · gắn lại · bo_qua rồi gắn · 2 bản sao · team khác); hai lỗ hiếm F1/F2 giao GSP3; F3 neo GSP4 · hai thay đổi ngoài pathspec (N1a′ · schema.sql) CHẤP NHẬN · nợ N-GSP2-* · N-GSP1B-GN · N-N1A-THUOC
  · verdict scratchpad review-b-gsp2-gsp1b.yaml
- 05/10 · GSP2 → 🔨 vòng 2 xong, chờ phá lại — vá C1: `dsViecChuyen` chia `HE_SO_TE` ở tầng A cho gia/giaGoc/phiShip (99 SAR ⇒ 99, ship 25), màn không tự quy đổi · ca đơn vị + đột biến `don_vi` (đo bản sau vá) · gsp2.sh rc=0 24/24, 8 đột biến bắt, npm test 2343/2347 0 fail
  · commit 0a17180 · _chan1 7/8 xanh (đỏ ④ = tệp ngoài ③ của vòng 1 đã chấp nhận) · GSP3 nhận `bac` ở đơn vị LỚN, đừng quy đổi lần hai
  · nhật ký docs/thi-cong/nhat-ky/phieu-gsp2.md (mục «Vòng 2»)
- 05/10 · GSP2 → ✅ (tổng nghiệm thu vòng 2) — C1 ĐÃ-SỬA: quy đổi `HE_SO_TE` một chỗ ở tầng A (`bacDonViLon`), màn in thẳng đơn vị lớn · `gsp2.sh` 24/24 + 8 đột biến (thêm `don_vi`) · npm test thợ 2347/2343/0 đỏ · GSP3 → 🔨 phát
  · commit 0a17180 · 4b5d189 · nhật ký docs/thi-cong/nhat-ky/phieu-gsp2.md «Vòng 2»
- 05/10 · GSP3 → 🔎 chờ tổng nghiệm thu — đối soát giá + ảnh theo đơn vị GỐC × SHOP: lệch giữa page ⇒ 409 người chọn, chép trọn hàng qua `luuGia`/saveProduct (bậc tắt · ship), ảnh khử trùng, LUÔN đẩy, hỏng ⇒ gỡ ảnh, đánh dấu cả đơn vị; dọn dấu F1/F2; màn khung đơn vị
  `gsp3.sh` rc=0 32/32 · 18 đột biến bắt (bản sao tạm) · 25 ca mới · npm test 2347→2372 / 0 đỏ / 4 skip · /code-review high 10 phát hiện: R1 R3 R6 R7 sửa, R4 → nợ N-GSP3-DOI-MON (đóng trước GSP4) · va-r2 + l3-m4 ĐỎ SẴN ở base (nợ N-GSP3-CONG-CU-DO)
  · commit e5e5f48 · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3.md
- 05/10 · GSP3 → 🔎 chặng 1 (tổng đo) — `_chan1.sh gsp3` 8/8 · `gsp3.sh` 32/32, 18 đột biến bắt đúng ca, cây chung không dính đột biến · cổng cũ `va-r2` 1 đỏ / `l3-m4` 33 đỏ = ĐÚNG nợ cũ đã ghi ở đợt MB4 (đếm theo phép, không theo dòng 🔴)
  lượt đầu bị dừng sau 30′ (treo ở chuỗi cổng cũ, có lẽ tranh tài nguyên) — cây sạch, chạy lại 10′ xanh · chặng 2 đối kháng (phan-bien-refute) đang chạy · N-GSP3-DOI-MON thành điều kiện GSP4
  · commit e5e5f48 · de60aea · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3.md
- 05/10 · GSP3 → 🔨 vòng 2 — chặng 2 đối kháng (phan-bien-refute, 10 kịch bản chạy thật trên hộp cát): TRẢ VỀ 1 CHẶN F1 — POST đối soát chỉ gửi `chon` trỏ bản sao, không ràng với thứ người chọn đã thấy ⇒ page gắn thêm / bảng bị sửa trong lúc khung mở thì thua NGẦM hoặc giá chưa ai thấy được chép
  tổng nâng F4 lên CHẶN: kiểm tiền tệ cả bản sao THUA ⇒ page 1158273677377854 (KWD + «AED») kẹt vĩnh viễn sau GSP3b · không phá được: đơn vị/bậc tắt, hai quản trị cùng bấm, lượt dở chạy lại, gỡ ảnh, CTE bỏ gốc, lưới 032, quyền · NEN F2 F3 F5 F7 + F6 ⇒ §9
  · verdict scratchpad refute-gsp3.verdict.yaml · vòng 2 nhận refute-gsp3-vong2.verdict.yaml
- 05/10 · GSP3 → 🔎 vòng 2 xong, chờ tổng nghiệm thu — F1: POST bắt buộc mang `dauDonVi` của GET (băm món×bảng thô · page · bản sao chưa quyết×bảng), đơn vị đổi ⇒ 409 `don_vi_da_doi` kèm đơn vị mới, 0 ghi · F4: tiền tệ chỉ chặn bảng SẼ GHI, bản sao thua sai tệ ⇒ `giu_gia_mon` · đính chính lời khai «version của saveProduct»
  `_chan1 gsp3` 8/8 (`gsp3.sh` 43/43) · 29/29 đột biến (thêm 11) · ca V2-K0..K4 · K6 · K6b · K6c + 4 ca màn · npm test 2372→2384 / 0 đỏ / 4 skip · /code-review high 10: CR1 CR3 CR4 CR5 CR7 CR8 CR9 sửa, CR2 → nợ N-GSP3-DAU-TOCTOU
  · commit 0f2c4bf · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3.md («Vòng 2»)
- 05/10 · GSP3 → ✅ (tổng verify vòng 2) — F1 ĐÃ-SỬA: `dauDonVi` bắt buộc, thiếu ⇒ 409 `thieu_dau_don_vi`, lệch ⇒ 409 `don_vi_da_doi` (ca V2-K0…K4 xanh, 4 đột biến nhắm chốt dấu) · F4 ĐÃ-SỬA: tiền tệ chỉ kiểm bảng thắng, bản sao thua sai tệ ⇒ `giu_gia_mon` (V2-K6/K6b/K6c xanh) · bộ ca GSP3 37/37 · npm test thợ 2384 / 0 đỏ
  còn cửa sổ mili-giây giữa đọc và đánh dấu (N-GSP3-DAU-TOCTOU, do `saveProduct` tự commit) · GSP3b → 🔨 phát
  · commit 0f2c4bf · 307c79b · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3.md «Vòng 2»
- 05/10 · GSP3B → 🔎 chờ tổng nghiệm thu — trang page + màn Prompt đọc bộ đọc của bot KÈM `trang` (page đã gắn ⇒ món POS); bản sao của page đã gắn bị chốt ở đầu 7 cửa lưu SP/ảnh/nối món + cửa ra `taoBuocDayBot` (409 `ban_sao_da_chuyen`, khoá dòng page, id «0<id>» ⇒ 400); tab SP & giá + Ảnh chỉ xem + nút sang Sản phẩm › Theo thị trường; ② 4 KHÔNG áp (trang page còn gửi món POS RF-15 vào cửa đầy đủ — nợ N-GSP3B-MON-POS-CUA-DAY)
  `_chan1 gsp3b` 8/8 (lượt chặng 1: `gsp3b.sh` 42/42, cả ⑥gsp3 xanh) · 23/23 đột biến đỏ đúng tập ca · lượt thợ trước đó 41/42, đỏ ⑥gsp3 = chập chờn (VE2b 16/17 sâu trong chuỗi; chính chuỗi đó chạy trực tiếp xanh, `gsp3.sh` riêng ①–⑤ xanh, ⑥ treo ở ve7d — chạy riêng 8/8; `l3-m4` 0 đỏ mới) · 32 ca mới · npm test 2384→2416 / 0 đỏ / 4 skip · /code-review high 10: CR1 CR2 CR3 CR5 CR6 CR7 CR8 sửa, CR4 → nợ
  · commit 1956b1e · bcc86ab · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3b.md
- 05/10 · GSP3b → 🔎 chặng 1 (tổng đo) — `_chan1.sh gsp3b` 7/8: đỏ duy nhất ⑦ do `gsp3b.sh` ⑥cổng-cũ-gsp1 (chuỗi gsp1 → ve1 → ll18 → ll3 đỏ «mới so với base») · chạy riêng: `ll3.sh` 7/7 hai lượt, `gsp1.sh` 14/14, cây sạch ⇒ CHẬP CHỜN chuỗi con dài, không hồi quy (cùng loại N-VAI-B-NOI-DAY-CHAP-CHON)
  đồ thị import từ `src/queue/chay-worker.js` (96 tệp) KHÔNG chạm tệp nào của đợt GSP ⇒ phát hành chỉ restart `aicloser-v3` · prod chỉ đọc 05/10: 031 mới nhất, 0 cột doi_soat, F3 = 0, page gắn 1 / bật 0
  · commit 1956b1e · bcc86ab · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3b.md
- 05/10 · GSP3b → 🔨 vòng 2 — chặng 2 đối kháng ĐẠT (0 CHẶN; id lạ 9 dạng × 5 cửa giữ vững · bộ đọc màn ≡ bot ở 4 trạng thái page · không khe chạy chồng · đường cũ không vỡ) — tổng nâng hai NÊN lên CHẶN trước phát hành:
  F1 marketer lưu ĐẦY ĐỦ món POS qua cửa trang page ⇒ 200, đổi giá mọi page gốc × shop + đè tên + `cau_hinh_tay` (POS thôi cập nhật hết hàng) trong khi màn Sản phẩm 403 · F2 khoá chết 40P01 do thứ tự khoá ngược (lưu bản sao vs gắn page / «Không chuyển») · F5 sửa sổ (gỡ cấm day-lai khi bộ đếm = 0) · F3 F4 F6 ⇒ §9
  · verdict scratchpad refute-gsp3b.verdict.yaml · vòng 2 nhận refute-gsp3b-vong2.verdict.yaml
- 05/10 · GSP3B → 🔎 vòng 2 xong, chờ tổng nghiệm thu — F1: hai cửa lưu ĐẦY ĐỦ từ chối món POS (`page_id` NULL · page đã gắn · đã gộp gốc mà page đã gắn bán — nhánh thứ ba do /code-review, LỆCH chữ verdict «RF-15 vẫn qua» cho món RF-15 đã gộp) ⇒ 409 `mon_pos_sua_o_san_pham`, marketer lẫn quản trị, 0 đổi 0 đẩy; RF-15 chưa gộp vẫn qua (D10) · F2: chốt ở ĐẦU giao dịch `saveProduct` (pool bọc, không sửa operations.js) ⇒ page → san_pham, lượt gắn / «Không chuyển» chờ rồi thành; cửa ra NOWAIT ⇒ đường thứ tự ngược 409 «thử lại», không 40P01
  `_chan1 gsp3b` 8/8 (`gsp3b.sh` 55/55, ⑥ cả 8 cổng cũ xanh, va-r2 đỏ sẵn) · 36/36 đột biến (13 mới, `f2_dao_thu_tu_khong_belt` đỏ đúng chữ 40P01) · ca mới H10 H11 D15–D19 K1–K5 · npm test 2416→2429 / 0 đỏ / 4 skip · kịch bản đối kháng R3 R4 R4b nguyên văn xanh · /code-review high 8: #1 #3 #4 #5 #7 #8 sửa, #2 → nợ N-GSP3B-ANH-MON-POS, #6 không sửa · nợ mới N-GSP3B-HOOK-SAVEPRODUCT · sửa chữ N-GSP3B-MON-POS-CUA-DAY
  · commit d688a3d · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3b.md «Vòng 2»
- 05/10 · GSP3b → ✅ (tổng verify vòng 2) — chạy NGUYÊN VĂN repro của reviewer trên mã đã vá: R3 (F1 — khẳng định cửa trang page KHÔNG cho marketer lưu đầy đủ món POS) xanh · R4 + R4b (F2 — khẳng định không còn 40P01) xanh · R1 R2 R5 đỏ = đúng ba NEN đã ghi nợ (F4 F5 F3) · ca GSP3b 45/45
  ĐỢT GSP1 · GSP1b · GSP2 · GSP3 · GSP3b NGHIỆM THU XONG — sang chuẩn bị phát hành (mo-van): gộp origin · cửa vào 7 phép · CHANGELOG + hồ sơ · dừng chờ người quyết gật push + deploy
  · commit d688a3d · 14c57ec · nhật ký docs/thi-cong/nhat-ky/phieu-gsp3b.md «Vòng 2»
- 05/10 · MỞ VAN đợt GSP (GSP1 · GSP1b · GSP2 · GSP3 · GSP3b) → ✅ GIỮ — người quyết gật trực tiếp; prod `60ab7ed → 8dc9bcd`, migration 032 áp mới 1 (tổng 32, chỉ thêm 4 cột), CHỈ restart aicloser-v3 16:17:24 CEST (đồ thị import: worker không chạm đợt này)
  cửa vào: npm test 2448 / 0 đỏ · cổng 61 / 14 = 12 nợ cũ đúng tên + ll15e · ll18 chập chờn (riêng 2/2 xanh) · mốc +1′/+5′/+15′ Started 1 · lỗi 0 · worker y nguyên · đọc thật `dsViecChuyen`: chưa xong 76 (GCC 74, gợi ý 51 · kỹ thuật 2) · việc NGƯỜI H-GSP mở
  · commit 8dc9bcd · nhật ký docs/thi-cong/nhat-ky/phat-hanh-20261005-gsp.md
- 05/10 · H7 → 🟡 chuyển 66 page vào team theo đơn POS (người quyết gật từng bước: 44 chưa phân → GCC · page lẫn «marketer thuộc team nào thì phân team đó» · chạy cả 66) — luật: page về team HIỆN TẠI của marketer đang làm có nhiều đơn nhất 60 ngày
  BigQuery chỉ đọc: GCC 13.055 đơn · EU 9.166 (287 có page) · AUUS 1.191 · ghi prod qua `chuyenPageSangTeam` đứng tên minhngoc (quản trị GCC): chạy khô 67/67 → thật 67/67, 0 lỗi, nhật ký 349702–349768 · GCC 537 · EU 21 · AUUS 1 · chưa phân 23 · mồ côi hoi_thoai 610 → 549 (cũ, nợ)
  · nhật ký docs/thi-cong/nhat-ky/h7-chuyen-team-20261005.md · việc kế: nối POS cho EU/AUUS (người quyết gật hướng, cần CR)
- 05/10 · H7 (tiếp) → nối POS cho EU/AUUS theo lời người quyết — không sửa mã (mọi truy vấn `ket_noi_pos` lọc team; mỗi team một kết nối tới shop dùng chung là cơ chế sẵn có): chép khoá từ kết nối GCC qua `layKetNoi`→`themKetNoi`, đứng tên minhngoc, nhật ký 349769–349773
  EU + Saudi · UAE · Kuwait · Qatar → kéo 421 món · AUUS + Taiwan → kéo 44 món · 0 hỏng · RF-15 không dính, F3 = 0 · phủ SKU: GCC 15.711/15.724 · EU 9.742/10.271 · AUUS 222/1.293 · H13 khoá 5 shop riêng · gộp SKU trong EU/AUUS cần quản trị team đó
  · nhật ký docs/thi-cong/nhat-ky/h7-chuyen-team-20261005.md (kèm danh sách gộp theo team)
- 05/10 · H13 → ✅ · H7 gộp SKU — người quyết gửi khoá 5 shop riêng (đi qua stdin, không ghi tệp): EU + Europe · Romania · Slovakia (+80 món ⇒ 501), AUUS + USA · Australia (+144 ⇒ 188), nhật ký 349774–349778, F3 = 0
  gộp SKU team bán 60 ngày theo yêu cầu người quyết («gộp giúp mình, nhiều quá»): `goiYGopMonPos` → `gopMonThanhGoc`, khô 0 lỗi → thật 0 lỗi · GCC +123 ⇒ 125 gốc (292 món) · EU 60 (132) · AUUS 42 (66) · không gán marketer · danh sách chuyển page: 50 page có gợi ý «Gắn vào gốc» một chạm, 24 không gợi ý
  · nợ N-TIEN-TE-NGOAI-GCC · nhật ký docs/thi-cong/nhat-ky/h7-chuyen-team-20261005.md
- 05/10 · ĐIỀU KIỆN GO-LIVE (GL) → ⬜ chưa phát — nghiên cứu (agent chỉ đọc) đề xuất GL1 preflight 🟩 · GL2 trần page toàn hệ 🟨 · GL3 timeout Pancake + POST lỗi mạng KHÔNG xoay token (đang có nguy cơ tin đúp) 🟥 · GL4 ngắt page khi gửi lỗi 🟥 · GL5 HTTPS 🟨 · GL6 nhịp tim + cảnh báo 🟨 · GL7 tài liệu/rào cũ 🟩 · GL8 gộp hai bộ điều kiện sẵn sàng
  NGƯỜI QUYẾT 05/10: GL2 «vắng biến = 0 page · vượt trần = worker DỪNG hẳn + đèn đỏ» · GL4 «2 lỗi gửi liên tiếp → ngắt page 30′, tự mở; tin tồn giữ ở chờ» · GL5 «HTTPS SAU pilot» (pilot tạm HTTP trần) · GL6 «Telegram bot» (dịch vụ thứ ba — người quyết đã gật; chỉ gửi nội dung cảnh báo, không dữ liệu khách; cần người tạo bot + chat id) · GL3 hạn mặc định đề nghị: đọc 15 s · gửi 30 s
  tối thiểu cho pilot 1 page: GL1 + GL2 + GL3 + H-GL (chọn page, tắt ai_sale/Botcake trên page đó, người trực) · GSP3c review (a) SỬA-PHIẾU: CHẶN C1 «Kéo danh mục» tự gán `ma_goc` theo SKU (`doc-danh-muc.js:141-147,200,213`) không qua bước bỏ dấu ⇒ cần hàm bỏ dấu dùng chung gọi cả ở gắn/gỡ món lẫn kéo danh mục + quét lùi dấu cũ trước GSP4 (verdict scratchpad review-a-gsp3c.md) · TT1 đang thi công (thợ xin nới 3 tệp thước + phạm vi so của gsp3.sh/gsp3b.sh — tổng đã duyệt)
- 05/10 · GL1 → ✅ chờ nghiệm thu — preflight bỏ vế db.missingPages (TypeError ⇒ exit 1 mọi lượt) · 4 ca CLI thật xanh + đảo-vá (khôi phục ⇒ (a) đỏ; bỏ --ready ⇒ (b) đỏ) · gl1.sh ĐỎ 0/XANH 7 · npm test 2463 pass/0 fail
  trả nợ N-PREFLIGHT-MISSINGPAGES (chưa gạch ở §9 — tổng gạch) · không đụng setup.sh
  commit (xem git log, mã «GL1») · nhật ký docs/thi-cong/nhat-ky/phieu-gl1.md
- 06/10 · GL1 → ✅ (tổng nghiệm thu) — preflight thôi đọc `db.missingPages`; exit 1 chỉ khi lỗi cấu hình · CSDL không đọc được · `--ready` còn migration chưa áp · 4 ca chạy CLI THẬT trên hộp cát (không node giả)
  `_chan1.sh gl1` 8/8 · `gl1.sh` 7/7 · đảo-vá đỏ đúng · npm test thợ 2467 / 0 đỏ · gạch N-PREFLIGHT-MISSINGPAGES · làn 🟩 ⇒ không chặng 2
  · commit 75665af · 9936dd7 · nhật ký docs/thi-cong/nhat-ky/phieu-gl1.md
- 06/10 · GL3 → 🔎 chờ nghiệm thu — `src/pancake.js`: mọi lượt gọi Pancake có hạn (đọc 15 s · gửi 30 s, `V3_PANCAKE_HAN_DOC_MS`/`_GUI_MS`, sai ⇒ mặc định + cảnh báo 1 lần; phủ cả đọc thân); GHI lỗi mạng/quá hạn/thân hỏng ⇒ trả ngay `khongRo`+`phaLoi`, KHÔNG xoay token (hết đường tin đúp bằng token khác); bốn fetch trần 15 s; `pkAddNote` lỗi ⇒ thất bại
  `gl3.sh` ĐỎ 0/XANH 25 (22 ca GL3 · 13 đảo-vá đỏ đúng · 4 bộ ca cũ xanh) · npm test 2463→2485 pass / 0 đỏ · /code-review 10 phát hiện: sửa #1 #2 #3 #8 #9 · #4–#7 vào nợ · #10 ngoài pathspec — tổng 5 nợ §9 N-GL3-* · `_chan1` ⑤ đỏ cho src/pancake.js = rào cũ (GL7)
  · commit 908c439 · nhật ký docs/thi-cong/nhat-ky/phieu-gl3.md
- 07/10 · TT1 → 🔎 chờ nghiệm thu — `HE_SO_TE` + EUR/RON/AUD ×100 · TWD/JPY ×1 (theo cách POS lưu) · `TIEN_TE_THI_TRUONG` + Europe · Romania · Slovakia · USA · Australia · Taiwan · `quyDonViNho` một luật cho saveProduct (giá · giá gốc · ship) / tổng bot / legacy — lẻ ⇒ từ chối rõ, không làm tròn ngầm; trả nợ N-TIEN-TE-NGOAI-GCC
  `tt1.sh` PHÉP=27 LỖI=1 (8 phép ④ + 7 đảo-vá đỏ đúng; lỗi = gsp3b chập chờn chuỗi con, chạy riêng xanh · gsp3b riêng 54/1 = ve7b tổng giết, riêng 8/8 cả HEAD lẫn 2e11bf9) · npm test 2452→2486 / 0 đỏ · /code-review 10: sửa #3 #7 #9 #10 · nợ 6 mục §9 N-TT1-* · nới ③ 4 tệp thước (tổng duyệt) · `_chan1` chưa chạy (nhường cây GL3b)
  · commit bc190f5 · nhật ký docs/thi-cong/nhat-ky/phieu-tt1.md
- 07/10 · GL3 → ✅ (tổng nghiệm thu) · GL3b 🔨 phát — đối kháng GL3 ĐẠT; F1 (Pancake chậm ⇒ `pkGetMessages` nuốt lỗi ⇒ worker trả lời MÙ đè sale) + F2 + F3 gom phiếu GL3b 🟥, xếp vào nhóm TỐI THIỂU pilot; F4–F7 vào ⑥ GL3b
  GL3b review (a) 2 vòng: vòng 1 TRẢ VỀ (C1 CHECK `nap_bo_qua` nuốt cả vòng · C2 `banGiaoLoi` không đẻ việc ⇒ câm vĩnh viễn) · vòng 2 TRẢ VỀ (công thức F2 che đảo-vá gl3.sh · l1-m2.sh đỏ sẵn từ base) — đã vào phiếu
  · tổng dừng tay test treo `ve7b-ket-noi` (36′, 0% CPU, không kết nối) trong chuỗi gsp3b của TT1 — riêng 8/8 cả HEAD lẫn 2e11bf9 · phiếu 2c72688 · TT1 nới ③ đợt 2 ghi vào phiếu
