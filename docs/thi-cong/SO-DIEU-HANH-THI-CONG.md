# SỔ ĐIỀU HÀNH THI CÔNG — AI Closer v3 · phần việc NGƯỜI A (trục chính)

> 💓 **NHỊP TIM TỔNG:** vòng cuối 06:40 23/08 · đang chạy: VA-T1 🟨 (vá 4 thước trôi) ·
> phán mới nhất: **12/12 MODULE PHẦN A XONG** (L3-M4 ✅ 62 phép, đảo-vá 7/7 đột biến chết)
> — gate toàn cục lộ 4 thước known-answer trôi theo cây sống (KHÔNG bug code nào, tổng đã
> mổ tới gốc từng cái) + 1 lỗi phép đo rc của chính tổng (đo $? trong chuỗi echo có
> command-substitution — đo tách dòng từ nay).

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

| #   | Phép                                                      | Của phiếu   | Cần gì                           |
| --- | --------------------------------------------------------- | ----------- | -------------------------------- |
| T1  | Gửi 1 tin WhatsApp thật qua API Pancake tới số nội bộ     | L1-M3 ⑤     | H1 nối số WA vào Pancake         |
| T2  | Diễn tập ghi-ngược trạng thái trên ĐƠN NHÁP (2 chiều)     | L1-M1 ④#5c  | V3_POS_GHI=1 + đơn nháp          |
| T3  | Tắt Botcake 3 page thử + bật 2 lớp 0 đồng                 | L2-M2       | H8 chọn page + người vào Botcake |
| T4  | Đo 50 lượt trả lời thật <10s + 7 ngày so 3 page đối chứng | L2 gate R2  | T3 xong                          |
| T5  | Nạp `ai-messages.jsonl` + đối chiếu số dòng Sổ AI         | nợ §9 L0-M1 | chạy trên VPS                    |
| T6  | Lớp model B (L1-M4) cắm vào chỗ DI của L2-M1              | H5          | người B xong                     |
| T7 | Duyệt 1 dòng hàng chờ thật → tạo 1 đơn NHÁP đánh dấu TEST trên shop ít dùng nhất (để nguyên — luật 2 cấm xoá) | L3-M4 ⑤ | V3_POS_GHI=1 + người chọn shop |

## §8 · VIỆC NGƯỜI (H1..Hn — chỉ người/B làm được; tổng chỉ nhắc, không tự làm)

| Mã  | Việc                                                                                 | Chặn gì                                                        | Trạng thái |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------- |
| H1  | Điểm kiểm 1: gửi WhatsApp bằng API Pancake được không (thử 1 tin số nội bộ)          | L1-M3                                                          | ⬜         |
| H2  | Điểm kiểm 2: Pancake có webhook đẩy tin về không                                     | kiến trúc L2-M1 (poll vs push)                                 | ⬜         |
| H3  | Điểm kiểm 3: Botcake kéo bao nhiêu khách từ bình luận (Private Replies)              | L2-M2                                                          | ⬜         |
| H4  | Điểm kiểm 4: Marketing Message có bật cho Trung Đông không (test 50 khách UAE)       | giai đoạn 3, cần biết sớm                                      | ⬜         |
| H5  | **Chỉ định NGƯỜI B** + B xong lớp model L1-M4 cuối tuần 1                            | L2-M1                                                          | ⬜         |
| H6  | Mở tài khoản + lấy khoá 4 nhà model, nạp tiền chạy A/B                               | L2 (A/B model)                                                 | ⬜         |
| H7  | Chốt mapping page/sản phẩm/thị trường ↔ 3 team (Tiểu Alpha·Auus·Pialpha EU)          | di trú gán team thật (L0-M1 seed 3 team, gán chi tiết chờ đây) | ⬜         |
| H8  | Chọn 3 page thử + 3 page đối chứng cùng ngành cùng mức ads                           | L2-M2                                                          | ⬜         |
| H9  | Bộ biến v3 cutover VPS — bảng khai duy nhất `docs/v3/ban-giao/bien-moi-truong-v3.md` | cutover — thiếu là cửa đóng câm                                | ⬜         |

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

## §10 · NHẬT KÝ (APPEND — khuôn 3 dòng, luật 15)

- 23/08 · L3-M4 → ✅ (TỔNG nghiệm thu) — chan1 8/8 · cổng 62/0/1-hoãn (T7) · đảo-vá 7/7
  đột biến không sống · 3 lệch đề bài thợ đo (variation_id UUID · pos_shop_id · warehouse
  không nguồn) · kiemTrung thật bắt cặp trùng · commit e97fcb1 — **12/12 MODULE A XONG**.
- 23/08 · TỔNG · gate toàn cục 13 cổng — 9 xanh · 4 đỏ đều là THƯỚC trôi theo cây sống
  (bo_luat +1 seed · 26→3.784 đơn · 006 sau 005 · fixture kb thiếu products + share PSID)
  → phiếu VA-T1; 1 bài học đo rc tách dòng; code nghiệp vụ 0 bug lộ ra ở gate.
- 23/08 · L3-M4 → 🔎 chờ nghiệm thu — hàng chờ tạo đơn Messenger `src/orders/hang-cho.js`
  + cửa TẠO ĐƠN THẬT `src/pos/tao-don.js`: NĂM cửa §7.3 (đủ trường · tiền · chống trùng ·
  hàng chờ · tạo-đơn-chạy-lại-đủ-cửa) với **NĂM nguồn** chống trùng (bản cũ bốn) — nguồn (b)
  GET **POS SỐNG**, KHÔNG đọc gương `don_hang`; mọi nguồn `unknown` ⇒ **ĐÓNG**. `taoDon`
  BỐN cửa khuôn `ghi-nguoc.js`, `status: 12` TƯỜNG MINH (cấm bê `status: 0` khuôn cũ),
  idempotent BA lớp (dòng · `SELECT … FOR UPDATE` · kiểm nhật-ký-MỒ-CÔI **trước POST**, lớp
  duy nhất sống qua rollback). Chỗ đấu `src/chat/handler-v3.js` bước 11b, 1 chỗ.
- 23/08 · L3-M4 → 🔴 BA LỆCH ĐỀ BÀI đo được trước khi code (án lệ #4): **`variation_id` của
  POS là UUID chứ không phải số** (`san_pham.ma` 137/137 · `don_hang.san_pham_ma`
  4.581/4.581 phần tử · số thuần 0) — bản đầu ép `Number()` sẽ TỪ CHỐI 100% sản phẩm thật ·
  **tra kết nối POS theo nhãn `page.thi_truong` trúng 0/502**, khoá đúng là `pos_shop_id`
  (112/502) · **`warehouse_id` không có nguồn nào trong v3** ⇒ fail-CLOSED, sale bổ sung.
  Kèm bẫy đắt nhất của lượt: nhạc trưởng ghi `so_ai(order)` TRƯỚC khi gọi `vaoHangCho`, nên
  nguồn (a) phải TRỪ sự kiện của chính lượt đó (`tinId`) — không trừ thì mọi dòng tự báo
  trùng và 0 đơn ra, im lặng. 5 dòng nợ §9 (3 🔴/🟡 đường đơn).
- 23/08 · L3-M4 → cổng `ops/bin/nghiem-thu/l3-m4.sh` **62 phép ĐẠT / 0 TRƯỢT / 1 HOÃN**
  (2 lượt liên tiếp, rc=0, sandbox tự dựng/dọn; HOÃN = tạo đơn THẬT §7b **T7**, `nap` tiêm
  ở mọi phép) · bộ ca `test/l3-m4-*` **44/44** · hồi quy gộp trong cổng **161/0** · hồi quy
  toàn v3 **326 ca / 1 đỏ CÓ SẴN** (`l2-m2-handler` «không cướp diễn đàn» — A/B `git stash`
  đúng tệp mình sửa xác nhận đỏ y hệt ở HEAD, nợ §9 23/08 của L2-M3) · `kiemTrung` chạy
  **THẬT** trên `aicloser_v3` (cấm mock): bắt cặp `501984606` → `trung_khop_san_pham` ·
  `ca_hai` · 2 đơn, phép CHỈ ĐỌC (dev hàng chờ 0/0, đơn 3784/3784) · RACE 2 lượt duyệt song
  song ⇒ 1 POST 1 đơn · 7 đảo-vá không đột biến nào sống sót · commit `e97fcb1` (code) +
  dòng này (sổ+nhật ký) · nhật ký `docs/thi-cong/nhat-ky/phieu-l3-m4.md`


- 23/08 · VA-Q12 → ✅ (TỔNG nghiệm thu) — cổng 17/17 ×2 · khach 0→3.218 · don_hang nối
  khach_id 3.779/3.784 · phép ăn tiền kiểm chéo độc lập: cặp 966501984606 trung=true
  ca_hai (tổng gọi thẳng kiemTrung với ctxHeThong + teamId tham số) · Q1·Q2·Q3 đóng ·
  commit 7c63859 · L3-M4 điểm (a) TRẢ-VỀ 5 CHAN → phiếu v2 đóng 8/8, chờ verify.

- 23/08 · L3-M3 → ✅ (TỔNG nghiệm thu) — cổng 23/23 · 28/28 test · hồi quy 94/94 · 9 tệp
  sạch pathspec · thợ tự chốt đúng: không tái dùng so_lan_thu_wa (trần khác), đếm bằng
  dòng lich_nhac; huỷ-bù doi_sua/khong_ro ở cầu nối · nợ mới: cửa ghi hẹp thứ 5 (ghiLich)
  · commit 7a22b59.

- 23/08 · L2-M3 → ✅ (TỔNG nghiệm thu) — cổng 11/11 · 17/17 test · seed mồi đã vào DB
  chính qua di-tru (bo_luat_chung 1 · ky_nang 3) · giới hạn thật thợ khai: bo_luat_chung
  chưa điều khiển model (buildSystem hardcode CORE — nợ giai đoạn 2) · ky_nang size seed
  bat=false chờ người chốt 2 SKU · 1 ca đỏ hồi quy = nhiễu thứ tự test DB chung (án lệ
  cũ, gate cuối chạy tuần tự) · commit 5347191.

- 23/08 · L3-M2 → ✅ (TỔNG nghiệm thu) — cổng 13/13+2 hoãn · 38/38 test + hồi quy nguyên ·
  chuẩn hoá SĐT kiểm chéo đồng nhất · mọi ngưỡng chốt bằng 5.144 đơn thật (cửa sổ 7 ngày
  = 17/20 cặp, dưới p75 nhịp mua lại 12,16 ngày; tầng canh_bao 107 khách ≈ cụm «144») ·
  3 khớp đứt Q1/Q2/Q3 → phiếu VA-Q12 · commit 9a7788c.

- 23/08 · L2-M2 → ✅ (TỔNG nghiệm thu) — cổng 8/8 · 18/18 test + hồi quy l2-m1 nguyên ·
  lỗ paano thật = «mag+khoảng trắng/gạch nối» (umorder đã khớp cũ) · nợ mới §9
  kb.js#SCRIPT_FIELDS (dashboard giai đoạn 2) · commit 38bcb71.

- 22/08 · L2-M1 → 🔎 chờ nghiệm thu — hàng đợi tin + nhạc trưởng v3
  (`db/migrate/003_tin_cho_xu_ly` bảng thứ 21 · `src/queue/` 4 tệp · `src/chat/` 6 tệp):
  worker rút việc bằng HAI khoá (`FOR UPDATE SKIP LOCKED` **cộng**
  `pg_try_advisory_xact_lock(hashtext(conv_id))` — khoá dòng chỉ chặn 1 TIN, hai tin cùng
  conv là hai dòng nên thiếu advisory lock là 2 worker cùng dựng state) · `chan_guard` là
  trạng thái RIÊNG KHÔNG retry (N6) · van NGUỒN fail-closed `PANCAKE_READONLY`/`V3_NAP_DEV`
  (N1a) · tin chữ qua cửa `guiTin`, ảnh qua `guiAnh`, tag/note qua `gatThe`/`ghiNote` —
  KHÔNG `pkSendReply`/`flushPendingImages` · `so_ai` đủ 5 loại §11.2 (neo
  `tin_cho_xu_ly:<loại>`) · `layModel(pool,ctx,{vaiTro})` fail-CLOSED khi team khai nhà
  cung cấp khác · `autoCreateOrder` GIỮ TẮT · bàn giao `docs/v3/ban-giao/duong-tin-v1.md`.
- 22/08 · L2-M1 → 🔴 LỆCH ĐỀ BÀI LỚN: phiếu ② khai **3** chỗ gửi ngầm, đo ra **5** — thêm
  `order-bridge.js:255 pkAddNote` (gián tiếp từ `tools.js:208`) và
  `pancake-orders.js:25/:108` **fetch HTTP tới POS bằng khoá thật 7 shop** (gián tiếp từ
  `tools.js:171`, **không** `PANCAKE_READONLY` canh, `catch{}` nuốt lỗi fail-OPEN). Bắt
  được nhờ bẫy `globalThis.fetch` trong bộ ca: **7 lượt lọt** ở lượt đo đầu trong khi mock
  `pancake.js`+`messenger.js` vẫn báo sạch ⇒ bộ ca theo đúng danh sách của phiếu sẽ XANH
  GIẢ. 🧭 bài học: danh sách mock là một LỜI KHAI — phép «không gửi gì ra ngoài» phải chặn
  ở TẦNG VẬN CHUYỂN, không chỉ tầng module. 5 dòng nợ §9 (2 dòng 🔴 đường đơn/tiền).
- 22/08 · L2-M1 → cổng `ops/bin/nghiem-thu/l2-m1.sh` **22 phép ĐẠT 22 / TRƯỢT 0** (2 lượt,
  rc=0) · bộ ca **23 ca xanh** (hàng đợi 12/12 · nhạc trưởng 11/11, cần cờ
  `--experimental-test-module-mocks`) · BA DÂN SỐ đều CHẠY, `pkSendReply=0` và
  `pkSendImage+sendImage(Graph)=0` ở cả ba, `fetch-lọt=0` · khoá hội thoại 0→1→2 · `so_ai`
  `{handoff:1,image:1,order:1,reply:5,spent_no_send:1}` · `ma_model` đổi theo mock
  `["mo-hinh-A","mo-hinh-B"]` · `autoCreateOrder=false`, `don_hang=0` · hồi quy v3 118/120
  (2 đỏ = nợ neo số bảng, TỔNG vá) · commit 4261900 · nhật ký
  docs/thi-cong/nhat-ky/phieu-l2-m1.md

- 22/08 · L3-M1 → 🔎 chờ nghiệm thu — máy trạng thái đơn `src/orders/` (4 tệp) + migration
  004 (`ly_do_khong_gui` CHECK 3 giá trị · `so_lan_thu_wa` · bất biến đôi «lý do chỉ sống cùng
  gui_wa_loi»): bảng chuyển KHAI CỨNG **per-nguồn** 13 cặp, deny-by-default, cặp ngoài bảng ném
  `LoiChuyenNgoaiBangDon` / ép sai nhánh ném `LoiSaiNhanhNguon`, lượt BỊ CHẶN vẫn ghi `nhat_ky` ·
  nhánh messenger ĐÚNG MỘT chuyển `da_tao→day_cho_in`, spy cửa WA = **0 TUYỆT ĐỐI**, 0 dòng
  pre-duyệt trong `don_hang` (đất L3-M4) · `xac_nhan` CAS THEO LIVE với `TAP_TIEN_IN=[0,1]`
  (**đo được**: mã 1=`submitted`, đồ thị `0→1→12→8`), live ngoài tập ⇒ 0 lượt ghi POS +
  `cho_sale` + `pos_trang_thai_la` · ba lý do không gửi đếm **1/1/1** trên riêng đơn trang bán
  hàng (messenger=0) + trần thử lại ⇒ `cho_sale` · job quét nhịp 4′ (trần 5′) rebind ctx PER-ĐƠN
  (26/26 đơn thật ở team KỸ THUẬT ⇒ ctx người bất khả dụng) · 3 hook cho L3-M3/M4.
- 22/08 · L3-M1 → 🔴 LỆCH ĐỀ BÀI (án lệ #4, đắt nhất lượt này): phiếu ④#3 đòi `live=1` →
  `day_cho_in`, nhưng cửa POS thật chỉ cho `0→12`/`12→0` ⇒ **ngoài đời ca đó vào `cho_sale`**;
  chỉ MOCK mới xanh. Không sửa cửa đã ✅ (án lệ #25) — code xử đúng cả hai đời (bắt lỗi, đơn
  sang `cho_sale` mang ĐÚNG TÊN LỖI), cổng thêm phép ③c ĐO CỬA THẬT + in ⏸ HOÃN, ca `C5` là neo
  known-answer sẽ ĐỎ khi ai vá xong. 5 dòng nợ §9 (P1–P4 + khai vượt pathspec 004).
- 22/08 · L3-M1 → cổng `ops/bin/nghiem-thu/l3-m1.sh` **34 phép · 0 ĐỎ · 3 HOÃN** (rc=0, sandbox
  tự dựng/tự dọn, dev `aicloser_v3` đo lại ra **26|26** — chưa đơn thật nào bị đụng) · bộ ca
  `test/l3-m1-*.test.js` 28/28 xanh, bộ v3 gộp 118/118 · 3 sự cố tự bắt trong lượt (phép ⑦b đo
  nhầm SANDBOX mà khai «dev» — án lệ #8; thước `G7` DELETE trên bảng chỉ-INSERT; backtick trong
  nhãn phép ③b chạy như lệnh shell) · commit `1017a615` (code) + dòng này (sổ+nhật ký) · nhật ký docs/thi-cong/nhat-ky/phieu-l3-m1.md

- 22/08 · L1-M2 → 🔎 chờ nghiệm thu — cửa Pancake Messenger `src/channels/messenger/`
  (2 file; 6 hàm docHoiThoai/docTin/guiTin/guiAnh/ghiNote/gatThe nhận ctx, bọc
  `pancake.js` qua import): định tuyến team qua `page.team_id` (lỗi có tên +
  `nhat_ky`) · N5 xác nhận hội thoại thuộc page qua `psid` — phát hiện lệch đề bài
  `convId` Pancake ≠ `psid` (bằng chứng: `pancake-poll.js:277` +
  `l7-miner-order.test.mjs:122`), giữ đúng khuôn `hoi_thoai` UNIQUE(page_id,psid)
  thay vì so nhầm convId · guard N1 fail-closed (`V3_PANCAKE_GUI==='1'` VÀ
  `PANCAKE_READONLY!=='1'`, vắng biến = ĐÓNG) chỉ áp nhóm GỬI/GHI · N3 `ctxHeThong`
  tự tra + gắn đúng team của page cho job nền. Cổng `l1-m2.sh` 15/15 ĐẠT (2 lượt),
  test 17/17 xanh, tính duy nhất trong V3 xác nhận bằng grep (①b) · commit
  `92afae3c` · nhật ký docs/thi-cong/nhat-ky/phieu-l1-m2.md
- 22/08 · L0-M2 → 🔎 chờ nghiệm thu — tầng truy vấn `src/db/` (5 file; ctx=
  {teamId,nguoiDungId} chốt hình dạng cho B): 2 lỗi tên LoiThieuBoiCanhTeam/LoiXuyenTeam
  · layNhieu/layMotTheoId/themMoi/suaTheoId tự chèn team_id cho 15 bảng nghiệp vụ, đặc
  cách đọc bo_luat_chung 2 vế · picker + ctxHeThong (đòi team_id tường minh, mọi lượt
  ghi nhat_ky); chống ĐẠT RỖNG bằng mẫu trộn tieu-alpha+auus, so DANH SÁCH id không so
  count. Cổng `l0-m2.sh` 16/16 ĐẠT, test 22 ca xanh (gộp l0-m1 52/52, bộ cũ 18/5 không
  hồi quy) · commit 9c40c9f · nhật ký docs/thi-cong/nhat-ky/phieu-l0-m2.md
- 23/08 · VA-P1 → ✅ — cặp {tu:1,sang:12} vào CHUYEN_CHO_PHEP (neo đồ thị 0→1→12→8) ·
  63/63 test (tổng chạy) · nợ P1 đóng · thợ phát hiện nợ thước: l1-m1.sh down gỡ nhầm
  bản mới nhất khi chuỗi >002 — tổng vá lùi-từng-bản-tới-ranh, 24/24 lại xanh.
- 23/08 · L2-M1 → ✅ — cổng 22/22 ×2 (tổng chạy lại 1 lượt xác nhận) · per-commit 4261900
  19 tệp sạch pathspec · thợ bẫy globalThis.fetch bắt 5 CHỖ GỬI NGẦM (đề khai 3): thêm
  order-bridge.js:255 pkAddNote + pancake-orders.js:25/:108 fetch POS KHOÁ THẬT 7 shop
  không READONLY canh, catch{} fail-open — mock-theo-danh-sách sẽ xanh giả · 6 dòng nợ
  §9 thợ append (2 🔴 đường tiền) · TỔNG đã: áp migrate 003+004 DB chính (4 bản) · regen
  schema (P2 đóng) · thước l0-m1 21 bảng · skill tho-thi-cong +2 bài học (private-index
  reset, bẫy fetch tầng thấp).
- 23/08 · L3-M1 → ✅ — cổng 34/0/3-hoãn (tổng chạy, sandbox) · per-commit 1017a615 11 tệp
  - vượt-pathspec CÓ XIN (004, luoc-do §8) tổng DUYỆT · đơn thật 26|26 nguyên · thợ phát
    hiện P1: CHUYEN_CHO_PHEP cửa POS thiếu cặp 1→12 (máy fail-closed thay vì lọt) — phiếu
    vá VA-P1 phát riêng · P2: schema.sql regen MỘT THỂ sau khi 003 (L2-M1) vào — tổng làm
    ở gate.
- 22/08 · L3-M1 → 🎫→🟨 — điểm (a) 2 CHAN (nhánh messenger nhầm bảng · thiếu trạng thái
  thất bại) → v2 đóng 7/7, verify DAT 6/6 ô bảng 01 §1. ⚠️ BẢN V2 THẬT = commit `7069d31`
  (141 dòng); `deabfe1` mang cùng message nhưng RỖNG RUỘT (sự cố heredoc) — tra sử đừng
  bốc nhầm.
- 22/08 · L1-M3 → ✅ — cổng 24/24+1 HOÃN (tổng chạy) · per-commit 01063fa+301546c sạch
  pathspec · exports chỉ guiTinMau + 5 lỗi tên (không gửi tự do) · endpoint WA Pancake
  CHƯA TỒN TẠI (thợ đo, adapter LoiChuaCoEndpoint chờ H1) · 🧭 sự cố heredoc+amend của
  tổng: deabfe1 rỗng ruột, amend nuốt commit thợ — gỡ bằng reset --soft về 01063fa,
  phiếu tách thành 7069d31; luật mới: tổng nối && xuyên heredoc, cấm amend khi thợ chạy.
- 22/08 · L1-M1 → ✅ — chặng 1 7/8 (phép ④ nhiễu song song, tổng đo lại per-commit
  f5611cb+dff58ed: 20/20 tệp ⊆ ③) · cổng 24/24 + 1 HOÃN minh bạch (⑤c ghi thật chờ diễn
  tập VPS) · kiểm chéo DB 5 phép khớp · 🧭 SỰ CỐ + BÀI HỌC: commit sổ b356f7b của TỔNG
  không mang pathspec đã nuốt 6 tệp L1-M2 (index chính stale vì thợ commit bằng
  private-index) — khôi phục nguyên vẹn (diff với 92afae3c = rỗng); từ nay TỔNG commit
  cũng bắt buộc `git commit -- <pathspec>`; phiếu song song thì phép ④ đo per-commit khai
  trong nhật ký, không đo cả khoảng cây · thước l0-m1 vá nhận bảng 20 ket_noi_pos, 51/51
  lại xanh · N8+N2 thợ nêu: ĐÃ XỬ.
- 22/08 · L1-M2 → ✅ — chặng 1 8/8 · cổng 15/15 (tổng chạy) · kiểm chéo 3 phép độc lập
  (LoiCuaGuiDong fail-closed, guard đặt NGAY TRƯỚC send · grep duy nhất = 1 file · path
  lạ vẫn chặn) · thợ phát hiện convId ≠ psid (án lệ #4, tra chéo bằng psid đúng cột
  UNIQUE thật) · commit 92afae3c.
- 22/08 · L0-M2 → ✅ + GATE R0 XANH — chặng 1 8/8 · cổng 16/16 (tổng chạy) · kiểm chéo độc
  lập 5 phép (LoiThieuBoiCanhTeam · picker 3 slug · ctx kỹ thuật chặn · LoiXuyenTeam +
  nhat_ky 0→1) · test v3 52/52 ×2 lượt · commit thợ 9c40c9f · PHÁN TỔNG: gate NHỎ nội bộ
  (không push/prod) tự qua khi phần máy xanh — theo 2 lệnh tăng tốc 22/08; gate có
  push/deploy vẫn DỪNG chờ người. Bộ test cũ LOẠI khỏi gate (tự ghi conv-state.json thật,
  nợ §9) — thay bằng phép ⑤ chan1 (diff không đụng file phẳng src/).
- 22/08 · L1-M2 → 🎫 sẵn sàng chờ R0 — điểm (a) TRẢ-VỀ 3 CHAN (guard sai chiều · lối vòng
  tools.js · ctxHeThong không team) → v2 đóng 6/6, verify DAT · H9 gom thêm V3_PANCAKE_GUI.
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
- 22/08 · L1-M1 → 🔎 chờ nghiệm thu — cửa POS `src/pos/` (9 tệp) + migration 002 `ket_noi_pos`
  (bảng thứ 20, khoá mã hoá): docDon/docDanhMuc + ghiNguocTrangThai BỐN CỬA (van V3_POS_GHI
  fail-CLOSED · bảng chuyển nạp từ bảng mã ĐÃ XÁC MINH 3.546 đơn/7 shop, «Chờ in»=12, không
  đường tới xoá đơn · compare-and-set đọc LIVE trước PUT · nhật ký 2 pha để lại dòng mồ côi);
  4 lệch đề bài đo được (POS KHÔNG chặn IP máy này · 8=packing chứ không hủy/hoàn · id đơn là
  dãy riêng từng shop ⇒ ma_pos mang shop · danh mục POS giá 0 ⇒ goi_gia 0 dòng) và 8 dòng nợ §9.
  Cổng `ops/bin/nghiem-thu/l1-m1.sh` 24 ĐẠT/0 TRƯỢT/1 HOÃN (⑤c ghi ngược THẬT CHƯA CHẠY — chờ
  diễn tập VPS), bộ ca 34/34 · commit f5611cb · nhật ký docs/thi-cong/nhat-ky/phieu-l1-m1.md
- 22/08 · L1-M3 → 🔎 chờ nghiệm thu — cửa Pancake WhatsApp `src/channels/whatsapp/`
  (4 file; `guiTinMau(pool,ctx,{soNhan,tenMau,thamSo,donHangId})` — SAO CHÉP cơ chế đã
  duyệt L1-M2: định tuyến team qua `don_hang` thay `page` (Cloud API không có khái niệm
  Facebook Page) · `ctxHeThong()` gắn đúng team cho job nền · guard fail-closed riêng
  `V3_WA_GUI` (chung `PANCAKE_READONLY` — một van cho mọi đường Pancake). CỘNG nhật ký
  HAI PHA (khuôn `ghi-nguoc.js` L1-M1: `wa_gui_bat_dau`/`wa_gui_ket_qua`, lỗi
  `coPhanHoi=true` vẫn ghi pha 2, mất tín hiệu mạng thật mới để mồ côi). MỚI theo phiếu:
  rào NGUỒN ĐƠN (chỉ `don_hang.nguon='trang_ban_hang'`, 01 §1 — `LoiSaiNguonDon`) + LUẬT
  MẪU TIN (chỉ `da_duyet=true` — bảng `mau-tin.js#BANG_MAU_TIN` RỖNG THẬT, Meta chưa
  duyệt mẫu nào, 90-phu-luc §M1/§M2 còn trống — không bịa mẫu). Endpoint Pancake
  WhatsApp CHƯA XÁC ĐỊNH (đo lại: `pancake.js` không có route `/whatsapp`; 01 §4 = điểm
  kiểm H1 chưa chạy) — adapter thật `guiMauQuaPancake` LUÔN ném `LoiChuaCoEndpoint`
  (`coPhanHoi=true`, không bịa endpoint). Đối chiếu `PHIEU-L3-M1.md` +
  `bien-moi-truong-v3.md` (soạn song song) xác nhận tên hàm/lỗi/biến khớp hợp đồng đã
  ký, không có CHAN mới. Cổng `l1-m3.sh` 24/24 ĐẠT + 1 HOÃN minh bạch (gửi WA thật, §7b
  T1, chờ H1) · test 17/17 xanh · chặng 1 5/8 (phép ④/⑥ NHIỄU SONG SONG từ 7 commit
  `docs(dieu-hanh)` của TỔNG soạn L2-M1/L3-M1 trong lúc code — xác minh bằng
  `git status --short` + `git diff --numstat` chỉ có đúng 8 tệp pathspec ③, 0 marker
  trong file của tôi) · commit `01063fa` · nhật ký docs/thi-cong/nhat-ky/phieu-l1-m3.md
- 23/08 · VA-P1 → ✅ — `ma-trang-thai.js#CHUYEN_CHO_PHEP` thêm cặp `1→12` (đóng nợ P1,
  neo đồ thị đơn 47397 UAE 0→1→12→8), ca `C5`/`M3` cập nhật theo hành-vi-mới + test mới
  `D5`, bộ ca l1-m1+l3-m1 63/63 xanh · `l1-m1.sh` 23 đạt/1 trượt (CÓ SẴN trước vá, A/B
  stash xác nhận, nợ mới ghi §9)/1 hoãn (có sẵn, ⑤c chờ VPS) · commit `b3d4e10` · nhật ký
  docs/thi-cong/nhat-ky/phieu-va-p1.md
- 23/08 · L2-M2 → 🔎 chờ nghiệm thu — lớp từ khoá v3 (`src/chat/lop-tu-khoa.js`, chêm bậc
  "4b" TRƯỚC Fast Lane/classify trong `handler-v3.js`): luật thật/giả + hỏi size trả lời từ
  `kb.config.fastLaneAuth`/`fastLaneSize` (quy ước KB mới), NHƯỜNG (không bịa) khi trang
  chưa có dữ liệu; vá lỗ `paano mag order` (biến thể tách chữ PH mà `ASK_HOWTO` của
  `fast-lane.js` bỏ sót — đo lại xác nhận cả 3 ví dụ phiếu nêu, trừ `paano umorder` ĐÃ khớp
  sẵn, lệch nhỏ đã ghi rõ trong nhật ký). Câu trả lời qua CÙNG cửa `outbound-guard` (M09)
  với Fast Lane/AI — không miễn kiểm; bắt được ghi `so_ai` `lane='tu_khoa_v3'`
  `ma_model='khong-goi-model'`. Không đụng `fast-lane.js`/file phẳng `src/`/vùng
  `src/orders`·`src/pos`·`src/channels` (2 thợ khác đang ở đó).
- 23/08 · L2-M2 → thuật ngữ đề bài ④#1/#3 "model 0 lượt (spy layModel=0)" **không thể là
  nghĩa đen**: đo kiến trúc thì `d.layModel(...)` (tra CẤU HÌNH model) chạy KHÔNG ĐIỀU KIỆN
  ở bước ② handler cho MỌI tin, TRƯỚC CẢ bước 4b — LUÔN = 1 dù lớp từ khoá có bắt hay không
  (kiến trúc L2-M1 có sẵn, ngoài phạm vi phiếu). Đọc theo Ý ĐỊNH (0 token/không sinh
  completion) và đo bằng `dem.goiModel`/`deps.chayCloser` (seam đã có sẵn) thay cho literal
  `layModel` — ghi RÕ giả định tại chỗ quyết (luật 11 skill), không dừng phiếu vì có bằng
  chứng đo, không phải một ngã rẽ thiết kế. Chi tiết đủ cả 2 dòng trên: nhật ký
  `docs/thi-cong/nhat-ky/phieu-l2-m2.md` · cổng `ops/bin/nghiem-thu/l2-m2.sh` **8 phép ĐẠT
  8 / TRƯỢT 0** (3 lượt liên tiếp rc=0) · bộ ca l2-m2 18/18 xanh + hồi quy l2-m1 nguyên
  vẹn (hàng đợi 12/12 · nhạc trưởng 11/11) · commit `38bcb71`
- 23/08 · L3-M2 → 🔎 chờ nghiệm thu — lọc trùng CHÉO hai luồng (`src/orders/loc-trung.js`)
  - chấm tỉ lệ hoàn BỐN TẦNG (`src/orders/ti-le-hoan.js`, migration 005): chuẩn hoá SĐT là
    hàm THUẦN + nguồn luật DUY NHẤT (SQL chỉ lọc thô bằng bảy chữ số cuối — an toàn MỘT
    CHIỀU chứng minh được, không có bản luật SQL song sinh); vế sản phẩm mù thì fail-CLOSED
    bằng mã lý do RIÊNG `nghi_trung_chua_ro_san_pham`, KHÔNG đọc cột rỗng thành «sạch»;
    ⛔ KHÔNG dòng mã nào đọc `tang_hoan` để CHẶN (01 §11 còn «Chờ chốt») — ca `C4` bắt đỏ nếu
    ai thêm `don_hang`/`viec_can_xu_ly`/`INSERT`/`DELETE` vào câu ghi.
- 23/08 · L3-M2 → mọi quyết định số chốt bằng **5.144 đơn POS THẬT / 7 shop** (GET, 0 lượt
  ghi, `PANCAKE_READONLY=1`): cắt mã quốc gia gom thêm **58 khách** (4.558→4.500) và nâng
  trùng-chéo bắt được 48→**56 khách** · **20 cặp** (messenger, trang bán hàng) cùng sản phẩm
  — ví dụ đọc được SĐT `966501984606` đơn #68771/#68769 cách **0 ngày** · cửa sổ **7 ngày**
  bắt 17/20 trong khi p75 nhịp mua lại là 12,16 ngày · tầng `canh_bao` 30–65% = **107 khách**
  (cụm thật, cỡ khớp «144 khách» 01 §11) · hạ sàn 2→1 làm `rui_ro_cao` nhảy **130→953**.
  Ba nguyên liệu đề bài ② khai thiếu (không cột sản phẩm · `khach` 0 dòng · `status_history`
  có nhưng không lưu) đã xử + ghi §9 nợ **Q1·Q2·Q3** (đều thuộc đất L1-M1, không tiện tay sửa).
- 23/08 · L3-M2 → cổng `ops/bin/nghiem-thu/l3-m2.sh` **13 phép ĐẠT 13 / TRƯỢT 0 / ⏸ HOÃN 2**
  (hoãn: phân tầng 144 khách THẬT + vế «cùng sản phẩm» trên đơn THẬT — cả hai chờ cửa POS
  nối `khach`/`san_pham_ma`) · bộ ca l3-m2 **38/38** · hồi quy L3-M1 **28/28** · l0-m1
  **12/12** (S11 xanh sau regen `db/schema.sql` từ 001–005; 005 KHÔNG thêm bảng ⇒ NEO 21 giữ
  nguyên) · migration 005 đã áp lên CSDL dev · commit `9a7788c` · nhật ký
  `docs/thi-cong/nhat-ky/phieu-l3-m2.md`

- 23/08 · L2-M3 → 🔎 chờ nghiệm thu — ráp `kb` cho `buildSystem` từ BỐN KHỐI DB
  (`src/chat/rap-prompt.js` + `ngan-sach-luot.js`, seed `db/di-tru/bo-luat-va-ky-nang.js`):
  bo_luat_chung đọc OR-IS-NULL qua tầng truy vấn có sẵn nhưng CHƯA điều khiển model thật
  (CORE vẫn hardcode trong `prompts.js` — giới hạn ghi rõ §9) · kỹ năng/kịch bản/sản
  phẩm CÓ hiệu lực qua `kb.text`/`kb.config` · cờ `V3_RAP_PROMPT_BAT` (vắng=đóng) lùi
  nguyên kb.js cũ, đo bằng `kb.nguon` thay spy.
- 23/08 · L2-M3 → ngân sách lượt thay trần 4 cứng bằng `turnBudget()` (lead-score.js,
  đọc-qua-import): 5 bậc **1→3→6→10→12** tăng dần, trần=`HARD_MAX_TURNS`; điểm lưu
  `hoi_thoai.diem_lead`/`diem_nong` (2 cột có sẵn từ migration 001, chưa ai ghi — khớp
  đứt đã mở qua `kho.js`) · cờ `page.trong_diem` đóng dấu vào mọi `so_ai`. Gây hồi quy
  ĐÃ CHẨN ĐOÁN đúng 1 ca `test/l2-m2-handler.test.js` (ngân sách LẠNH=1 lượt bị tiêu bởi
  ca chạy trước, chia sẻ `hoi_thoai`) — KHÔNG phải bug, xem §9.
- 23/08 · L2-M3 → cổng `ops/bin/nghiem-thu/l2-m3.sh` **11/11 phép ĐẠT** (7 phép đề bài,
  ⑦ tách 5 mục a-e) · bộ ca **17/17 xanh** · hồi quy l2-m1 nguyên vẹn (hàng đợi 12/12 ·
  nhạc trưởng 11/11), l2-m2 lớp từ khoá 12/12 nguyên, l2-m2 handler 1 ca đỏ đã biết
  trước (⑦e tự nhận diện bằng TÊN, không chỉ đếm số) · commit `5347191` · nhật ký
  `docs/thi-cong/nhat-ky/phieu-l2-m3.md`

- 23/08 · L3-M3 → 🔎 chờ nghiệm thu — hàng đợi nhắc `src/orders/lich-nhac.js` (2h×5, job
  TỰ quét đơn `da_gui_wa` chưa có lịch — không hook `quet-don-moi.js`, cấm đụng pathspec)
  - bộ đọc ý 4 nhánh `src/orders/doc-y.js` (luật từ khoá EN/AR/PH, hàm thuần, so theo
    TỪ/CỤM TỪ có biên) + cầu nối `src/orders/nhan-phan-hoi-wa.js` (docY → nhanPhanHoi, bù
    `huyLichNhac` cho doi_sua/khong_ro vì L3-M1 chỉ tự huỷ 2/4 nhánh, ghi sự kiện `so_ai`
    neo riêng). `taoHuyLichNhac` cắm THẬT chỗ chờ §5 bàn giao L3-M1 (thay no-op).
- 23/08 · L3-M3 → cửa ghi hẹp thứ NĂM (`ghiLich`, cùng họ N3/P3/nợ-L3-M2) vì `suaTheoId`
  vẫn chưa hỗ trợ `ctxHeThong()` · quyết định tự chốt: KHÔNG tái dùng
  `don_hang.so_lan_thu_wa` cho hàng đợi nhắc (cột đó là của `quet-don-moi.js`, trần khác,
  domain khác) — đếm bằng số DÒNG `lich_nhac` của đơn thay vào đó.
- 23/08 · L3-M3 → cổng `ops/bin/nghiem-thu/l3-m3.sh` **23/23 phép ĐẠT / 0 TRƯỢT / 0 HOÃN**
  (sandbox tự dựng/dọn, dev `aicloser_v3` đo lại 0 dòng `lich_nhac` — chưa đơn thật nào bị
  đụng) · bộ ca `test/l3-m3-*.test.js` **28/28** xanh, hồi quy l3-m1+l3-m2 gộp **94/94** ·
  3 bẫy THƯỚC tự bắt trong lượt (test tự-nhiễm-nhau qua job quét toàn CSDL dùng chung
  sandbox · bash single-quote không escape được nháy đơn lồng · đóng ngoặc thừa 1 dấu `"`
  ở năm khối `nodex`) · commit `7a22b59` (code) + dòng này (sổ+nhật ký) · nhật ký
  `docs/thi-cong/nhat-ky/phieu-l3-m3.md`

- 23/08 · VA-Q12 → ✅ — `docDon` (`src/pos/doc-don.js`) nay upsert `khach` theo SĐT
  chuẩn hoá + ghi `don_hang.khach_id`/`san_pham_ma` cho MỌI đơn đọc về (kể cả backfill
  đơn đã có, không chỉ khi trạng thái đổi — nếu không 26 đơn cũ không bao giờ được nối)
  · Q3 làm luôn: migration `006_lich_su_trang_thai` (`don_hang.status_history jsonb`,
  KHÔNG thêm bảng, thước l0-m1 giữ 21) · nhập `chuanHoaSdt` THẲNG từ `loc-trung.js`
  (không qua barrel `orders/index.js` — tránh vòng `src/pos↔src/orders`, lý do đo được
  ghi trong nhật ký). BẰNG CHỨNG THẬT: cổng `ops/bin/nghiem-thu/va-q12.sh` **17/17 ĐẠT
  / 0 TRƯỢT / 0 HOÃN** (2 lượt liên tiếp trên `aicloser_v3` dev thật + POS GET thật —
  KHÔNG sandbox, đúng chữ phiếu "di trú lại 26 đơn cũ"/"kiemTrung trên dữ liệu thật"):
  26/26 đơn cũ có `khach_id` · `kiemTrung()` BẮT ĐƯỢC cặp trùng chéo thật SĐT
  `966501984606` (#68771 messenger / #68769 trang bán hàng, phép ăn tiền của phiếu) ·
  bộ ca `va-q12-doc-don.test.js` **10/10** · hồi quy l1-m1 **35/35** · l3-m2+l3-m1
  **66/66** · l0-m1 **12/12**. Hệ quả phụ đã đo: quét đủ sâu để chạm 26 `ma_pos` cũ +
  cặp lịch sử 19/08 làm `don_hang` dev 26→3.784, `khach` 0→3.218 (chỉ THÊM đơn UAE/Saudi
  thật qua GET, không xoá/nhân đôi). Đóng nợ **Q1·Q2·Q3** (§9 23/08). Nợ mới ghi §9:
  `docDon` có thể bỏ sót trang khi POS trả một trang rỗng thoáng qua (đất L1-M1) · commit
  `7c63859` (code) + dòng này (sổ+nhật ký) · nhật ký `docs/thi-cong/nhat-ky/phieu-va-q12.md`
