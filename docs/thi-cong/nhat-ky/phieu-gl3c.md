# Nhật ký phiếu GL3c — Pancake lỗi KÉO DÀI không thành «bot câm im lặng» (07/10/2026 · thợ GL3c)

**Môi trường đo:** máy dev (Node v24, macOS). `fetch` GIẢ trong mọi ca (host khác `pages.fm` thì ném), 2 token giả, hộp cát Postgres
127.0.0.1:5432 (`aicloser_v3_test_gl3c_{nap,wh}_p<pid>`, tự dựng/dọn qua `db/sandbox.js`, có 033 + 034). Không lượt mạng thật nào, không đo
prod, không đo `aicloser_v3`. `.env` giữ `PANCAKE_READONLY=1` (cổng ⓪ đọc lại mỗi lượt); ca chỉ mở van trong `process.env` của tiến trình ca,
SAU khi đã cài fetch giả. Làn 🟥. Base phiếu `ff3526a` (HEAD lúc nhận `6a05ddc`, chỉ khác tài liệu). Giữa lượt, tổng cherry-pick GP1 (`cb3c953`,
ngoài ③) và thêm 3 commit tài liệu (`5aa2dc3` · `d9ba7b9` dọn `.env` · `e0788dd` phiếu RP1). Mã GL3c commit trên `e0788dd`.
**Commit mã: `aedee92`** (12 tệp, đúng ③; `gl3b.sh` KHÔNG phải đổi neo nào). Tôi là thợ duy nhất trong cây chung. GP1 chạy cổng cũ ở worktree
riêng, chỉ tranh CPU/Postgres; không gặp đỏ lạ nào phải chạy lại. Lượt bị ngắt một lần do lỗi tài khoản API (tổng báo), sau đó chạy lại cổng
đầy đủ từ đầu.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GL3B-NAP-LOI-BEN\|N-GL3B-CONV-NUOT-LOI\|N-GL4-NAP-KHONG-DEM\|N-GL3B-WEBHOOK-MAPPING\|N-GL4-DOWN-GIU-PAGE"
1287:  - **N-GL3B-WEBHOOK-MAPPING** (/code-review GL3b #1, đọc mã) page WEBHOOK: worker tra mapping qua `docHoiThoai` → `pkGetConversations` …
1291:  - **N-GL3B-NAP-LOI-BEN** (/code-review #3) page POLL: đọc lịch sử lỗi BỀN (121 không ghế gói · «Thiếu mã khách hàng» · Pancake sập lâu) …
1294:  - **N-GL3B-CONV-NUOT-LOI** (phiếu ⑥ · review (a) G2) `pkGetConversations` nuốt lỗi ⇒ vòng nạp «0 hội thoại» …
1345:  - **N-GL3B-HANG-LOI-CHUNG** thứ hạng lỗi chỉ ở `pkDocTin`; `pkGetConversations` (nuốt ⇒ `[]`, …) và `pkTagId` …
1374:  - **N-GL4-NAP-KHONG-DEM** GL4 KHÔNG đếm lỗi ở bước NẠP (`pkGetConversations` nuốt lỗi · `LoiDocLichSu` của bộ nạp chỉ lùi) …
1393:- 07/10 · tổng (đối kháng GL4) — **N-GL4-DOWN-GIU-PAGE** …
$ ls ops/bin/tra_no.py docs/thi-cong/SO-NO.md      → cả hai không tồn tại
```
Quan hệ: **trả** N-GL3B-NAP-LOI-BEN · N-GL3B-CONV-NUOT-LOI · N-GL4-NAP-KHONG-DEM · N-GL3B-WEBHOOK-MAPPING (phần «danh sách đọc lỗi»; phần
«đọc được mà không có mapping duy nhất» còn, đó là G2 ở phiếu ⑥) · trả **một phần** N-GL3B-HANG-LOI-CHUNG (`pkGetConversations` nay chọn câu
lỗi «thật» nhất theo đúng thứ hạng của `pkDocTin`; `pkTagId` vẫn chưa). Không trùng phán cũ. N-GL4-DOWN-GIU-PAGE KHÔNG vá (ngoài ②, xem Nợ).

## Bước 3 — đo lại nguyên liệu đề bài (ở base)
Mọi `tệp:dòng` phiếu dẫn đều đúng: `pancake.js:342-345` (`j.conversations || []`) · `nap.js:389,422` (docHT) · `messenger/index.js:154-158` ·
`kho-suc-khoe.js:519-521,536` · `nap.js:511-526` (catch `LoiDocLichSu`), `:519` là neo gl3b ⑤d/⑤o · `worker.js:211` (tra mapping), `:333` là neo gl4
⑤q · `worker.js:86` `chenViec` (nội bộ) · `ngat-page.js:59` là neo gl4 ⑤c · `chay-worker.js:107,119` (`boNap`). Neo mà R2-N3 kể, mỗi chuỗi
đúng 1 lần ở base: gl4 ⑤b ⑤n ⑤c ⑤h ⑤o ⑤p ⑤ae ⑤u ⑤v (ngat-page) · ⑤a ⑤g ⑤i ⑤l ⑤m ⑤q ⑤aa ⑤ab (worker) · ⑤j ⑤z (chay-worker) · ⑤r ⑤s (pancake) ·
⑤f (index); gl3b ⑤v ⑤v2 ⑤w ⑤v3 ⑤m ⑤x1–⑤x4 (pancake) · ⑤a (index) · ⑤b ⑤f ⑤k ⑤l ⑤q ⑤r–⑤u (worker) · ⑤d ⑤e ⑤n ⑤o (nap). Sau khi sửa, cổng
gl4.sh (44/44) và gl3b.sh (49/49) áp được MỌI đột biến của chúng, nghĩa là không chuỗi neo nào thành 2 lần.
**Đo thêm:**
- 502 HTML ở `/conversations` chỉ tốn 1 lượt GET, không xoay token.
- Lỗi mạng tốn 2 lượt (2 token).
- `hoi_thoai.ly_do_cuoi` và `nhat_ky.hanh_dong` không có CHECK, nên giá trị mới `doc_lich_su_loi_ben` / `hoi_thoai_doc_loi_ben_ban_giao` không
  cần migration.
- `bocCuaGuiBen` chỉ bọc 4 tên, nên export mới `LoiDocHoiThoai` từ cửa không lọt vào cửa gửi.

**Lệch đề bài:** không có.

## Danh sách ca (viết TRƯỚC mã — CHO-QUA · CHẶN · BIÊN · HÀNH VI trọn đường)
`test/gl3c-nap-loi.test.mjs`. Đường thật `motLuot`/`napTuPoll` → cửa thật → `pkGetConversations`/`pkDocTin` → `pkFetchPage` → fetch giả. Worker
`chayMotVong` thật. Chỉ tiêm `dongHo` + chờ-gõ = 0 + bộ não giả. «Qua 30′» = UPDATE `ngat_den` (đồng hồ CSDL) rồi `motLuot` mở thật. Mỗi lần
gọi `napTuPoll` trực tiếp đều khẳng định `r.mo === true`. Mỗi phép phủ định đếm GET đúng page / đúng hội thoại.

- **P1** · `/conversations` 502 liên tục:
  - t0 và t0+60 s chưa ngắt; log có «1 page lỗi danh sách» (BIÊN dưới).
  - t0+120 s ngắt `doc` ≈30′, đúng 1 nhật ký đúng team (BIÊN đúng). Lý do không lộ token.
  - Đèn `ngat_kenh` ĐỎ (bangDen thật trên hộp cát).
  - Tin W của P KHÔNG bị rút ngay trong lượt ngắt, nhờ bộ nhớ chung.
  - Vòng sau: 0 fetch cho P, Q vẫn fetch.
  - Qua 30′ + lành ⇒ mở đúng 1 lần; khách của P vào hàng (lúc lỗi không ghi mốc nào); W được xử.
- **P1n** (N6) · thân 200 không mảng · 121 không mã ⇒ cũng ngắt sau ≥2′.
- **P1b** · lỗi 2 vòng (t0 · t0+6 s) rồi lành ⇒ KHÔNG ngắt (CHO-QUA); tin vào hàng và được xử.
- **P1c** (XEN) · worker T lỗi kênh → `napTuPoll` danh sách lỗi → worker T lỗi lại ⇒ KHÔNG ngắt, đếm vẫn 1.
- **P1d** (R2-N1) · ngắt vì danh sách → qua 30′ → 1 vòng lỗi rồi lành ⇒ không ngắt lại.
- **P1f** (R2-N1, ngắt từ đường khác) · danh sách lỗi 1 vòng → GL4 ngắt vì 2 khách đọc lỗi ở worker → vòng trong lúc ngắt → qua 30′ → 1 lỗi ⇒
  không ngắt.
- **P1h** · page ngắt vì GỬI (vẫn được nạp):
  - lỗi trong lúc ngắt không nối chuỗi;
  - mở xong 60 s lỗi ⇒ chưa ngắt;
  - đủ 2′ lỗi sau khi mở ⇒ ngắt.
- **P1i** (/code-review #2) · lỗi (t0) → page đổi sang webhook một quãng → đổi lại, 10′ sau 1 lỗi ⇒ không ngắt; đủ 2′ ⇒ ngắt.
- **P1g** · `ngatPage` trên page đang ngắt ⇒ null, không ghi đè, không nhật ký.
- **P1e** (R2-N2) · worker T của X lỗi kênh → bộ nạp đọc lại X lỗi kênh ⇒ KHÔNG ngắt (đếm 1, khoá -hoi_thoai.id); khách Y lỗi kênh ⇒ NGẮT.
- **P2** · `/conversations` OK + `/messages` 502 ở X, Y:
  - ngắt `doc` ngay trong vòng nạp; Z không bị đọc (dừng nạp page);
  - 0 việc;
  - 3 chu kỳ ngắt-mở-lỗi ⇒ vẫn 0 việc, không ai rời AI.
- **P2b** (XEN) · worker A lỗi kênh → `napTuPoll` (danh sách OK, 0 lượt đọc lịch sử) → worker B lỗi kênh ⇒ NGẮT.
- **P2c** · trong một vòng nạp: X lỗi kênh → Y đọc OK → Z lỗi kênh ⇒ không ngắt (đếm 1); Y vào hàng.
- **P3** · X «Thiếu mã khách hàng», Y OK:
  - lượt 1 (t0) và 2 (t0+30 s) chưa giao; t0+10 s đang lùi, 0 GET;
  - lượt 3 (t0+90 s) ⇒ SALE/HANDOFF `doc_lich_su_loi_ben`, ĐÚNG 1 việc. Việc nói «90 s» + câu lỗi + mốc thô `2026-10-07T01:00:00`;
  - 1 nhật ký; page không ngắt, không đếm;
  - t0+400 s: 0 GET X; «trả AI» THÀNH.
- **P3b** · X lỗi dữ liệu lượt 1–2 → page ngắt bởi Y, Z lỗi kênh → vòng trong lúc ngắt 0 fetch → qua 30′ → X lỗi ⇒ giao ở lượt 3; việc nói
  «32′» (tính từ lần lỗi đầu).
- **P3c** · X lỗi 2 lượt → page nói cuối (X rời đi) → khách nhắn lại:
  - lỗi đầu KHÔNG giao;
  - lượt 3 của sự cố mới giao; việc nói «6′» + mốc thô mới.
- **P4** · X do SALE giữ:
  - lượt 3 không việc, hội thoại giữ nguyên, không nhật ký giao; mốc ghi nên không đọc X nữa;
  - (/code-review #5) sale trả AI + khách nhắn mới ⇒ lỗi đầu không giao, lượt 3 mới giao.

`test/gl3c-webhook-legacy.test.mjs`:
- **P5a** · webhook, danh sách 502 ở bước tra mapping:
  - lượt 1 lùi 15 s, lượt 2 lùi 30 s. `ly_do` là «LoiDocLichSu: Pancake không trả danh sách hội thoại … HTTP 502». Đếm GL4 = 1;
  - lượt 3 ⇒ `doc_loi_ban_giao`, tin `xong`, SALE/HANDOFF `doc_lich_su_loi` (không phải `loi_xu_ly_can_doi_chieu`), 1 việc;
  - «trả AI» THÀNH.
- **P5b** · đọc được danh sách mà không có mapping ⇒ `LoiChoMappingPancake` (lùi 5 s).
- **P6** · gọi `pkGetConversations` không `soLoi`:
  - OK ⇒ mảng; 502 ⇒ `[]`, 1 lượt; lỗi mạng ⇒ `[]`, 2 lượt;
  - có `soLoi` thì điền đúng `ok/loi/capKenh`;
  - cửa với hàm tiêm trả `[]` (không điền soLoi) ⇒ đọc được;
  - cửa thật gặp lỗi ⇒ NÉM `LoiDocHoiThoai` có câu + `capKenh`.

**Nhánh KHÔNG ca nào chạm (khai):**
- `giaoSaleLoiBen` ROLLBACK, tức SQL lỗi thì trả null và lùi tiếp;
- `khoaDocTheoHoiThoai` lùi về khoá theo tin khi tra hỏng hoặc chưa có dòng;
- `roiDi` ở nhánh THẺ CHẶN (chỉ nhánh page nói cuối có ca);
- `ngatPage` trên CSDL chưa có 034;
- `legacy.js#taoDonTuLegacy` trọn đường: P6 gọi đúng lời gọi một tham số mà legacy dùng, không dựng hàng chờ đơn.

## Ca ĐỎ trên base → XANH
Base = bản sao `git archive` HEAD `5aa2dc3` (mã = `ff3526a` + GP1) cộng hai tệp ca: **18/20 đỏ**, mỗi ca đỏ đúng lý do. Ví dụ:
- P1: log không có «lỗi danh sách»;
- P1c: `napTuPoll` không báo `dsLoi`;
- P1e: khách KHÁC lỗi kênh ở nạp mà không ngắt;
- P2: Z vẫn bị đọc;
- P2c: đếm 0 vì nạp không đếm;
- P5a: `ly_do` `LoiChoMappingPancake`;
- P1g: chưa có `ngatPage`.

Hai ca XANH sẵn trên base, cố ý, vì là lưới hồi quy:
- **P2b** canh đảo-vá ③c «danh sách OK gọi ghiDocTot» (base không gọi);
- **P5b** canh đường cũ `LoiChoMappingPancake`.

Sau sửa: **20/20 xanh**, cả ở `TZ=UTC PGTZ=UTC` lẫn `TZ=America/Los_Angeles PGTZ=Asia/Tokyo` (①c). Chạy lặp 3 lượt liền cho 19/19 ×3 (trước khi
thêm P1i), không chập chờn.

## Đã làm (commit `aedee92`)
- **pancake.js** — `pkGetConversations(pageId, soLoi = null)`:
  - giá trị trả giữ nguyên;
  - nếu có `soLoi` thì điền `{ ok, loi, capKenh }`. `ok` ⇔ có mảng `conversations`;
  - câu lỗi đi `lyDoDocLoi(loiThatNhat|j)` với «danh sách tin» đổi thành «danh sách hội thoại»; `capKenh` theo `laLoiKenhDoc`;
  - gọi lại các hàm có sẵn, không chép dòng neo nào (R2-N3). Không export mới; `fetch(`=1, `goiPancake(`=6.
- **messenger/loi.js + index.js** — `LoiDocHoiThoai(thongDiep, { capKenh })`. `docHoiThoai` truyền `soLoi` và chỉ ném khi `soLoi.ok === false`.
  Hợp đồng `docs/v3/ban-giao/cua-messenger-v1.md` đổi cùng commit.
- **ngat-page.js** — `ngatPage(pool, { teamId, pageId, kieu, lyDo })`:
  - UPDATE `… WHERE ngat_ly_do = '' AND team_id = $1 AND page_id = $2` (thứ tự khác neo ⑤n);
  - hạn `now() + 30′` theo đồng hồ CSDL; lý do qua `boUrl` + «(đọc)»;
  - 1 nhật ký `page_ngat_kenh` (`sau.nguon = danh_sach_hoi_thoai`); ghi bộ nhớ chung ngay;
  - nuốt lỗi + cảnh báo một lần. Đầu tệp và chú thích `ghiLoiKenh` sửa theo luật khoá mới.
- **nap.js**:
  - `T_NGAT_DS_MS = 2′` (người quyết) · `LUOT_LOI_GIAO_SALE = 3` (tổng);
  - danh sách lỗi ⇒ `loiDanhSach`:
    - page đang ngắt (bộ nhớ chung) thì không nối chuỗi;
    - nối mốc `dsLoiTu` (đồng hồ `dongHo`);
    - ≥ 2′ thì xoá mốc rồi `ngatPage`;
    - trả `dsLoi: 1` + `lyDo`;
  - danh sách OK ⇒ xoá mốc, KHÔNG `ghiDocTot`;
  - `quenMoc` xoá cả `dsLoiTu`. `giuLoiDanhSach(ds)` chỉ giữ mốc cho page vòng NÀY thấy lỗi;
  - lịch sử lỗi:
    - giữ nguyên dòng neo `:519` (`lan`); thêm `luot` (chỉ lỗi dữ liệu) và `tu` (lần lỗi dữ liệu đầu);
    - lỗi kênh ⇒ `ghiLoiKenh(pool, khoá -hoi_thoai.id)`; nếu vừa ngắt thì `break` (dừng nạp page);
    - lượt 3 lỗi dữ liệu ⇒ `giaoSaleLoiBen`: client riêng, MỘT giao dịch, UPDATE có điều kiện AI + GREET/QUALIFY/SELLING + `bot_ai_bat` +
      `nguon_tin <> 'webhook'`, `chenViec` (nạp động `./worker.js`), nhật ký `hoi_thoai_doc_loi_ben_ban_giao`. Sau đó ghi mốc, xoá `luiDocTin`;
    - SQL lỗi thì lùi như thường, không ghi mốc;
  - đọc lịch sử OK ⇒ `ghiDocTot`. Rời đi (thẻ chặn / page nói cuối) ⇒ `roiDi` đặt lại `luot/tu` nhưng giữ `lan/toi` (neo ⑤o · ca N7).
- **chay-worker.js** — `ket.nap.dsLoi` + `dsLoiCuoi`, một cụm «N page lỗi danh sách (…)» trong `inLuot`. Cuối mỗi vòng nạp gọi
  `giuLoiDanhSach(page thấy lỗi)`; vòng xử thì không. Dòng neo ⑤j/⑤z/gl2 ⑤k giữ nguyên.
- **worker.js**:
  - `export chenViec`;
  - lỗi ĐỌC đếm GL4 theo khoá `-hoi_thoai.id` (`khoaDocTheoHoiThoai`); lỗi GỬI vẫn theo tin. Câu tra hội thoại dùng chung với `viecGuiLoi` qua
    `idHoiThoaiCuaTin` (/code-review #7);
  - khối tra mapping webhook bắt `LoiDocHoiThoai` rồi ném lại `LoiDocLichSu(…, { capKenh })`. Dòng neo `:333` (⑤q) KHÔNG đổi.
- **kho-suc-khoe.js** — CHỈ đổi câu: chú thích `:519-521` nói đúng phần đã phủ / chưa phủ; câu đèn xanh `:536`. Phép ②c của cổng canh: 0 dòng
  đổi ngoài chú thích và câu đó.

## Quyết định (luật 11 · 13 — ghi tại chỗ quyết)
1. **R2-N2 — chọn phương án ƯU TIÊN: lỗi ĐỌC đếm theo HỘI THOẠI ở CẢ worker lẫn bộ nạp** (khoá `-hoi_thoai.id`, lỗi GỬI vẫn theo tin).
   - **Vì sao:** nó trả đúng câu hỏi của review. Một khách đang nhắn dở mà Pancake chập (worker đọc tin T lỗi, bộ nạp đọc lại khách đó lỗi) chỉ
     là MỘT lỗi; P1e đo đúng cảnh này. Cách thay thế «giữ hai khoá» thì để nguyên lỗ đó.
   - **Có đụng neo gl4.sh không?** Không. `ghiKenhSauLuot` không phải neo; ⑤c ⑤o ⑤q ⑤a ⑤g vẫn đỏ đúng (gl4.sh 44/44).
   - **Ca GL4 có đổi không?** Không. Theo luật FIFO, «theo tin» ở worker vốn đã là «theo khách»; P1c (cùng tin hai lượt) và P1/P1b/P3b/P8 (khách
     khác nhau) giữ nguyên kết quả.
   - **Giá phải trả:**
     - một câu SELECT khi worker gặp lỗi đọc;
     - khách X lỗi lần thứ hai (tin khác) sau khi tin trước đã giao sale mà không có lỗi của khách khác chen giữa thì không đếm thêm;
     - `loi_doc_tin_cuoi` nay chứa số âm (id hội thoại). Cột vẫn tên «tin_cuoi» — không đổi lược đồ.
   - **Kèm theo:** bộ nạp đọc lịch sử OK ⇒ `ghiDocTot` (P2c canh).
2. **R2-N1 — làm rộng hơn chữ phiếu.** Có ba lớp:
   - (a) `ngatPage` vì danh sách ⇒ xoá mốc ngay (P1d);
   - (b) page ĐANG ngắt (đường nào cũng vậy, kể cả GỬI khi page vẫn được nạp) ⇒ lỗi không nối chuỗi (P1h);
   - (c) cuối mỗi vòng nạp chỉ giữ mốc của page vòng đó THẤY lỗi danh sách (P1f · P1i).

   Lớp (c) thay cho bản đầu `giuLoiDanhSach(pages)` (giữ mọi page được nạp). /code-review #2 chỉ ra mốc còn sót sau một quãng không quan sát:
   nguồn đóng, page đổi sang webhook rồi đổi lại, `napTuPoll` ném lỗi khác.
   - **Không chọn «cắt chuỗi khi khoảng cách > N phút»:** ở 50 page + Pancake quá hạn, một vòng có thể dài 15 s × 2 token × 50 = 25′. Ngưỡng 5′
     sẽ làm chuỗi không bao giờ tới 2′ đúng lúc Pancake sập.
   - **Giá phải trả:** «liên tục» đo bằng vòng nạp liên tiếp có thấy lỗi, không bằng đồng hồ.
3. **Page vừa ngắt vì đọc trong vòng nạp ⇒ `break`** (dừng nạp page ở vòng đó). Phiếu không ghi điều này. Tôi theo luật GL4 «ngắt đọc ⇒ bỏ nạp»:
   đọc tiếp tốn 15 s × số token cho mỗi hội thoại trên một kênh đã biết hỏng. Các hội thoại chưa đọc không bị ghi mốc, nên sau khi mở sẽ được đọc
   (P2 canh: Z = 0 GET).
4. **② 4 «UPDATE 0 dòng ⇒ chỉ ghi mốc» — tôi hiểu «chỉ» là không việc, không nhật ký; đếm `luot` vẫn xoá như nhánh giao** (/code-review #5).
   Nếu giữ `luot ≥ 3` thì khi sale trả AI rồi khách nhắn mới, lỗi ĐẦU TIÊN đã giao lại ngay. P4 canh, đảo-vá ③w. Đây là lệch chữ phiếu — xem
   «Lệch phiếu».
5. Danh sách lỗi khi page đang ngắt GỬI vẫn tính vào cụm log «N page lỗi danh sách» của vòng, chỉ không nối chuỗi.
6. Câu việc `ly_do_day`:
   - mẫu: «Pancake không trả lịch sử hội thoại này: N lượt lỗi trong <90 s | 32′> (lỗi đầu HH:MM giờ VN): <câu lỗi> — bot CHƯA trả lời, CHƯA gửi
     gì · khách nhắn lần cuối (mốc Pancake, chưa quy múi giờ): <mốc thô>»;
   - `gioVN` cố định UTC+7, không phụ thuộc múi giờ của máy;
   - mốc thô KHÔNG parse (lệch múi giờ, `nap.js:220`).
7. `giaoSaleLoiBen` KHÔNG gộp với `worker.js#banGiaoDocLoi` (/code-review #6):
   - gộp thì phải đổi câu SQL chứa neo gl3b ⑤l và ⑤q;
   - `ly_do_cuoi`, câu việc và nhật ký khác nhau (theo phiếu);
   - đã thêm điều kiện `nguon_tin <> 'webhook'` cho ngang điều kiện nguồn của bản worker;
   - ghi nợ N-GL3C-BAN-GIAO-HAI-BAN.

## Cổng `ops/bin/nghiem-thu/gl3c.sh` — lượt cuối (sau /code-review · 16:49:35 → 16:53:40, ~4′)
```
── môi trường: máy dev · hộp cát Postgres trên 127.0.0.1:5432 (aicloser_v3_test_gl3c_*_p<pid>, tự dựng tự dọn; nhãn aicloser_v3_nt_gl3c_p75193) · cây …/AI Chatbot · e0788dd
✅ ⓪.env-PANCAKE_READONLY=1 đọc được: '1'
✅ ①a nạp cửa thật + xen pass=17 fail=0 · xanh: P1 P1b P1c P1d P1e P1f P1g P1h P1i P1n P2 P2b P2c P3 P3b P3c P4
✅ ①b webhook + legacy pass=3 fail=0 · xanh: P5a P5b P6
✅ ①c TZ=UTC PGTZ=UTC pass=20 fail=0 · ✅ ①c TZ=America/Los_Angeles PGTZ=Asia/Tokyo pass=20 fail=0
✅ ②a pancake.js không thêm export · ✅ ②b fetch(=1 goiPancake(=6 · ✅ ②c kho-suc-khoe CHỈ đổi câu (0 dòng khác) · ✅ ②d gl4.sh · gl3b.sh không đổi
✅ ③a … ③x (26 đảo-vá, bảng dưới) · ✅ ③0 bản sao nguyên vẹn pass=20 fail=0
✅ ④gl4.sh rc=0 · ĐỎ 0 / XANH 44        (BO_CONG_CU=1: ①–⑤ của gl4; hai cổng lồng gl3b · gl3 chạy riêng ngay dưới)
✅ ④gl3b.sh rc=0 · ĐỎ 0 / XANH 49 · ✅ ④b gl3b đảo-vá ⑤d·⑤o·⑤b còn đỏ đúng ✅ 3/3
✅ ④gl3.sh rc=0 · ĐỎ 0 / XANH 25
✅ ④ l1-m2-cua 17/0 · l2-m1-hang-doi 28/0 · l2-m1-nhac-truong 12/0 · va-p7-chay-worker 7/0 · phase1-chat-flow 12/0 · gl3b-worker-doc-loi 11/0 ·
   gl3b-nap-doc-loi 7/0 · gl3b-pancake-van-hanh 5/0 · gl3b-vong2 4/0 · gl4-ngat-page 23/0 · gl4-chua-034 2/0 · suc-khoe 25/0 (rc=0 từng dòng)
⏸ ⑤npm-test HOÃN (chạy riêng, dưới)
== ĐỎ 0 / XANH 52 · rc=0
```
Thêm, ngoài ④8: `gl2.sh` (gl4.sh đầy đủ vẫn gọi nó; nó có neo trong `chay-worker.js` và `kho-suc-khoe.js`) chạy riêng sau bản vá review cho
**rc=0 · ĐỎ 0 / XANH 52**. Hai lượt cổng đầy đủ trước review (15:46 và 16:33, sau khi tổng dọn `.env`) đều rc=0, 50/50.

## Đảo-vá (bản sao tạm, mỗi đột biến một tiến trình node mới) — 26/26 đỏ đúng ca khai
| | đột biến | ca phải đỏ ⇒ đỏ |
|---|---|---|
| ③a | cửa nuốt lỗi (`docHoiThoai` không ném) | P1 P5a |
| ③a2 | cửa nuốt lỗi (`pkGetConversations` luôn ok) | P1 P6 |
| ③b | đếm mỗi vòng (lỗi danh sách vào bộ đếm theo khoá, khoá mỗi vòng một số) | P1b P1c |
| ③c | danh sách OK gọi `ghiDocTot` | P2b |
| ③d | không đếm lỗi kênh ở nạp | P2 |
| ③e | giao cả lỗi kênh (`luot` +1 mọi lỗi, bỏ vế `duLieu`) | P2 |
| ③f | bỏ giao lỗi bền | P3 |
| ③g | giao ở lượt 1 | P3 (vế chưa giao) |
| ③h | đặt lại `luot` theo `lan` (sau quãng ngắt) | P3b |
| ③i | giao khi sale giữ (bỏ điều kiện AI + trạng thái) | P4 |
| ③j | webhook về `banGiaoLoi` (không ném lại) | P5a |
| ③k | không xoá mốc khi ngắt (R2-N1) | P1d |
| ③l | `giuLoiDanhSach` không xoá gì | P1f P1i |
| ③l2 | nối chuỗi cả khi page đang ngắt gửi | P1h |
| ③m | worker đếm đọc theo TIN (một khách hai khoá) | P1e |
| ③n | nạp đọc lịch sử OK không `ghiDocTot` | P2c |
| ③o | `ngatPage` không ghi bộ nhớ chung | P1 (W bị rút trong lượt ngắt) |
| ③p | ngắt ngay lỗi đầu | P1 P1b |
| ③q | biên `>=` → `>` (2′) | P1 |
| ③r | biên lượt giao `>=` → `>` | P3 |
| ③s | N6: chỉ lỗi cấp kênh mới là lỗi danh sách | P1n |
| ③t | `ngatPage` bỏ «chưa ngắt» | P1g |
| ③v | rời đi không đặt lại đếm | P3c |
| ③w | giao 0 dòng giữ đếm cũ (/code-review #5) | P4 |
| ③x | giữ mốc cả page nạp mà không tới bước đọc danh sách (/code-review #2) | P1i |
| ③u | log vòng không in page lỗi danh sách | P1b |

Thước cũng phải qua cổng. Lượt đầu, ③k và ③n báo «đỏ: không» vì chuỗi gốc chỉ là PHẦN ĐẦU của dòng có chú thích nối dài. Thay chuỗi đó bằng `''`
làm phần còn lại của dòng thành mã ⇒ lỗi cú pháp ⇒ cả tệp ca chết. Cách đọc của cổng («ca KHAI phải nằm trong tập đỏ») bắt được, nên không xanh
giả. Đã sửa đột biến cho giữ chú thích.

**Đột biến nào KHÔNG đỏ (sống — không ca canh):**
- bỏ `p.bot_ai_bat = true` hoặc `p.nguon_tin <> 'webhook'` trong `giaoSaleLoiBen`: bộ nạp chỉ nạp page bật bot và page poll, nên hai vế này
  chỉ có tác dụng khi có tranh chấp;
- nhánh ROLLBACK của `giaoSaleLoiBen`;
- fallback của `khoaDocTheoHoiThoai`;
- bỏ lời gọi `roiDi` riêng ở nhánh thẻ chặn;
- câu `ket.lyDo` khi page đang ngắt;
- dòng `luiDocTin.delete` ở nhánh đọc OK (P3c canh gián tiếp qua `roiDi`, không canh dòng này).

## npm test (luật 6 — lượt chạy khi chỉ có GP1 song song)
`npm test` trần TREO.
- **Đo:** lượt 15:24 có tiến trình con `v3/test/b/ll15a-hrm-man.test.mjs` đứng 12′+ ở 0% CPU, tôi giết lúc 15:37. Chạy riêng tệp đó cho 6/6
  trong 3,5 s, cả có lẫn không `--test-force-exit`.
- **Nên:** đo bằng ĐÚNG lệnh `npm test -- --test-force-exit` (khuôn các cổng). Cổng ⑤ của gl3c.sh cũng dùng lệnh này.

| | tests | pass | fail | skip |
| --- | --- | --- | --- | --- |
| base bản sao (`git archive` HEAD, mã = base + GP1) | 2674 | 2651 | 1 | 22 |
| sau `aedee92` (cây chung) | 2694 | 2689 | 1 | 4 |

- Chênh +20 ca, đúng bằng số ca hai tệp mới.
- Skip 22 → 4 là do bản sao `git archive` không có `.git`: 18 ca cần git chạy được trong cây chung (TT1b gặp y hệt).
- **1 đỏ có sẵn ở CẢ HAI bên:** `test/bh1-gia-va-cua-chot.test.js` G5b.
  - Chạy riêng: 27/1. Thêm `HUMAN_TAKEOVER=0` vào env tiến trình: 28/0.
  - `grep -c '^HUMAN_TAKEOVER' .env` = 0 sau khi tổng dọn `.env` (`d9ba7b9`).
  - `src/conv-owner.js:27` đọc `HUMAN_TAKEOVER !== '0'`, tức vắng biến là BẬT.
  - Ca mượn cấu hình vận hành (viet-thuoc luật 2). Không thuộc GL3c; đã báo tổng ngay khi đo.

## /code-review (high) trên phần thay đổi — 8 phát hiện, kiểm chứng từng cái
| # | phát hiện | xử lý |
|---|---|---|
| 1 | webhook: lỗi danh sách ném lại `LoiDocLichSu` ⇒ 2 khách trong một lần chập ⇒ ngắt 30′, không qua ngưỡng 2′ | BÁC. Phiếu ② 5 ghi rõ «đếm GL4 theo `capKenh` như cũ». Prod 0 page webhook. Ghi nợ N-GL3C-WEBHOOK-DS-DEM-GL4 |
| 2 | mốc `dsLoiTu` sót sau quãng nguồn đóng / đổi webhook / `napTuPoll` ném | VÁ (quyết định 2): cuối vòng chỉ giữ page vòng đó thấy lỗi, chạy cả khi nguồn đóng · ca P1i · ③l ③x |
| 3 | bộ nạp đếm lỗi kênh theo hội thoại ⇒ chập vài giây trúng 2 hội thoại cùng vòng là ngắt 30′ | BÁC. Đúng ② 3 và ④2 («2 hội thoại ⇒ ngắt»), cùng luật GL4 ở worker. Ghi nợ N-GL3C-NAP-HAI-HOI-THOAI-MOT-CHAP để người quyết xem |
| 4 | tài liệu khai «`capKenh` chỉ để chọn câu» trong khi worker webhook dùng nó để đếm | VÁ CÂU: sửa câu ở `cua-messenger-v1.md`, `pancake.js`, `loi.js` cho khớp. Hành vi theo ② 5 |
| 5 | giao 0 dòng (sale giữ) giữ `luot ≥ 3` ⇒ khi sale trả AI, lỗi đầu giao lại ngay | VÁ (quyết định 4): xoá đếm cả khi 0 dòng · P4 thêm vế · ③w |
| 6 | `giaoSaleLoiBen` chép `banGiaoDocLoi`, thiếu điều kiện nguồn | VÁ MỘT PHẦN: thêm `nguon_tin <> 'webhook'`. Gộp hàm thì đụng neo gl3b ⑤l/⑤q ⇒ nợ N-GL3C-BAN-GIAO-HAI-BAN |
| 7 | `khoaDocTheoHoiThoai` chép câu tra của `viecGuiLoi` | VÁ: tách `idHoiThoaiCuaTin` dùng chung. Các ca gửi lỗi P2* của gl4 vẫn 23/23 |
| 8 | `ghiDocTot` mỗi lượt đọc OK ⇒ N câu UPDATE mỗi vòng | BÁC. Thứ tự là ngữ nghĩa: X lỗi · Y OK · Z lỗi phải ra đếm 1 (P2c, đúng luật worker). Gọi một lần cuối vòng hoặc chỉ lần đầu sẽ sai thứ tự. Câu UPDATE có `WHERE … <> 0` nên 0 dòng khi sạch, và lượt đọc mỗi vòng đã bị cửa mốc cắt (đo 17/09: 8/60) |

Bản vá review cũng là code mới (bẫy 26): đảo-vá ③w và ③x đo đúng các chỗ vừa vá; cổng đầy đủ chạy lại sau vá cho 52/52.

## Lệch phiếu — nói thẳng
1. **② 4 «UPDATE 0 dòng ⇒ chỉ ghi mốc»:** tôi ghi mốc VÀ xoá đếm `luiDocTin` (quyết định 4 · /code-review #5). Nếu tổng đọc «chỉ» theo nghĩa
   hẹp thì cần đổi lại một dòng (đảo-vá ③w là đúng bản đó).
2. **② 2 / R2-N1:** ngoài «page vào ngắt ⇒ xoá mốc», tôi còn (b) không nối chuỗi khi page đang ngắt và (c) giữ mốc chỉ cho page vòng đó thấy
   lỗi. Rộng hơn chữ phiếu, cùng ý.
3. Phiếu không có `break` sau ngắt ở bộ nạp; tôi thêm (quyết định 3).
4. `giaoSaleLoiBen` có thêm điều kiện `nguon_tin <> 'webhook'` mà ② 4 không kể.
5. ④8: gl4.sh chạy với `BO_CONG_CU=1`, vì ⑥ của nó lồng gl3b, gl3, gl2 và các bộ ca mà ④8 đã chạy riêng (rc tách dòng). gl2.sh chạy riêng
   ngoài cổng.
6. ⑤ / `npm test` chạy bằng `-- --test-force-exit` (lý do ở trên).
7. Ca thêm ngoài ④: P1n · P1f · P1h · P1i · P1g · P1e · P2c · P3c. Thêm, không bớt.
8. `_chan1.sh gl3c` ④ (pathspec ⊆ ③) sẽ liệt kê tệp của GP1 (`cb3c953`) và phiếu RP1 vì base phiếu là `ff3526a`. Đó không phải tệp GL3c.

## Nợ (đã ghi §9 sổ)
- **N-GL3C-WEBHOOK-DS-DEM-GL4** (/code-review #1 · #4) ở page webhook:
  - lỗi danh sách cấp kênh đếm GL4 theo khoá hội thoại ⇒ 2 khách trong một lần chập ⇒ ngắt 30′ (poll thì cần 2′ liên tục);
  - lỗi danh sách `capKenh:false` ⇒ giao sale từng khách, không đèn.
  Prod 0 page webhook.
- **N-GL3C-NAP-HAI-HOI-THOAI-MOT-CHAP** (/code-review #3): bộ nạp đọc lịch sử tuần tự cách nhau vài ms, nên một lần Pancake chập vài giây trúng 2
  hội thoại là ngắt 30′. Luật «2 thứ khác nhau» của GL4 ở worker cách nhau theo nhịp khách tới. Người quyết xem có cần ngưỡng thời gian cho lỗi
  kênh ở bộ nạp không.
- **N-GL3C-BAN-GIAO-HAI-BAN** (/code-review #6): `nap.js#giaoSaleLoiBen` và `worker.js#banGiaoDocLoi` là hai bản câu bàn giao; gộp thì đụng neo
  gl3b ⑤l/⑤q.
- **N-GL3C-DOT-BIEN-SONG:** sáu đột biến sống kể ở mục đảo-vá.
- **N-GL3C-NPM-TEST-TREO:** `npm test` trần treo ở `ll15a-hrm-man` (tiến trình con không thoát).
- **N-THUOC-HUMAN-TAKEOVER:** bh1 G5b mượn `HUMAN_TAKEOVER` từ `.env`, đỏ sau `d9ba7b9`. Tổng soát xem prod có bỏ `HUMAN_TAKEOVER=0` không.
- **N-GL4-DOWN-GIU-PAGE** (cập nhật): `ngatPage` cũng ghi bộ nhớ chung nên mang cùng lỗ khi `down` 034. Chưa vá vì ngoài ②.
- Từ phiếu ⑥ (giữ nguyên):
  - G1 page ngắt lặp mãi ⇒ không khách nào được giao (GL6 cảnh báo + người quyết);
  - G2 webhook «đọc được mà không mapping duy nhất» vẫn `banGiaoLoi` không việc;
  - G3 lỗi dữ liệu toàn hệ ⇒ mọi khách ra việc, không tín hiệu cấp page;
  - G4 tin tới sau khi bộ nạp đã giao chặn «trả AI» (N-GL3B-TRA-AI-CHAN-GUARD);
  - «Thiếu mã khách hàng» đi cùng `custId` rỗng thì giao ngay ở lượt 1 (đo khi mở van);
  - `luiDocTin` và `dsLoiTu` ở RAM nên restart là đếm lại.

---

# VÒNG 2 — đối kháng refute-gl3c F1–F4 (08/10/2026 · thợ GL3c vòng 2)

**Môi trường đo:** máy dev (Node v24, macOS), cùng khung như vòng 1: `fetch` GIẢ trong mọi ca (host khác `pages.fm` thì ném), 2 token giả, hộp cát
Postgres 127.0.0.1:5432 (`aicloser_v3_test_gl3c_{nap,wh,v2}_p<pid>`, tự dựng/dọn). Không lượt mạng thật, không đo prod, không đo `aicloser_v3`.
`.env` giữ nguyên (`PANCAKE_READONLY=1`, `HUMAN_TAKEOVER=0`). **Base vòng 2 = `27dd9d0`.** Giữa lượt, tổng thêm 3 commit tài liệu (`9f2755c` ·
`1ff44c6` · `83f5f6f`: phiếu RP1 + sổ), không đụng tệp của tôi. Tôi là thợ duy nhất trong cây chung. Pathspec vòng 2 + `docs/v3/ban-giao/cua-messenger-v1.md`
(tổng gật 08/10, CHỈ các câu :67-71 · :88-90).
**Commit mã: `0c65380`** · verdict `scratchpad/refute-gl3c.verdict.yaml`.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -nE "N-GL3C-NAP-KENH-MOT-HOI-THOAI|N-GL3C-HOI-THOAI-HONG-NAP-DEM|N-GL3C-JSON5XX-GIAO-HANG-LOAT|N-GL4-5XX-JSON|N-GL3B-NAP-LOI-BEN|N-GL3C-NAP-HAI-HOI-THOAI-MOT-CHAP"
1291:  - **N-GL3B-NAP-LOI-BEN** (/code-review #3) page POLL: đọc lịch sử lỗi BỀN (121 không ghế gói · «Thiếu mã khách hàng» · Pancake sập lâu) ⇒ bộ nạp lùi
1384:  - **N-GL4-5XX-JSON** HTTP 5xx mà thân là JSON không được tính lỗi kênh khi ĐỌC (`goiPancake` không đưa mã HTTP ra) — chỉ 502/504 HTML (thân hỏng).
1442:- 07/10 · GL3c (thợ) — trả N-GL3B-NAP-LOI-BEN · N-GL3B-CONV-NUOT-LOI · N-GL4-NAP-KHONG-DEM · N-GL3B-WEBHOOK-MAPPING (phần danh sách đọc lỗi; …
1447:  - **N-GL3C-NAP-HAI-HOI-THOAI-MOT-CHAP** (/code-review #3, bác theo ② 3 · ④2) bộ nạp đọc lịch sử tuần tự (cách nhau ms) ⇒ …
```
Ba neo đề nghị của verdict (N-GL3C-NAP-KENH-MOT-HOI-THOAI · N-GL3C-HOI-THOAI-HONG-NAP-DEM · N-GL3C-JSON5XX-GIAO-HANG-LOAT) chưa có trong sổ. Vòng 2 vá
nên không ghi chúng. Quan hệ: **trả đủ** N-GL3B-NAP-LOI-BEN (vòng 1 chỉ trả phần dữ liệu, phần kênh trả ở F1) · **trả** N-GL4-5XX-JSON (F3).

## Bước 3 — đo lại nguyên liệu đề bài (ở base vòng 2)
- `nap.js:659-662` là `if (!duLieu && ht?.id != null) { ghiLoiKenh … }`, chạy ở MỌI lượt lỗi kênh. `nap.js:637-641` là `duLieu = e.capKenh !== true`. Cả hai đúng.
- `pancake.js:395-398` `laLoiKenhDoc` tự khai giới hạn «HTTP 5xx mà thân là JSON». `goiPancake` (`:182-192`) trả JSON bất kể `res.status` ⇒ muốn xét mã HTTP thì
  phải mang mã ra từ đây (không thêm lời gọi `goiPancake(`, giữ neo gl3/gl4/gl3b «6 lần»).
- `chay-worker.js:156` `giuLoiDanhSach` nằm ngoài mọi `finally`. Các điểm ném trước nó: `:98` trangThaiTran · `:99` dsChoPhep · `:115` dsPageDeNap. Đúng.
- `kho-suc-khoe.js:522` khai «lỗi của MỘT hội thoại (giao sale ở lượt 3…)», sai với lỗi kênh. Đúng.
- **RF1d nguyên văn** (lỗi ĐẦU của X ở bộ nạp, NGAY sau đó Z chập một lượt ở worker, giữa hai lỗi không có lượt đọc OK nào) là luật GL4 «2 khoá khác nhau liền nhau». Bản vá
  `lan === 1` không đổi được ca này, và cũng không được đổi: P2 · P2b canh đúng luật đó. Đã báo tổng, tổng gật 08/10 «ngắt là ĐÚNG». Phần hồi quy F2 tôi sửa là biến
  thể **«giữ thường trực»**: X hỏng bền tự nạp lại đếm sau mỗi `ghiDocTot` của khách khác. Ca riêng V2a canh biến thể này, ca V2b canh luật RF1d.
- Neo phải giữ nguyên (đếm lại SAU mã mới, mỗi chuỗi đúng 1 lần): gl3b ⑤d · ⑤e · ⑤n · ⑤o (nap.js) · gl4 ⑤j · ⑤z (chay-worker.js) · gl4 ⑤r · ⑤s · gl3b ⑤m ⑤v ⑤w ⑤x* ·
  gl3 ④* (pancake.js) · `fetch(` = 1 · `goiPancake(` = 6 · không export mới. Cả ba cổng lồng xanh (dưới).

## Danh sách ca (viết TRƯỚC mã — `test/gl3c-vong2.test.mjs`)
| ca | nhóm | kịch bản |
|---|---|---|
| V1a | HÀNH VI trọn đường · BIÊN | MỘT khách X, /messages 502 bền, page không ngắt: lượt 1–4 (0·30·90·210 s) chưa giao, GL4 = 1; lượt 5 (450 s) ⇒ SALE/HANDOFF, đúng 1 việc «lỗi kênh ở riêng hội thoại này · 5 lượt · 8′ · mốc thô», không đọc X nữa, «trả AI» THÀNH |
| V1b | CHẶN | page đang ngắt GỬI (vẫn nạp): 6 lượt không tích lượt giao, GL4 đứng yên; mở thật ⇒ lượt đầu sau mở đếm GL4 (khoá -X); lượt 5 SAU MỞ mới giao (20′) |
| V1c | BIÊN (khác lỗi dữ liệu P3b) | X lượt 1–4 → page ngắt ĐỌC (Z cùng vòng) → mở thật ⇒ sự cố mới: GL4 lại 1, lượt 1–4 mới không giao, lượt 5 mới giao (8′) |
| V1d | BIÊN | X lượt 1–4 → page nói cuối (rời đi) → khách nhắn lại ⇒ đếm kênh lại từ 1 (như P3c); lịch lùi giữ (5′/lượt) ⇒ giao ở lượt 5 mới (20′) |
| V1e | CHẶN (không giao hàng loạt) | X, Y lỗi kênh suốt quãng ngắt gửi → mở ⇒ vòng kế page NGẮT ĐỌC, 0 việc |
| V2a | CHẶN (hồi quy F2) | X lượt 1 đếm 1 → W đọc OK (0) → X lượt 2 KHÔNG nạp lại → Z chập 1 lượt ⇒ không ngắt (đếm 1); Z đọc lại OK ⇒ xong |
| V2b | CHO-QUA luật GL4 (RF1d nguyên văn) | X lỗi đầu + Z chập ngay, không đọc OK chen giữa ⇒ NGẮT |
| V2c | BIÊN (/code-review #6) | X lỗi dữ liệu lượt 1 rồi lỗi kênh lượt 2 (lan 2) ⇒ lỗi kênh đầu vẫn đếm GL4 |
| V3a | HÀNH VI trọn đường (RF2) | X, Y, Z HTTP 500 JSON 100 s rồi lành ⇒ ngắt đọc «HTTP 500», không ai SALE, 0 việc; mở ⇒ cả ba vào hàng, bot trả lời |
| V3b | bảng phân loại (đơn vị, cửa thật) | 500/503/429/408 · 502 HTML · «Thiếu mã» ở 500/429/408 · câu lạ · `{}` · `null` · `{success:false}` · 121 · «gói cước» lệch hình ⇒ KÊNH; «Thiếu mã» (200/404) · `{success:true}` · `{success:true,message}` ⇒ DỮ LIỆU; danh sách 500 JSON · `null` ⇒ lỗi danh sách KÊNH |
| V3c | HÀNH VI ở worker | tin A, B đọc HTTP 500 JSON ⇒ GL4 ngắt đọc (trước vòng 2: lỗi dữ liệu, không đếm) |
| V4a | CHẶN · CHO-QUA (RF3) | danh sách lỗi t0 → 10′ motLuot NÉM (xen dsPage · dsChoPhep) → 1 lỗi ⇒ không ngắt; đủ 2′ sau đó ⇒ ngắt |
| V4b | BIÊN | vòng XỬ (boQuaNap) ném giữa hai vòng nạp không cắt chuỗi ⇒ t0 + 2′ ⇒ ngắt |

Nhánh ca không chạm (khai): nhánh ROLLBACK của `giaoSaleLoiBen` khi giao vì kênh (chung hàm, như vòng 1) · `Object.isExtensible` (thân đóng băng, không có ở Pancake thật).

## Ca ĐỎ trên base vòng 2 → XANH
Tệp `test/gl3c-vong2.test.mjs` chạy trên bản sao base vòng 2 (`git archive 27dd9d0` + tệp dữ liệu gitignore), máy dev, hộp cát riêng:

| ca | base | sau | trên base đỏ vì |
|---|---|---|---|
| V1a | ✖ | ✔ | lượt 5 vẫn AI/GREET, 0 việc |
| V1b | ✖ | ✔ | không bao giờ giao |
| V1c | ✖ | ✔ | lượt 5 của sự cố mới không giao |
| V1d | ✖ | ✔ | không bao giờ giao |
| V1e | ✔ | ✔ | (lưới cho bản vá — đỏ dưới đảo-vá ③z4 «tích lượt lúc page ngắt») |
| V2a | ✖ | ✔ | sau X lượt 2: `đếm=1 khoá=-23` ⇒ Z chập 1 lượt ⇒ ngắt |
| V2b | ✔ | ✔ | (luật GL4, RF1d nguyên văn — đỏ dưới ③d) |
| V2c | ✔ | ✔ | (lưới cho bản vá — đỏ dưới ③y3 «cổng theo lan») |
| V3a | ✖ | ✔ | «Internal Server Error» ⇒ DỮ LIỆU ⇒ không ngắt, lượt 3 giao |
| V3b | ✖ | ✔ | `json500: phải là KÊNH — câu «Internal Server Error»` |
| V3c | ✖ | ✔ | worker không đếm 5xx JSON ⇒ không ngắt |
| V4a | ✖ | ✔ | ngắt «Pancake không trả danh sách hội thoại 10′ liên tục …» |
| V4b | ✔ | ✔ | (lưới cho bản vá — đỏ dưới ③F4b) |

Đỏ trên base 9/13. Bốn ca xanh trên base là lưới chống vá-quá-tay / vá-sai-chiều; mỗi ca có một đảo-vá đỏ đúng nó (dưới).

## Đã làm (commit `0c65380`)
1. `src/queue/nap.js` (F1 · F2): `luiDocTin` thêm `luotKenh`/`tuKenh`; hằng có tên `LUOT_LOI_KENH_GIAO_SALE = 5` (export). Lỗi kênh tích `luotKenh`
   theo sự cố (`lan` về 1 ⇒ đếm lại; page đang ngắt — đọc hay gửi — ⇒ về 0). `luotKenh ≥ 5` ⇒ CÙNG `giaoSaleLoiBen` (cùng điều kiện AI + GREET/QUALIFY/
   SELLING + page bật + không webhook), `ly_do_day` «Pancake lỗi kênh ở riêng hội thoại này (page KHÔNG ngắt): N lượt lỗi trong T (lỗi đầu HH:MM giờ VN):
   <câu> — bot CHƯA trả lời, CHƯA gửi gì · khách nhắn lần cuối …», nhật ký `sau.loi_kenh`. `ghiLoiKenh` ở bộ nạp chỉ khi `luotKenh === 1`. `roiDi` đặt
   lại cả đếm kênh. Chú thích khối GL3c ② viết lại cho đúng phạm vi.
2. `src/pancake.js` (F3): `goiPancake` gắn `maHttp` (thuộc tính KHÔNG liệt kê) vào thân JSON. `laLoiKenhDoc` thêm MỘT dòng «HTTP ≥ 500/408/429 hoặc
   thân không nhận ra ⇒ kênh», đặt GIỮA hai dòng neo gl4 ⑤s/⑤r (cả hai nguyên văn). `thanDocNhanRa` coi là «nhận ra»: mã quyền (vòng xoay đã phân xử),
   thân 2xx không báo lỗi (kể cả `success:true` có câu), 121 không mã đúng hình đã đo, «Thiếu mã khách hàng». `lyDoDocLoi` nói «Pancake lỗi (HTTP N) —
   câu» cho mã kênh. `pkGetConversations` đọc `j?.conversations` (thân `null` không ném TypeError).
3. `src/queue/chay-worker.js` (F4): `motLuot` thành vỏ `try { return motLuotTrong(…) } finally { if (!boQuaNap) giuLoiDanhSach(loiDsVong) }`. Thân giữ
   nguyên thụt lề (neo gl4 ⑤j ⑤z · gl3c ③x ③u không đổi một byte).
4. Chỉ đổi câu: `kho-suc-khoe.js` (chú thích đèn — ②c: 0 dòng ngoài câu) · `messenger/loi.js` (khối `LoiDocLichSu`/`LoiDocHoiThoai`) ·
   `docs/v3/ban-giao/cua-messenger-v1.md` :67-71 · :88-90 (tổng gật).
5. Thước: `test/gl3c-vong2.test.mjs` (13 ca; khung chép nguyên vòng 1) · `gl3c.sh`: ①v2 · ①c thêm tệp mới (sàn 33) · neo ③d ③e ③f ③v theo mã mới
   (giữ ý đột biến) · 23 đảo-vá vòng 2.
`messenger/index.js` và `ngat-page.js` không phải đổi. `gl3b.sh` · `gl4.sh` không đổi (②d).

## Quyết định (luật 11 · 13 — ghi tại chỗ quyết)
1. **F3: chọn danh sách câu ĐÃ BIẾT** (đúng chữ phiếu) thay vì phân loại thuần cấu trúc. Giá phải trả: câu lỗi riêng một hội thoại mà ta chưa biết nay là
   KÊNH. Một hội thoại như vậy được giao ở lượt 5 (≈ 7,5′) thay vì lượt 3. Hai hội thoại cùng lúc thì page ngắt 30′ và ngắt lặp (G1) — nợ
   N-GL3C-CAU-LA-NGAT-LAP.
2. **F3: giữ nguyên văn hai dòng neo gl4** (⑤s vế cạn-token · ⑤r 121 không mã) và giữ cho ⑤s/⑤r còn đo được. Muốn vậy `thanDocNhanRa` phải coi mã quyền
   và hình 121 là «đã nhận ra», để dòng cuối phân xử. Hai vế đó chỉ chạm được khi bỏ một vế khác, nên trong bộ ca chúng là đột biến sống (S2 · S8) và
   chỉ đảo-vá gl4 đo được chúng — nợ N-GL3C-DONG-CHI-CHO-DOT-BIEN. Hình 121 viết ở hai chỗ; ca V3b canh cả hai hướng lệch hình.
3. **F3: mã HTTP thắng câu đã biết** («Thiếu mã khách hàng» ở 500/429/408 ⇒ kênh): 5xx là Pancake hỏng, câu đi kèm không đáng tin.
4. **F3: phân loại dùng chung**, nên worker cũng đổi theo: 5xx JSON / thân lạ ở worker nay đếm GL4 (V3c). Trước đó là lỗi dữ liệu, giao sau 3 lượt. Cùng
   chiều F3.
5. **F2: cổng đếm GL4 là `luotKenh === 1`** (lỗi kênh ĐẦU của sự cố), không phải `lan === 1` theo chữ phiếu (/code-review #6). Lý do: sự cố mở bằng lỗi dữ
   liệu rồi Pancake sập thì `lan === 1` bỏ mất lần đếm. Với sự cố toàn kênh, hai cách cho cùng kết quả.
6. **F1: «sự cố» = `lan`** (về 1 sau ≥ 5′ không đọc, gồm cả quãng ngắt ĐỌC 30′). Vì vậy quãng ngắt đọc đặt lại đếm kênh — khác lỗi dữ liệu, vốn đếm gộp
   (P3b). Làm vậy để chuỗi ngắt-mở-lỗi lặp lại không biến thành giao (P2 3 chu kỳ 0 việc vẫn giữ). Giới hạn: vòng nạp > 5′ — nợ N-GL3C-SU-CO-THEO-LICH-LUI.
7. **F1: page ĐANG ngắt (đọc hay gửi) ⇒ `luotKenh` về 0**, mở lại đếm từ 1 và lượt đầu đếm GL4. Lý do: lúc ngắt bộ đếm GL4 đứng yên; nếu vẫn tích lượt
   thì Pancake sập trong quãng ngắt gửi ⇒ mở ra là mọi khách lỗi kênh giao cùng lúc (V1e). Giá phải trả: page bị ngắt gửi lặp (Meta phạt dài) ⇒ X không
   tới lượt 5 (/code-review soát lại) — nợ N-GL3C-KENH-NGAT-GUI-LAP. Chọn chặn giao hàng loạt, vì phiếu ghi «page KHÔNG ngắt mới giao».
8. **F1: `roiDi` đặt lại đếm kênh** như đếm dữ liệu (P3c): khách quay lại là sự cố mới. Lịch lùi vẫn giữ (neo gl3b ⑤o), nên phải đủ 5 lượt cách nhau 5′,
   tức ≈ 20′ (V1d).
9. **F1: `ly_do_cuoi` giữ `doc_lich_su_loi_ben` cho cả hai loại** (cùng hàm, không thêm giá trị mới cho màn/đếm). `ly_do_day` nói loại lỗi; nhật ký có
   `sau.loi_kenh`.
10. **F4: vỏ `try/finally` thay vì bọc riêng khối nạp**, vì bọc riêng thì phải thụt lề các dòng đang là neo gl4.sh ⑤j/⑤z (/code-review #9). Giá phải trả: ở
    chế độ một lượt (nạp + xử), việc tỉa mốc chạy sau pha xử. Pha xử không đọc/ghi `dsLoiTu` nên kết quả không đổi (V4a · V4b · ③F4a · ③F4b).
11. **`lyDoDocLoi` nói mã HTTP:** page nay ngắt vì 5xx JSON thì lý do ngắt và đèn phải nói vì sao (V3a: «Pancake lỗi (HTTP 500) — Internal Server Error
    (đọc)»).
12. **`pkGetConversations` đọc `j?.conversations`** (/code-review #3): sửa 1 ký tự, nằm trong ý F3 «thân lạ ⇒ lỗi», nhưng ngoài chữ bốn mục — khai ở Lệch.

## Cổng `ops/bin/nghiem-thu/gl3c.sh` — lượt cuối
```
$ bash ops/bin/nghiem-thu/gl3c.sh        # 08:49:06 → 08:53:31 (4′26″) · máy dev · hộp cát 127.0.0.1:5432 · cây chính, nội dung = 0c65380
✅ ⓪.env-PANCAKE_READONLY=1
✅ ①a … pass=17 fail=0 · ✅ ①b … pass=3 · ✅ ①v2-vòng-2 pass=13 fail=0 · xanh: V1a V1b V1c V1d V1e V2a V2b V2c V3a V3b V3c V4a V4b
✅ ①c-cả-bộ-ở-TZ=UTC-PGTZ=UTC pass=33 fail=0
✅ ①c-cả-bộ-ở-TZ=America/Los_Angeles-PGTZ=Asia/Tokyo pass=33 fail=0
✅ ②a không export mới · ✅ ②b fetch( 1 · goiPancake( 6 · ✅ ②c kho-suc-khoe 0 dòng ngoài câu · ✅ ②d gl4.sh · gl3b.sh không đổi
✅ ③ 49/49 đảo-vá đỏ đúng ca khai · ✅ ③0 bản sao nguyên vẹn pass=33 fail=0
✅ ④gl4.sh rc=0 · == ĐỎ 0 / XANH 44        (BO_CONG_CU=1 — ⑥ lồng của nó chạy riêng ngay dưới)
✅ ④gl3b.sh rc=0 · == ĐỎ 0 / XANH 49 · ✅ ④b-gl3b-đảo-vá-⑤d·⑤o·⑤b-còn-đỏ-đúng ✅ 3/3
✅ ④gl3.sh rc=0 · == ĐỎ 0 / XANH 25
✅ ④ l1-m2-cua 17 · l2-m1-hang-doi 28 · l2-m1-nhac-truong 12 · va-p7-chay-worker 7 · phase1-chat-flow 12 · gl3b-worker-doc-loi 11 ·
     gl3b-nap-doc-loi 7 · gl3b-pancake-van-hanh 5 · gl3b-vong2 4 · gl4-ngat-page 23 · gl4-chua-034 2 · suc-khoe 25   (mỗi tệp rc=0 fail=0)
== ĐỎ 0 / XANH 76
rc=0
```
Lượt 1 (trước khi vá theo /code-review) ra 72/72 rc=0. Lượt cuối chạy lại toàn bộ sau vá. Chuỗi gốc của cả 49 đảo-vá được kiểm bằng máy trước lượt
cuối: mỗi chuỗi khớp đúng 1 lần.

## Đảo-vá vòng 2 (bản sao tạm, mỗi đột biến một tiến trình node mới)
Neo cũ theo mã mới (giữ ý): ③d `!duLieu && luotKenh === 1` → `false` (đòi P2 + V2b) · ③e · ③f (nhánh dữ liệu tắt ⇒ P3) · ③v (dòng `roiDi` mới).
Mới, mỗi điều kiện vừa thêm một đột biến (bẫy 26) — tất cả ĐỎ ĐÚNG ca khai:

| đột biến | đỏ |
|---|---|
| ③y1 F2 đếm lại mỗi lượt lùi | V2a |
| ③y2 F2 vá quá tay (`!lui` — sự cố mới sau quãng ngắt không đếm lại) | P2 V1c |
| ③y3 cổng theo `lan` thay lượt kênh đầu (/code-review #6) | V2c |
| ③z1 bỏ giao lỗi kênh riêng một hội thoại | V1a V1b V1c V1d |
| ③z2 biên `>=` → `>` | V1a V1c |
| ③z3 giao kênh ở lượt 3 | V1a |
| ③z4 tích lượt cả lúc page ngắt (/code-review #8) | V1b V1e |
| ③z5 không đặt lại đếm kênh ở sự cố mới | V1c |
| ③z6 rời đi không đặt lại đếm kênh | V1d |
| ③F3a bỏ luật mã HTTP | V3b |
| ③F3b bỏ luật thân lạ | V3b |
| ③F3b2 bỏ cả hai (bản vòng 1) | V3a V3b V3c |
| ③F3c goiPancake không gắn mã HTTP | V3a V3b V3c |
| ③F3d mã HTTP là thuộc tính LIỆT KÊ | V3b |
| ③F3e bỏ 408/429 | V3b |
| ③F3f «Thiếu mã khách hàng» ra khỏi câu đã biết | P3 V3b |
| ③F3g thân 2xx thiếu danh sách tin thành kênh | V3b |
| ③F3i `success:true` có câu thành «báo lỗi» (/code-review #7) | V3b |
| ③F3j «gói cước» mọi hình là câu đã biết (/code-review #2) | V3b |
| ③F3k danh sách thân null ném TypeError (/code-review #3) | V3b |
| ③F3h câu lỗi 5xx không nói mã HTTP | V3a V3b |
| ③F4a tỉa mốc không nằm trong finally | V4a |
| ③F4b vòng xử ném cũng tỉa mốc | V4b |

**Đột biến nào KHÔNG đỏ** (chạy riêng trên bản sao, bộ gl3c-nap-loi + gl3c-webhook-legacy + gl3c-vong2 + gl4-ngat-page, mã cuối):
- S2 bỏ vế `permErr(j)` trong `thanDocNhanRa` — sống. Chỉ đảo-vá gl4 ⑤s đo được (vế này chỉ chạm được khi bỏ vế cạn-token).
- S8 bỏ hình 121 trong `thanDocNhanRa` — sống. Cả hai đường đều ra KÊNH; chỉ đảo-vá gl4 ⑤r đo được.
- S3 bỏ kiểm `Array.isArray` · S4 bỏ `Object.isExtensible` — sống (Pancake không trả thân mảng / đóng băng; thuộc tính phòng thủ).
- S6 nhật ký `loi_kenh` luôn false — sống (không ca nào đọc trường đó).
Đã chết sau vá review: S1 lỗi dữ liệu cộng vào đếm kênh (V2c) · S5 đảo nhãn kênh/dữ liệu (V1a) · S7 bỏ nhánh câu (V3b) · S9 `tuKenh` không đặt lại khi
page ngắt (V1b V1c).

## Kịch bản phá của đối kháng chạy lại trên mã mới (tệp ca của đối kháng, không sửa)
`scratchpad/gl3c-refute/test/refute-gl3c.test.mjs` chạy trên bản sao mã cuối (src · db · v3/src chép từ cây), hai múi giờ:
```
TZ=UTC PGTZ=UTC                         rc=1: ✔ RF1a ✔ RF1b ✔ RF1c ✖ RF1d ✔ RF1d0 ✔ RF2 ✔ RF3 ✔ RF4
TZ=America/Los_Angeles PGTZ=Asia/Tokyo  rc=1: ✔ RF1a ✔ RF1b ✔ RF1c ✖ RF1d ✔ RF1d0 ✔ RF2 ✔ RF3 ✔ RF4
[rf3c] RF1a sau 60′: GET X=5 · ngắt=«» đếm=1 khoá=-1 · X SALE/HANDOFF · việc=1 · tin trong hàng=0 · đèn=xanh …
[rf3c] RF1b sau 60′: GET X=5 · tin khác đã xử=12 · ngắt=«» đếm=0 · X SALE · việc X=1
[rf3c] RF1d X bền + Z chập 1 lượt: ngắt vi=«doc» «Pancake lỗi (HTTP 502) — thân trả về không phải JSON (đọc)» · tin Z=cho
[rf3c] RF2 chập 100 s JSON 500 rồi lành: rf2-x:AI//việc=0 · rf2-y:AI//việc=0 · rf2-z:(chưa đọc)/việc=0 · ngắt=«Pancake lỗi (HTTP 500) — Internal Server Error (đọc)» · đèn=do
[rf3c] RF3 sau 10′ vòng nạp NÉM + 1 lỗi: ngắt vi=«» «» · log «… 1 page lỗi danh sách (rf-3: danh sách hội thoại lỗi liên tục 0 s: …)»
[rf3c] RF4 dáng thật: 5 khách SALE/doc_lich_su_loi, mỗi người việc=1, tin=xong · tổng việc=5 · ngắt=«»
```
- F1: RF1a · RF1b xanh. Trước vòng 2: 15 GET, 0 việc, đèn xanh. Nay X được giao ở lượt 5.
- F2: RF1d ĐỎ, đúng luật GL4, tổng gật 08/10. Biến thể hồi quy «giữ thường trực» là V2a, xanh. RF1d0 (luật «một khách chập một lượt») xanh.
- F3: RF2 xanh. Không ai SALE; page ngắt đọc 30′, giữ tin.
- F4: RF3 xanh.
- RF4 (dáng tiến trình thật) xanh: mỗi khách đúng 1 việc.

## npm test (luật 6 — chạy khi không cổng nào sống)
```
trước (bản sao base 27dd9d0 + tệp dữ liệu gitignore, cùng máy):  ℹ tests 2706 · pass 2702 · fail 0 · skipped 4   rc=0
sau   (cây chính, nội dung 0c65380):                            ℹ tests 2719 · pass 2715 · fail 0 · skipped 4   rc=0
```
Cả hai lượt skip cùng 4 ca: AI_LOG_FIXTURE · L8_MSG_FIXTURE · D7 · D9. Thêm 13 = 13 ca V*. Chạy bằng `npm test -- --test-force-exit` (N-GL3C-NPM-TEST-TREO).
Lượt «trước» đầu tiên chạy trên bản `git archive` trần, ra 2684 pass / 22 skip. Lý do: thiếu tệp gitignore (`pages.json` …) nên các ca Y4-* · DV2 tự
skip. Chép thêm tệp đó rồi chạy lại thì còn 4 skip, đúng như cây chính. Không lùi cây chung để đo «trước».

## /code-review (high) — 9 phát hiện, kiểm chứng từng cái
| # | phát hiện | xử lý |
|---|---|---|
| 1 | hai hội thoại «hỏng bền» lỗi kênh (F3 xếp câu lạ là kênh) ⇒ page ngắt lặp 30′, hai khách không được giao | BÁC theo phiếu («từ 2 hội thoại lỗi page ngắt trước — không giao hàng loạt»; G1 đã nhận). Ghi nợ N-GL3C-CAU-LA-NGAT-LAP (F3 mở rộng lớp kênh ⇒ G1 dễ chạm hơn) |
| 2 | «gói cước» lệch hình (thiếu `success:false`, mã lạ) bị coi đã biết rồi rơi về DỮ LIỆU | VÁ: chỉ nhận ra đúng hình đã đo; lệch hình là thân lạ ⇒ KÊNH. V3b + ③F3j |
| 3 | danh sách thân JSON `null` ⇒ TypeError, không thành `LoiDocHoiThoai` | VÁ `j?.conversations`. V3b + ③F3k |
| 4 | «sự cố» suy từ `lan` — vòng nạp > 5′ thì mọi lượt là sự cố mới (F2 quay lại, F1 không tới 5) | BÁC (phiếu chỉ định `lan`; pilot 1 page không chạm; vá đúng cần định danh sự cố riêng + hằng mới — tổng quyết). Nợ N-GL3C-SU-CO-THEO-LICH-LUI |
| 5 | Pancake hỏng MỘT PHẦN, có đọc OK của khách khác xen giữa ⇒ không ngắt, cả nhóm giao riêng ở lượt 5 | BÁC (đúng mục đích F1: kênh còn chạy cho khách khác ⇒ giao riêng là đúng). Sửa chú thích `nap.js` cho đúng phạm vi câu «không giao hàng loạt». Nợ N-GL3C-KENH-GIAO-XEN-DOC-OK (chưa có trần số người giao vì kênh mỗi page) |
| 6 | sự cố mở bằng lỗi DỮ LIỆU rồi Pancake sập ⇒ lỗi kênh đầu (lan 2) không đếm GL4 | VÁ: cổng `luotKenh === 1` (quyết định 5). V2c + ③y3 |
| 7 | `{success:true, message:'OK'}` thiếu danh sách tin bị coi «báo lỗi lạ» ⇒ KÊNH | VÁ: chỉ xét câu khi không `success:true`. V3b + ③F3i |
| 8 | ngắt GỬI chặn giao tới 30′ dù sale trả lời được | VÁ THEO CHIỀU NGƯỢC: khi lần theo phát hiện này tôi thấy lỗ nặng hơn — lúc ngắt, bộ đếm GL4 đứng yên mà `luotKenh` vẫn tích ⇒ mở lại là giao hàng loạt. Nay page ngắt ⇒ không tích; mở lại lượt đầu đếm GL4 (quyết định 7). V1b viết lại · V1e · ③z4. Phần «giao sớm khi ngắt gửi» BÁC (sẽ mở lại giao hàng loạt) |
| 9 | tỉa mốc dời vào `finally` của cả lượt (chạy sau pha xử) | BÁC: bọc riêng khối nạp phải thụt lề các dòng đang là neo gl4.sh ⑤j/⑤z; pha xử không đụng `dsLoiTu` (quyết định 10) |

**Soát lại sau vá** (bẫy 26; cùng agent `code-review`, chỉ phần vá): (a) #2/#7 · (b) #3 · (c) #6 đúng, không lỗi; dòng `tuKenh` đúng thứ tự toán tử; chuỗi gốc
đột biến trong `gl3c.sh` theo kịp mã. Thêm 1 phát hiện về (d): page bị ngắt gửi lặp nhiều giờ (Meta phạt — mở 30′, gửi hỏng 2 tin, ngắt tiếp) ⇒ X lỗi kênh
bền không bao giờ tới lượt 5. Hướng reviewer đề nghị (đóng băng thay vì về 0) cũng không cứu được kịch bản đó, trừ khi cho giao ngay lượt đầu sau khi mở,
mà làm vậy thì giao hàng loạt quay lại. BÁC theo chữ phiếu («page KHÔNG ngắt mới giao»), ghi nợ N-GL3C-KENH-NGAT-GUI-LAP kèm hai hướng cho tổng chọn.

## Lệch phiếu vòng 2 — nói thẳng
1. **F2:** cổng đếm GL4 là `luotKenh === 1` thay vì `lan === 1` như chữ phiếu (quyết định 5 · /code-review #6). Sự cố toàn kênh thì hai cách trùng nhau.
2. **RF1d nguyên văn vẫn ĐỎ:** đúng luật GL4 «2 khoá khác nhau liền nhau», tổng gật 08/10. Phần hồi quy đã sửa là biến thể «giữ thường trực»; ca riêng V2a
   canh nó.
3. **Pathspec** có thêm `docs/v3/ban-giao/cua-messenger-v1.md` (tổng gật, chỉ hai đoạn :67-71 · :88-90).
4. **`pkGetConversations` thân `null`** (1 ký tự, /code-review #3) nằm ngoài chữ bốn mục; tôi xếp nó vào ý F3 «thân lạ ⇒ lỗi».
5. **`lyDoDocLoi` thêm mã HTTP vào câu** (quyết định 11) — phiếu không kể.
6. **Lời phiếu «Từ 2 hội thoại lỗi trở lên page đã ngắt trước — không giao hàng loạt»** chỉ đúng khi lượt kênh đầu của hai hội thoại liền nhau, không có lượt
   đọc OK chen giữa (/code-review #5). Chú thích `nap.js` nay nói đúng phạm vi đó; phần còn lại ghi nợ.
7. **F1 «page KHÔNG ngắt»:** tôi hiểu là mọi loại ngắt (cả ngắt gửi, lúc page vẫn được nạp). Page ngắt thì không tích lượt, mở lại đếm từ 1 (quyết định 7).
8. **`npm test` «trước»** đo trên bản sao base kèm tệp gitignore, không lùi cây chung.
9. **`gl2.sh` không chạy:** vòng 2 không đụng trần / page-routing (vòng 1 đã chạy 52/52). `gl4.sh` chạy với `BO_CONG_CU=1` trong ④, vì gl3b và gl3 đã chạy
   riêng, rc tách dòng.

## Nợ vòng 2 (đã ghi §9 sổ)
- **N-GL3C-CAU-LA-NGAT-LAP** (/code-review vòng 2 #1): F3 xếp câu/thân LẠ là lỗi KÊNH.
  - Hai hội thoại cùng page mà Pancake trả câu lỗi riêng ta chưa biết (vd «Conversation not found») ⇒ lượt kênh đầu của hai sự cố liền nhau ⇒ ngắt 30′.
    Mở lại thì ngắt tiếp (G1): page câm theo chu kỳ, đèn đỏ, hai khách không được giao.
  - Chỉ một hội thoại thì giao ở lượt kênh 5 (≈ 7,5′) thay vì lượt 3.
  - Cần đo prod thân lỗi /messages (mã HTTP + câu) để lấp `CAU_DU_LIEU_DA_BIET`. Người quyết xem có xếp 4xx có câu là dữ liệu không.
- **N-GL3C-KENH-NGAT-GUI-LAP** (/code-review soát lại): page bị ngắt GỬI lặp nhiều giờ (Meta phạt) ⇒ hội thoại lỗi kênh bền không bao giờ tới lượt 5 (lúc
  ngắt, đếm về 0) ⇒ không giao. Suốt quãng đó đèn ngắt kênh ĐỎ. Hai hướng cho tổng chọn:
  - (a) lúc ngắt GỬI cho giao nếu cùng vòng có lượt đọc OK của khách khác — bằng chứng kênh đọc còn chạy;
  - (b) đóng băng đếm, lượt đầu sau khi mở chỉ đếm GL4, lượt kế mới giao — không cứu được khung mở ngắn hơn lịch lùi 5′.
- **N-GL3C-KENH-GIAO-XEN-DOC-OK** (/code-review vòng 2 #5): Pancake hỏng MỘT PHẦN — một nhóm hội thoại lỗi kênh bền, khách khác đọc OK chen giữa ⇒ GL4 không
  ngắt (chỉ lượt kênh đầu đếm), cả nhóm được giao riêng ở lượt 5. Đúng mục đích F1, nhưng chưa có trần số hội thoại giao vì kênh mỗi page.
- **N-GL3C-SU-CO-THEO-LICH-LUI** (/code-review vòng 2 #4): «sự cố» suy từ `lan` của lịch lùi (về 1 khi đọc lại trễ ≥ 5′ so với hạn lùi). Vòng nạp > 5′ (nhiều
  page + Pancake chậm) thì mọi lượt là sự cố mới: F2 «giữ thường trực» quay lại, và lượt kênh không lên tới 5. Pilot 1 page không chạm. Vá đúng cần định
  danh sự cố tách khỏi lịch lùi (hằng mới — tổng quyết).
- **N-GL3C-KENH-ROI-DI-20P:** khách rời đi rồi quay lại, hoặc page hết ngắt gửi: đếm kênh đặt lại nhưng lịch lùi vẫn giữ (neo gl3b ⑤o) ⇒ 5 lượt cách nhau 5′
  ⇒ giao sau ≈ 20′ (V1b · V1d).
- **N-GL3C-DONG-CHI-CHO-DOT-BIEN:** hai vế trong `pancake.js#thanDocNhanRa` chỉ chạm được khi bỏ một vế khác:
  - `permErr(j)` — thân mã quyền chỉ tới đây khi cạn token, mà khi đó dòng đầu đã bắt;
  - hình 121 không mã — trùng dòng cuối, viết ở hai chỗ.
  Giữ để đảo-vá gl4 ⑤s/⑤r còn đo được. Muốn gọn lại thì phải đổi neo gl4.sh.
- **N-GL3C-DOT-BIEN-SONG** (cập nhật vòng 2): S2 · S8 (trên) · `Array.isArray` / `Object.isExtensible` trong phân loại · trường `loi_kenh` của nhật ký giao.
- Nối **N-GL3C-NAP-HAI-HOI-THOAI-MOT-CHAP:** F3 mở rộng lớp lỗi kênh (5xx JSON · câu lạ). Một lần Pancake chập 5xx trúng hai hội thoại cùng vòng nạp nay là
  ngắt 30′, tin giữ. Trước vòng 2, đó là lỗi dữ liệu, và chập ≥ 90 s là giao sale hàng loạt.
- **Trả:** N-GL3B-NAP-LOI-BEN (đủ — phần kênh ở F1) · N-GL4-5XX-JSON (F3).
