# SỔ ĐIỀU HÀNH THI CÔNG — AI Closer v3 · phần việc NGƯỜI A (trục chính)

> 💓 **NHỊP TIM TỔNG:** vòng cuối 19:00 22/08 · đang chạy: L0-M2 🟨 (thợ sonnet) · phán mới
> nhất: L1-M1 điểm (a) TRẢ-VỀ 3 CHAN (bảng mã không phép đo · ghi không đọc live · thiếu
> khoá) → phiếu v2 đóng 7/7, khoá dev đã đặt, H9 mở, đang verify vòng 2.

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
   Bộ não chat DÙNG NGUYÊN, cấm sửa: `src/prompts.js` `src/closer.js` `src/tools.js`
   `src/fast-lane.js` `src/outbound-guard.js`.

**Nguồn sự thật đọc theo thứ tự:** `docs/v3/01-QUYET-DINH.md` (ý đồ — thắng mọi thứ khi
mâu thuẫn) → `docs/v3/02-KE-HOACH-CODE.md` (kế hoạch + 18 bảng + nghiệm thu) →
`docs/v3/05-PHAN-VIEC.md` (ranh giới file) → `docs/TONG-QUAN-HE-THONG.md` (bản đang chạy).

**Môi trường dev:** Postgres 16 container `talpha-pg` cổng **5433**, chuỗi nối ở `.env`
biến `DATABASE_URL_V3`. Node v25. Dữ liệu thật để di trú nằm ở gốc repo (`pages.json`
`kb-overrides.json` `conv-state.json` `script-versions/` `stats.json`…, đã trải từ gói bàn
giao 19/08 — đều bị gitignore). Token Pancake từ IP máy cá nhân bị chặn (lỗi 121) — số đo
Pancake thật phải lấy trên VPS, đừng debug ở local.

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
| L0-M2 | Tầng truy vấn tự chèn điều kiện team, thiếu bối cảnh → ném lỗi                     | L0-M1     | thợ mới | `src/db/*` `test/`    | 🟨         |
| R0    | **GATE SÓNG 0** — npm test 2 lượt + script nghiệm thu + đối chiếu danh sách di trú | L0-M1·M2  | TỔNG    | —                     | ⬜         |

Bàn giao cho B tại R0: lược đồ (điểm 1) + hàm tầng truy vấn (điểm 2) + hình dạng bảng
`viec_can_xu_ly` (điểm 3) — công bố bằng file `docs/v3/ban-giao/luoc-do-v1.md`.

Dặn trước cho phiếu L0-M2 (từ verdict điểm (a) L0-M1, chống ĐẠT RỖNG): nghiệm thu «đăng
nhập Tiểu Alpha không thấy dữ liệu team khác» phải đo trên dữ liệu ĐÃ GÁN ≥2 team nghiệp
vụ (test tự chèn mẩu dữ liệu trộn team rồi mới đo cách ly) — toàn bộ dữ liệu di trú đang
nằm ở team kỹ thuật `chua-phan` nên đo trên dữ liệu thật là đo trên tập rỗng. Kèm ca test
hợp đồng `bo_luat_chung (team_id = $ctx OR team_id IS NULL)`.

## §3 · SÓNG 1 — BỐN CỬA KẾT NỐI (phần A: 3 cửa)

| Mã    | Việc                                                            | Phụ thuộc   | Session | Đụng file                          | Trạng thái |
| ----- | --------------------------------------------------------------- | ----------- | ------- | ---------------------------------- | ---------- |
| L1-M1 | Cửa POS: đọc đơn/sản phẩm/tồn kho + GHI NGƯỢC trạng thái đơn 🟥 | R0          | thợ mới | `src/pos/*` `db/migrate/002` `test/` | 🎫         |
| L1-M2 | Cửa Pancake Messenger — bọc code cũ, thêm định tuyến team       | R0          | thợ mới | `src/channels/messenger/*` `test/` | ⬜         |
| L1-M3 | Cửa Pancake WhatsApp 🟥 (gửi tin ra khách)                      | **H1** + R0 | thợ mới | `src/channels/whatsapp/*` `test/`  | ⬜         |
| R1    | **GATE SÓNG 1**                                                 | L1-M1..M3   | TỔNG    | —                                  | ⬜         |

## §4 · SÓNG 2 — CHAT MESSENGER

| Mã    | Việc                                                                                | Phụ thuộc                     | Session | Đụng file                          | Trạng thái |
| ----- | ----------------------------------------------------------------------------------- | ----------------------------- | ------- | ---------------------------------- | ---------- |
| L2-M1 | Chuyển đường xử lý tin sang nền mới, hàng đợi thay vòng poll                        | R1 + **H5 (lớp model của B)** | thợ mới | `src/queue/*` `src/chat/*` `test/` | ⬜         |
| L2-M2 | Tắt Botcake 3 page thử, bật 2 lớp 0 đồng, nhập 2 luật từ khoá, vá `paano mag order` | L2-M1 + **H3** + **H8**       | thợ mới | `src/chat/*` `test/`               | ⬜         |
| L2-M3 | Tách prompt 4 khối, ngân sách lượt theo độ nóng, cờ page trọng điểm                 | L2-M1                         | thợ mới | `src/chat/*` `test/`               | ⬜         |
| R2    | **GATE SÓNG 2** — đo 50 lượt thật <10s, 7 ngày so 3 page đối chứng                  | L2-M1..M3                     | TỔNG    | —                                  | ⬜         |

## §5 · SÓNG 3 — HAI LUỒNG ĐƠN 🟥 (toàn sóng là đường đơn/tiền)

| Mã    | Việc                                                              | Phụ thuộc | Session | Đụng file                            | Trạng thái |
| ----- | ----------------------------------------------------------------- | --------- | ------- | ------------------------------------ | ---------- |
| L3-M1 | Máy trạng thái đơn PHÂN NHÁNH THEO NGUỒN 🟥                       | R2        | thợ mới | `src/orders/*` `test/`               | ⬜         |
| L3-M2 | Lọc trùng chéo hai luồng + chấm tỉ lệ hoàn 🟥                     | L3-M1     | thợ mới | `src/orders/*` `test/`               | ⬜         |
| L3-M3 | Hàng đợi nhắc (2h×5, huỷ khi khách trả lời) + bộ đọc ý 4 nhánh 🟥 | L3-M1     | thợ mới | `src/orders/*` `src/queue/*` `test/` | ⬜         |
| L3-M4 | Hàng chờ tạo đơn luồng Messenger 🟥                               | L3-M1·M2  | thợ mới | `src/orders/*` `test/`               | ⬜         |
| R3    | **GATE SÓNG 3**                                                   | L3-M1..M4 | TỔNG    | —                                    | ⬜         |

## §8 · VIỆC NGƯỜI (H1..Hn — chỉ người/B làm được; tổng chỉ nhắc, không tự làm)

| Mã  | Việc                                                                           | Chặn gì                                                        | Trạng thái |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------- |
| H1  | Điểm kiểm 1: gửi WhatsApp bằng API Pancake được không (thử 1 tin số nội bộ)    | L1-M3                                                          | ⬜         |
| H2  | Điểm kiểm 2: Pancake có webhook đẩy tin về không                               | kiến trúc L2-M1 (poll vs push)                                 | ⬜         |
| H3  | Điểm kiểm 3: Botcake kéo bao nhiêu khách từ bình luận (Private Replies)        | L2-M2                                                          | ⬜         |
| H4  | Điểm kiểm 4: Marketing Message có bật cho Trung Đông không (test 50 khách UAE) | giai đoạn 3, cần biết sớm                                      | ⬜         |
| H5  | **Chỉ định NGƯỜI B** + B xong lớp model L1-M4 cuối tuần 1                      | L2-M1                                                          | ⬜         |
| H6  | Mở tài khoản + lấy khoá 4 nhà model, nạp tiền chạy A/B                         | L2 (A/B model)                                                 | ⬜         |
| H7  | Chốt mapping page/sản phẩm/thị trường ↔ 3 team (Tiểu Alpha·Auus·Pialpha EU)    | di trú gán team thật (L0-M1 seed 3 team, gán chi tiết chờ đây) | ⬜         |
| H8  | Chọn 3 page thử + 3 page đối chứng cùng ngành cùng mức ads                     | L2-M2                                                          | ⬜         |
| H9  | Đặt `V3_KHOA_MA_HOA` RIÊNG trên VPS (32 byte; dev đã có khoá tổng đặt 22/08)   | cutover — ghi khoá model/POS thật trên prod                    | ⬜         |

## §9 · SỔ NỢ PHÁT SINH (APPEND — thấy gì ngoài phạm vi thì ghi đây, cấm tiện tay sửa)

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

## §10 · NHẬT KÝ (APPEND — khuôn 3 dòng, luật 15)

- 22/08 · L1-M1 → 🎫 sẵn sàng chờ R0 — điểm (a) vòng 1 TRẢ-VỀ 3 CHAN, phiếu v2 đóng 7/7,
  verify vòng 2 DAT · verdict nghiep-vu-L1-M1.verdict.yaml · phán tổng: sau R0 phát L1-M1
  song song L1-M2 (khác vùng file, lệnh tăng-tốc 22/08 thắng nhịp tuần-tự-một-người).
- 22/08 · L0-M1 → ✅ — tổng nghiệm thu: chặng 1 8/8 · cổng 51/51 (tổng tự chạy) · kiểm chéo
  độc lập 6 phép khớp; 2 lỗi thước _chan1 (nợ §9 của thợ) đã vá + đất điều hành loại khỏi
  phép pathspec · commit thợ b2ee56e · nghiệp vụ điểm (a) L0-M2 tổng tự chấm 4 câu: ĐẠT
  (khớp 01 §8 + 06 ném-lỗi; bỏ phiếu thì luật cứng team không ai thi hành).
- 22/08 · TỔNG → phán người quyết đợt 2 (giản lược token): bỏ agent review (a) riêng — tổng
  tự chấm, chỉ thuê cho phiếu ghi-ra-ngoài; route thợ mặc định sonnet, opus cho 4 phiếu khó;
  gate = phần máy · luật 4 + route đã sửa tại chỗ.
- 22/08 · TỔNG → phán người quyết: BỎ refute per-phiếu, refute tổng thể sau — luật 4 đã
  sửa tại chỗ · commit sổ · nhật ký: dòng này.
- 22/08 · TỔNG → khởi động — cài 4 skill dây chuyền vào `.claude/skills/`, trải gói bàn
  giao vào gốc repo (gitignore chặn đủ, `.env` giữ `PANCAKE_READONLY=1`), dựng Postgres
  `talpha-pg:5433`, dựng sổ này · commit (sổ) · nhật ký: sổ này §0a.
- 22/08 · L0-M1 → 🔎 chờ nghiệm thu — lược đồ 19 bảng (team_id mọi nơi, rào team kỹ thuật +
  chỉ-INSERT ở tầng DB) + di trú thật: page 502/502 · công tắc AI 46/47 · hội thoại
  18.790/18.790 · kịch bản 69 (=71−2 bản của page lạc); cổng `ops/bin/nghiem-thu/l0-m1.sh`
  51/51 ĐẠT, 30 ca mới xanh, bộ ca cũ giữ nguyên 18/23 của mốc nền; 3 phát hiện lệch đề bài
  (page lạc 3 chứ không 1 · `llmTurns` là mảng mốc chứ không phải số đếm · surrogate lẻ trong
  kịch bản làm chết cả lượt nạp) và 5 dòng nợ §9 · commit b2ee56e · nhật ký
  docs/thi-cong/nhat-ky/phieu-l0-m1.md
