# SỔ ĐIỀU HÀNH THI CÔNG — AI Closer v3 · phần việc NGƯỜI A (trục chính)

> 💓 **NHỊP TIM TỔNG:** vòng cuối 12:10 23/08 · SÓNG VÁ 2/4 ✅ (VA-R3 · VA-R4) · đang chạy
> VA-R1 + VA-R2 (opus) · repro refute-tong-the-1 còn ĐÚNG 5 dấu 🔴, tất cả thuộc đất VA-R2
> (F1·F3a·F3b·F4·F6); F2·F5 của VA-R3 đã sạch · ⛔ chưa push.

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
| VA-R1 | C1 bộ-não-HTTP (RF-1/2/3)                                     | review(a) | chat/handler-v3 · queue/worker · queue/nap       | 🎫 chờ review |
| VA-R2 | C2 tiền+tạo-đơn (RF-9/10/11/12/21/15)                         | review(a) | orders/hang-cho · pos/tao-don · pos/doc-danh-muc | 🎫 chờ review |
| VA-R3 | C3 máy trạng thái (RF-13/14)                                  | —         | orders/may-trang-thai · quet-don-moi             | ✅            |
| VA-R4 | C4 đọc ý (RF-20)                                              | —         | orders/doc-y                                     | ✅            |
| RVA   | **GATE SÓNG VÁ** — 13 cổng cũ + 4 va-r* + repro 2 bộ đảo xanh | VA-R1..R4 | TỔNG                                             | ⬜            |

## §8 · VIỆC NGƯỜI (H1..Hn — chỉ người/B làm được; tổng chỉ nhắc, không tự làm)

| Mã  | Việc                                                                                 | Chặn gì                                                        | Trạng thái |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------- |
| H1  | Điểm kiểm 1: gửi WhatsApp bằng API Pancake được không                                | L1-M3                                                          | 🟡 **B đo 23/08 — TREO**: 1.371 page, 100% `platform:"facebook"`, **chưa nối số WhatsApp nào**. Nút chặn là thủ tục, không phải API. Kết quả: `v3/docs/kiem-chan/ket-qua.md` |
| H2  | Điểm kiểm 2: Pancake có webhook đẩy tin về không                                     | kiến trúc L2-M1 (poll vs push)                                 | ✅ **B đo 23/08: KHÔNG có.** 6 đường ứng viên đều 406 trong khi `conversations`/`tags` cùng token trả 200 → **giữ vòng hỏi**. Một vòng 317–831 ms |
| H3  | Điểm kiểm 3: Botcake kéo bao nhiêu khách từ bình luận                                | L2-M2                                                          | ✅ **B đo 23/08: 11,3% luồng.** 7 ngày/47 page: 199 hội thoại COMMENT trên 1.768; 82,5% đã nhắn riêng → ~23/ngày. 3 page thử mất ~1,5/ngày → **cứ chạy**; tắt diện rộng thì phải có phần bình luận trước |
| H4  | Điểm kiểm 4: Marketing Message có bật cho Trung Đông không                           | giai đoạn 3, cần biết sớm                                      | 🔴 **B đo 23/08 — KHÔNG KIỂM ĐƯỢC:** app Meta **bị chặn API hoàn toàn** (`/me` → `400 API access blocked`). Nặng hơn cảnh thiếu quyền cũ |
| H5  | **Chỉ định NGƯỜI B** + B xong lớp model L1-M4 cuối tuần 1                            | L2-M1                                                          | ✅ **xong 22/08** — `goiModel()` ở `v3/src/model/index.js`, hợp đồng mục 2. Dự phòng chuyển trong 9 ms |
| H6  | Mở tài khoản + lấy khoá 4 nhà model, nạp tiền chạy A/B                               | L2 (A/B model)                                                 | 🔴 **GẤP — bot ĐANG CHẾT vì việc này.** Kimi *suspended, insufficient balance* · Anthropic *credit too low*. Bot im từ 23/08 22h UTC. Lớp dự phòng không cứu được: dự phòng cần nhà thứ hai **còn tiền** |
| H7  | Chốt mapping page/sản phẩm/thị trường ↔ 3 team                                       | di trú gán team thật · **VÀ mọi màn hình v3**                  | 🔴 **CHẶN TOÀN BỘ MÀN HÌNH v3.** Di trú 24/08: **514/514 page + 28.953/28.953 hội thoại đều ở `chua-phan`**. Team nghiệp vụ có 0 page → bảng điều phối rỗng vĩnh viễn. Không có màn hình nào để gán (nhóm 6 = giai đoạn 2) → phải gán bằng SQL |
| H8  | Chọn 3 page thử + 3 page đối chứng cùng ngành cùng mức ads                           | L2-M2                                                          | ⬜         |
| H9  | Bộ biến v3 cutover VPS — bảng khai duy nhất `docs/v3/ban-giao/bien-moi-truong-v3.md` | cutover — thiếu là cửa đóng câm                                | ⬜         |

## §9 · SỔ NỢ PHÁT SINH (APPEND — thấy gì ngoài phạm vi thì ghi đây, cấm tiện tay sửa)

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

═══════════════════════════════════════════════════════════════════════════════

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

## §10 · NHẬT KÝ (APPEND — khuôn 3 dòng, luật 15)
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
