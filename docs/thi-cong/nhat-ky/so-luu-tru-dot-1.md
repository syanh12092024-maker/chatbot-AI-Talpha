# SỔ LƯU TRỮ — §10 đợt 1 (22–23/08/2026, nén tại gate toàn cục)


- 23/08 · VA-T1 → ✅ — vá 4 thước trôi (bo_luat_chung đếm DELTA · l3-m1 ⑦b bất biến
  TRƯỚC≡SAU thay hằng "26" · l3-m2 ⑦ lùi-bản-trước-khi-down-005 · l2-m2-handler mỗi
  ca hội thoại riêng), 0 dòng `src/**` đụng · 13/13 cổng rc=0 · test 328/317p/0f
  (mọi phép 2 lượt y hệt) · commit 9b5fadf · nhật ký
  `docs/thi-cong/nhat-ky/phieu-va-t1.md`.
- 23/08 · L3-M4 → ✅ (TỔNG nghiệm thu) — chan1 8/8 · cổng 62/0/1-hoãn (T7) · đảo-vá 7/7
  đột biến không sống · 3 lệch đề bài thợ đo (variation_id UUID · pos_shop_id · warehouse
  không nguồn) · kiemTrung thật bắt cặp trùng · commit e97fcb1 — **12/12 MODULE A XONG**.
- 23/08 · TỔNG · gate toàn cục 13 cổng — 9 xanh · 4 đỏ đều là THƯỚC trôi theo cây sống
  (bo_luat +1 seed · 26→3.784 đơn · 006 sau 005 · fixture kb thiếu products + share PSID)
  → phiếu VA-T1; 1 bài học đo rc tách dòng; code nghiệp vụ 0 bug lộ ra ở gate.
- 23/08 · L3-M4 → 🔎 chờ nghiệm thu — hàng chờ tạo đơn Messenger `src/orders/hang-cho.js`
  - cửa TẠO ĐƠN THẬT `src/pos/tao-don.js`: NĂM cửa §7.3 (đủ trường · tiền · chống trùng ·
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
