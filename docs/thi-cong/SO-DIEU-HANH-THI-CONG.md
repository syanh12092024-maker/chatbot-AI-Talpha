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
