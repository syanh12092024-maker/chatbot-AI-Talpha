# Nhật ký phiếu GL4 — ngắt cả page 30′ khi kênh Pancake lỗi 2 lần liên tiếp (gửi HOẶC đọc), tự mở; tin tồn giữ ở chờ; đèn đỏ có lý do (07/10/2026 · thợ GL4)

**Môi trường đo:** máy dev (Node v24, macOS), `fetch` GIẢ trong mọi ca (host ≠ `pages.fm` ⇒ ném; ca HTTP chỉ cho 127.0.0.1 của máy chủ ca),
2 token giả, hộp cát Postgres 127.0.0.1:5432 (`aicloser_v3_test_gl4_{w,034,den}_p<pid>`, tự dựng/dọn qua `db/sandbox.js`, migration 034 áp
trong hộp cát). Không một lượt mạng thật, không đo prod, không đo `aicloser_v3`. `.env` giữ `PANCAKE_READONLY=1` (cổng ⓪ đọc lại mỗi lượt);
ca mở van trong `process.env` của tiến trình ca SAU khi cài fetch giả và khẳng định `congHttpGhi.daChan` không tăng. Làn 🟥. Base `a0cc56a`
(HEAD lúc nhận `006ca12`; tổng thêm `3c928aa` nới ③ giữa chừng). **Commit mã: `f572434`** (21 tệp — đúng ③ + nới ③).
Thợ duy nhất trong cây chung; TT1b · GP1 chạy chuỗi cổng cũ ở worktree riêng (chỉ tranh CPU/Postgres) — không gặp đỏ lạ nào phải chạy lại riêng.

> ⚠️ **MIGRATION 034 PHẢI ÁP TRÊN VPS TRƯỚC KHI CHẠY MÃ GL4** (mo-van §5). Mã GL4 trên CSDL chưa áp 034 thì KHÔNG ngắt page nào (bắt 42703,
> cảnh báo MỘT lần) — lượt xử vẫn đúng (ca M7a), nhưng không bảo vệ gì. Down 034 an toàn với mã mới đang chạy (cùng lý do).

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-MB-NGAT-PAGE\|N-GL3B-GL4-DOC-LOI\|N-GL3B-PHA-KET-NOI\|N-GL3B-BANGIAOLOI-PANCAKE\|N-GL3B-KHUON-VIEC-HAI-BAN\|N-GL2-DAI-TRANG-THAI\|N-GL3B-CONV-NUOT-LOI"
1294:  - **N-GL3B-CONV-NUOT-LOI** (phiếu ⑥ · review (a) G2) `pkGetConversations` nuốt lỗi ⇒ vòng nạp «0 hội thoại» …
1295:  - **N-GL3B-BANGIAOLOI-PANCAKE** (phiếu ⑥ · review (a) G1) `banGiaoLoi` (và `banGiaoDocLoi`) không thẻ/ghi chú Pancake …
1301:  - **N-GL3B-PHA-KET-NOI** (phiếu ⑥ F6) `phaLoi:'ket_noi'` không phải bằng chứng «chưa gửi byte nào» …
1305:  - **N-GL3B-GL4-DOC-LOI** (phiếu ⑥ · review (a) N3) GL4 … phải tính cả `LoiDocLichSu` …
1311:  - **N-GL3B-KHUON-VIEC-HAI-BAN** (/code-review #8) câu chèn `viec_can_xu_ly` có hai bản …
1314:  - **N-GL2-DAI-TRANG-THAI** dải trạng thái mọi trang …   1333: **N-GL2-DAI-TRANG-THAI** NÂNG …
$ grep -n "N-MB-NGAT-PAGE" SO-DIEU-HANH-THI-CONG.md      # nằm SAU §9b nên awk §9..§9b không thấy
2278:- 02/10 · **N-MB-NGAT-PAGE** (CR-02-10 · MB4) — nguyên tắc 9 README «biết dừng khi kênh lỗi»: v1 ngắt CẢ PAGE 30′ sau 2 lần gửi …
$ ls ops/bin/tra_no.py docs/thi-cong/SO-NO.md        → cả hai không tồn tại
```
Quan hệ: **trả nợ N-MB-NGAT-PAGE + N-GL3B-GL4-DOC-LOI + phần «không việc» (tin/ảnh gửi không rõ) của N-GL3B-BANGIAOLOI-PANCAKE**; gộp một nửa
N-GL3B-KHUON-VIEC-HAI-BAN (trong worker.js). Không trùng phán cũ. N-GL3B-PHA-KET-NOI: GL4 không gửi lại theo `phaLoi` (chỉ dùng để nói lý do).

## Bước 3 — đo lại nguyên liệu đề bài (ở base)
Mọi chỗ phiếu ① dẫn đều đúng: `chay-worker.js#motLuot :87-146` (`choPhep` một lần đầu vòng `:97-98`, `chayToiKhiHet({toiDa:50,pageIds})`
`:141-145`), `:224` 3 vòng xử + 1 vòng nạp · `worker.js:177-183` đọc trước, `:234` cửa gửi, `:105` `LoiCanDoiChieuGui` trần ở lượt rút lại ·
`handler-v3.js:152-153` bọc thành `LoiGuiChuaXacNhan` giữ `cause` · `lan-gui.js:68,74,89` · `messenger/index.js:191-193` nơi DUY NHẤT dựng
`LoiDocLichSu` · `pancake.js:337-338` (121 không mã), `:347` (neo gl3b), `:365-374` (câu riêng của Pancake). Neo cổng cũ: `gl3b.sh:154-161`
(dòng `pancake.js:347` + chuỗi con), ⑤b/⑤l/⑤q/⑤f/⑤r…⑤u trong worker.js, ⑤a dòng `const kq = await pkDocTin(pageId, convId, custId);` trong
index.js; `gl2.sh` ⑤p/⑤q trong kho-suc-khoe; `gl3.sh`/`gl3b.sh` đếm `fetch(`=1 · `goiPancake(`=6. **Lệch đề bài phát hiện:**
(a) `suc-khoe.test.mjs` đếm 11 ở `:173-174` VÀ `:184` (phiếu chỉ ghi `:173-174`); (b) `gl3b-nap-doc-loi.test.mjs` N5 neo «033 là bản mới nhất»
— ngoài ③ ⇒ DỪNG, báo tổng (xem «Nới ③»); (c) `test/gl3-han-cho-pancake.test.mjs` R7d `deepEqual(pkAddNote(...), {ok:false,error})` ⇒ không
thêm trường vào `dauLoiMang` dùng chung (xem quyết định 3).

## Danh sách ca (viết TRƯỚC mã — bốn nhóm CHO-QUA · CHẶN · BIÊN · HÀNH VI trọn đường)
`test/gl4-ngat-page.test.mjs` (đường thật motLuot → chayMotVong → docTin → pkDocTin → fetch giả; gửi qua bocCuaGuiBen + cửa thật):
- P1 đọc quá hạn 2 tin khác nhau ⇒ ngắt `doc` ≈30′ (đồng hồ CSDL) + 1 nhật ký đúng team; vòng sau 0 fetch cho P (nạp lẫn rút), Q được fetch;
  qua 30′ + lành ⇒ A, B được trả lời (1 POST mỗi khách), `page_mo_lai_kenh` 1 dòng
- P1b 4 tin tồn, tin 1–2 lỗi trong CÙNG một lượt `chayToiKhiHet` ⇒ tin 3–4 `cho`, `so_lan_thu` 0, 0 fetch, 0 lượt não, `vong=2`
- P1c cùng một tin lỗi lượt 1, 2 ⇒ không ngắt (bộ đếm 1); lượt 3 ⇒ giao sale CÓ việc (GL3b)
- P2q/P2m/P2n/P2h đọc OK THẬT + gửi hỏng (105 mọi token · `(#10)` · mạng · quá hạn) ở 2 hội thoại ⇒ ngắt `gui`, lý do «mã 105» / «(#10)» /
  «mạng» / «quá hạn 300 ms chờ Pancake (gửi)», `lan_gui` khong_ro, không gửi lại, mỗi hội thoại đúng 1 việc «Gửi không rõ…»
- P2v đang ngắt vì GỬI ⇒ bộ nạp vẫn chạy (tin mới vào `cho`), không rút, 0 POST
- P2c rút lại sau crash ×2 · P2d thiếu thẻ «AI back Sale» ×2 (0 POST, không việc «Gửi không rõ») · P2e ghi chú bị từ chối ×2 ⇒ KHÔNG ngắt
- P2k luật dấu kênh của `bocCuaGuiBen` (đơn vị: đếm tin/ảnh đã gọi Pancake; không đếm cửa tự ném · không HTTP · hết token · cổng chặn ·
  ghi chú/thẻ; lỗi sổ sau gửi OK và đụng UNIQUE KHÔNG gắn dấu nào)
- P3a gửi lỗi → gửi OK → gửi lỗi ⇒ không ngắt · P3b đọc lỗi → đọc OK (nhường) → đọc lỗi ⇒ không · P3c gửi lỗi → ĐỌC OK (nhường) → gửi lỗi ⇒ NGẮT ·
  P3d gửi lỗi → lượt gửi ĐƯỢC ảnh rồi hỏng bước sau → gửi lỗi ⇒ không ngắt (thêm sau /code-review #4)
- P4a «Thiếu mã khách hàng» ×2 ⇒ không · P4b 105 mọi token ×2 ⇒ ngắt · P4c 121 không mã «gói cước» ×2 ⇒ ngắt · P4d thân không danh sách ×2 ⇒ không
- P5 GL2: P đang ngắt vẫn đếm trần (trần 1 ⇒ bật Q 409); trần 2 ⇒ Q chạy, tin P vẫn `cho`
- P8 đang ngắt không đếm/không ngắt chồng (tin đang bay) · 4 vòng cùng thấy hết hạn ⇒ 1 dòng mở · sau mở 1 lỗi ⇒ chưa · lỗi 2 ⇒ ngắt lại ·
  4 lượt mở CÙNG lúc ⇒ đúng 1 lượt trả page
- R bộ nhớ chung: lát đọc cũ không xoá ngắt còn hạn; hết hạn theo đồng hồ CSDL ⇒ bỏ; lượt mở lại của chính tiến trình ⇒ bỏ
`test/gl4-chua-034.test.mjs`: M7a CSDL chưa 034 — lượt gửi THÀNH CÔNG `xong` (sổ AI còn, hội thoại AI, `lan_gui` da_gui), lượt gửi lỗi vẫn
`loi` + việc, vòng không sập, cảnh báo 034 đúng 1 lần qua 3 vòng · M7b 034 up → down → up trên hộp cát có page đang ngắt (CHECK `ngat_vi`).
`v3/test/b/gl4-den-ngat-kenh.test.mjs` (HTTP thật, 2 team): D1 đèn ĐỎ (giờ VN · lý do · hàng đợi team 3 tin · 2 việc cần đối chiếu, đếm đúng
lý do + mở + team) · team Y không lộ · «Máy chạy bot» VÀNG «máy KHÔNG hỏng» không dặn khởi động lại · nhãn màn Page & Bot · D2 CHO-QUA không
ngắt ⇒ xanh, đèn nhịp về ĐỎ «khởi động lại» · D4 quá giờ chưa mở ⇒ đèn nói «đã tới giờ tự mở», không che «máy đứng», nhãn «Quá giờ mở kênh».
`v3/test/b/gl4-den-don-vi.test.mjs`: D3 chưa 034 ⇒ XÁM · D5 giờ VN qua nửa đêm + số tin qua `xetNhip` thật · D6 còn page bật KHÔNG ngắt ⇒ không che.
Nhánh KHÔNG ca nào chạm (khai): đường webhook (`docHoiThoai`) — không đếm, không ca; diễn tập loại khỏi `guiOk` — không ca; hai tiến trình
worker cùng lúc (bộ nhớ chung theo tiến trình) — không ca; `pageIds = null` (gọi trần) không lọc — cố ý, ghi ở mã.

## Ca ĐỎ trên base → XANH
Trên base (`a0cc56a` + bốn tệp ca, chưa sửa mã): **29/29 đỏ** (`gl4-ngat-page` 22/22 · `gl4-chua-034` 2/2 · `gl4-den-ngat-kenh` 3/3 ·
`gl4-den-don-vi` 2/2) — log `scratchpad/gl4-ca-tren-base.txt`. P3d · D6 thêm sau /code-review (đỏ đúng trên bản trước vá qua đảo-vá ⑤aa · ⑤ac).
Sau sửa: 23 + 2 + 3 + 3 = **31/31 xanh**, cả ở `TZ=UTC PGTZ=UTC` và `TZ=America/Los_Angeles PGTZ=Asia/Tokyo` (③c).

## Đã làm (commit `f572434`)
- **034** `page`: `loi_doc_lien_tiep` · `loi_gui_lien_tiep` · `loi_doc_tin_cuoi` · `loi_gui_tin_cuoi` · `ngat_den` · `ngat_vi` (CHECK `''`·doc·gui) ·
  `ngat_ly_do`; down xoá đúng 7 cột; `db/schema.sql` sinh bằng `node db/migrate.js schema`.
- **`src/queue/ngat-page.js`** (mới): `ghiLoiKenh` một UPDATE nguyên tử (SET tự đọc dòng — hai vòng cùng ghi vẫn đúng; tăng chỉ khi tin khác
  `loi_<kiểu>_tin_cuoi`; chạm 2 ⇒ `ngat_den = now()+30′`, về 0 cả hai bộ đếm; `WHERE ngat_ly_do = ''` ⇒ đang ngắt không đếm, không chồng) +
  nhật ký `page_ngat_kenh` (team của page) + ghi bộ nhớ chung NGAY · `ghiDocTot` (chỉ chuỗi đọc) · `ghiGuiTot` (cả hai) — đều `WHERE ≠ 0`, không
  sinh ghi khi sạch · `moLaiPageHetHan` UPDATE `… ngat_ly_do <> '' AND ngat_den <= now() RETURNING` (nhật ký mỗi dòng trả) · `lamMoiNgat` MỘT
  SELECT mỗi vòng, chỉ chạy câu mở khi có page hết hạn · bộ nhớ chung (thêm/kéo dài theo CSDL; bỏ khi hết hạn theo `now()` của chính câu đọc
  hoặc khi chính tiến trình mở) · nuốt lỗi + cảnh báo một lần MỖI loại · `cauLyDoDoc`/`cauLyDoGui` (bỏ đường dẫn/token) · `gioVN` (UTC+7 cố định).
- **worker.js**: `chayMotVong` = lọc `pageIds` theo bộ nhớ chung trước MỖI lượt rút → `xuMotVong` (thân cũ) → ghi bộ đếm SAU phiên trên
  `poolGui`. Lỗi kênh: `LoiDocLichSu.capKenh` / `e.cause.kenh`. `guiOk` = lượt XONG có `dem.guiTin+guiAnh > 0` (không diễn tập) HOẶC (nhánh lỗi)
  sổ gửi có tin/ảnh `da_gui`. Việc «Gửi không rõ đã tới khách — đối chiếu ở Vận hành trước khi trả AI» khi sổ gửi có tin/ảnh `dang_gui`/`khong_ro`,
  BẤT KỂ `banGiaoLoi` đổi mấy dòng, cả đường cứu SQL. Một hàm `chenViec` cho đọc lỗi + gửi lỗi (một `WHERE NOT EXISTS (` — neo ⑤b giữ).
- **chay-worker.js**: `lamMoiNgat` mỗi vòng; ngắt vì ĐỌC bỏ nạp, vì GỬI vẫn nạp; `ket.ngat` + một cụm trong dòng `inLuot`.
- **lan-gui.js**: `LoiCanDoiChieuGui(dau)` mang `{ loai, kenh, chiTiet }` khi ném SAU khi đã gọi cửa; `kenh` = tin/ảnh ∧ `daGoi` ∧ ¬`biChan`.
- **pancake.js** (chỉ phân loại đọc + R2-N1): `pkDocTin` bọc `docTinMotLuot` và trả `capKenh` khi `ok:false` (dòng `:347` và chuỗi con neo gl3b
  NGUYÊN); `laLoiKenhDoc` (cạn token · không còn token · thân hỏng · 121 không mã «gói cước»); `dauLoiGui` (biChan · daGoi · ma) chỉ cho
  `pkSendReply`/`pkSendImage`. Không thêm export (④b), `fetch(`=1 · `goiPancake(`=6 (④a).
- **messenger/index.js + loi.js**: `LoiDocLichSu(thongDiep, { capKenh })`; hợp đồng `docs/v3/ban-giao/cua-messenger-v1.md` đổi cùng commit.
- **Đèn**: `kho-suc-khoe.js` ⑤b `ngat_kenh` (XÁM khi dòng `page` không có cột 034) · `denMayChayBot` nhánh «máy KHÔNG hỏng, đừng khởi động lại»
  sau nhánh vượt trần (neo gl2 ⑤p/⑤q giữ) · `kho-page.js#gonPage` khoá `ngatKenh` chỉ khi đang ngắt · `page-bot.html` huy hiệu dưới công tắc.
- `suc-khoe.test.mjs` 11 → 12 (`:173` · `:174` · `:184` + chữ «MƯỜI HAI» ở tên ca/đầu tệp).

## Quyết định (luật 11 · 13 — ghi tại chỗ quyết)
1. `pkDocTin` tách thân sang `docTinMotLuot(…, soLoi)`: dòng index.js `const kq = await pkDocTin(pageId, convId, custId);` là neo ⑤a gl3b
   (không được đổi) ⇒ nơi gọi không truyền `soLoi` được; dòng `:347` là neo ⑤v/⑤w ⇒ không chèn trường vào đó. Bọc ngoài gắn `capKenh`.
2. 121 không mã khớp chữ «gói cước» — NGOẠI LỆ DUY NHẤT theo câu chữ, chỉ khi `success:false` + không `error_code` (review N5 cho phép).
3. **Lệch R2-N1:** thêm `daGoi` ngoài `ma` + `biChan`, và đặt ba trường ở helper riêng `dauLoiGui` thay vì `dauLoiMang`. Lý do: công thức
   review «cửa trả về ok≠true ∧ ¬biChan ⇒ kênh» đếm oan «thiếu url ảnh» và hết token (`{}`, chưa gọi); thêm vào `dauLoiMang` làm đỏ GL3 R7d
   (`deepEqual` kết quả `pkAddNote`, tệp ngoài ③). Giá: hai helper thay vì một.
4. **Cửa NÉM ⇒ `kenh:false`** — theo chữ phiếu R2-N1 «lỗi cửa tự ném … KHÔNG phải lỗi kênh», không theo công thức trong báo cáo review (đếm cửa
   ném ngoài 3 tên). Cửa thật không ném sau khi gọi Pancake (`pkFetchPage` nuốt mọi lỗi `goiPancake` thành kết quả) ⇒ cửa ném = chưa gọi.
5. Đèn: «đang ngắt» = `ngat_ly_do <> ''` (worker đặt/xoá bằng đồng hồ CSDL); `conHieuLuc` theo đồng hồ máy giao diện chỉ để nói «quá giờ mà chưa
   mở» và để tắt nhánh «máy không hỏng». Số «tin chờ» đọc từ chuỗi `so` của `xetNhip` (bộ đọc nhịp không trả số thô; `nhip-may-bot.js` ngoài ③)
   — ca D5 canh, ghi nợ N-GL4-NHIP-SO-THO.
6. Nhánh «máy KHÔNG hỏng» chỉ khi MỌI page bật của team đang ngắt còn hạn (sau /code-review #1). Giá: team có page bật khác vẫn thấy ĐỎ «máy
   đứng» khi page đó không có tin (dồn chỉ của page ngắt) — chọn báo động thừa thay vì che máy chết.
7. N-GL3B-KHUON-VIEC-HAI-BAN chỉ gộp được trong worker.js (`operations.js` ngoài ③).
8. Lượt rút lại sau crash nay đẻ việc «Gửi không rõ…» (sổ gửi `dang_gui`) — đúng nghĩa «không rõ đã tới», trước GL4 là `banGiaoLoi` trơn.

## Nới ③ (tổng gật 07/10, phiếu `3c928aa`) — `test/gl3b-nap-doc-loi.test.mjs`, CHỈ ca N5
N5 gọi `xuong()` MỘT lần và `deepEqual(go, ["033_nap_bo_qua_doc_tin_loi"])` ⇒ có 034 là đỏ (thước ngắn, bẫy viet-thuoc luật 6). Sửa: gỡ lùi tới
khi 033 rời `_migrations` (trần = số bản đã áp), khẳng định 033 ∈ đã gỡ, `len` lại, 033 ∈ đã áp; giữ nguyên CHECK cũ sau down / CHECK mới sau up.
```
TRƯỚC (cây có 034):  ✖ N5 · «gỡ=034_page_ngat_kenh · còn doc_tin_loi sau gỡ=1 · CHECK cũ từ chối=(rỗng) · áp=034_page_ngat_kenh»
                     ⑤c :bo-033 (bản sao xoá 033) ⇒ đỏ N1 N2 N3 N5 (pass 3 fail 4)
SAU:                 ✔ N5 · «gỡ=034_page_ngat_kenh,033_nap_bo_qua_doc_tin_loi · còn 0 · CHECK cũ từ chối=nap_bo_qua_ly_do_check · áp=033…,034…» (7/7)
                     ⑤c :bo-033 ⇒ đỏ N1 N2 N3 N5 (pass 3 fail 4) — giữ ý đột biến; gl3b.sh ⑤c ✅ trong lượt cổng cuối
```

## Cổng `ops/bin/nghiem-thu/gl4.sh` — lượt cuối (12:03:17 → 12:08:35, ~5′20″)
```
✅ ⓪ .env PANCAKE_READONLY=1
✅ ① worker cửa thật pass=23 fail=0 · xanh: P1 P1b P1c P2c P2d P2e P2h P2k P2m P2n P2q P2v P3a P3b P3c P3d P4a P4b P4c P4d P5 P8 R
✅ ② chưa-034 + up/down/up pass=2 · M7a M7b      ✅ ③ đèn HTTP 2 team pass=3 · D1 D2 D4      ✅ ③b đơn vị pass=3 · D3 D5 D6
✅ ③c TZ=UTC/PGTZ=UTC pass=6 · ✅ ③c TZ=America/Los_Angeles/PGTZ=Asia/Tokyo pass=6
✅ ④a fetch(=1 goiPancake(=6 · ✅ ④b không thêm export pancake.js · ✅ ④c page-routing.js không đổi · ✅ ④d schema sinh từ migrate · ✅ ④e 034 khai «áp VPS trước»
✅ ⑤a…⑤z · ⑤aa…⑤ae (31 đảo-vá, bảng dưới) · ✅ ⑤0 bản sao nguyên vẹn pass=31 fail=0
✅ ⑥gl3b.sh rc=0 · ĐỎ 0 / XANH 49 · ✅ ⑥b gl3b đảo-vá V2c/V2d (⑤v·⑤v2·⑤v3·⑤w) ✅ 4/4 · ✅ ⑥gl3.sh rc=0 · 0/25 · ✅ ⑥gl2.sh rc=0 · 0/52
✅ ⑥ va-p7 7/0 · phase1-chat-flow 12/0 · l2-m1-hang-doi 28/0 · l0-m1-luoc-do 13/0 · gl2-tran-page-bat 16/0 · gl3b-worker-doc-loi 11/0 ·
   gl3b-nap-doc-loi 7/0 · gl3b-pancake-van-hanh 5/0 · gl3b-vong2 4/0 · suc-khoe 25/0 · l2-m1-nhac-truong 12/0 · gl3-han-cho-pancake 18/0 (rc=0 từng dòng)
⏸ ⑦ npm-test hoãn (chạy riêng, dưới)
== ĐỎ 0 / XANH 60 · rc=0
```
`_chan1.sh gl4` (sau commit mã): ①②④⑤⑥⑦ ✅ (⑦ chạy lại gl4.sh rc=0 lần nữa) · ⑧a đỏ vì nhật ký chưa có lúc đo (tệp này) · ⑧b ✅.

## Đảo-vá (bản sao tạm, mỗi đột biến một tiến trình node mới) — 31/31 đỏ đúng phép
| đột biến | đỏ |
|---|---|
| ⑤a đọc OK xoá cả bộ đếm gửi (`ghiDocTot`→`ghiGuiTot`) | P2q P2m P2n P2h P3c |
| ⑤b kiểm theo vòng (ngắt không vào bộ nhớ chung) | P1b |
| ⑤c đếm theo lượt (không theo tin) | P1c |
| ⑤d đếm lượt rút lại sau crash | P2c |
| ⑤e đếm gatThe/ghiNote/không-HTTP (`kenh = ¬biChan`) | P2d P2e P2k |
| ⑤f phân loại đọc theo câu chữ («quá hạn/lỗi mạng/HTTP») | P4b P4c |
| ⑤g ghi* dùng client giao dịch (`ghiDocTot(khach)` sau đọc) | M7a |
| ⑤h mở lại không điều kiện (bỏ `ngat_ly_do <> ''`) | P8 |
| ⑤i bỏ lọc page ngắt | P1 P1b |
| ⑤j ngắt vì gửi mà bỏ nạp | P2v |
| ⑤k `denMayChayBot` không nhánh ngắt | D1 |
| ⑤l không đẻ việc cho tin gửi lỗi | P2q P2m P2n P2h |
| ⑤m `guiOk` cả lượt nhường (R2-N3) | P3c |
| ⑤n đang ngắt vẫn đếm / ngắt chồng (R2-N3) | P8 |
| ⑤o ngưỡng 1 thay 2 | P1c P3a P3b |
| ⑤p lượt làm mới ghi đè bộ nhớ (R2-N2) | R |
| ⑤q đếm mọi `LoiDocLichSu` (bỏ `capKenh`) | P4a P4d |
| ⑤r bỏ ngoại lệ 121 không mã | P4c |
| ⑤s cạn token không là lỗi kênh | P1b P4b |
| ⑤t gắn dấu cả lỗi sổ SAU gửi OK | P2k |
| ⑤u lý do gửi mất mã Pancake | P2q |
| ⑤v giờ VN thành giờ UTC | D1 D5 |
| ⑤w đèn đếm cả việc khác lý do | D1 |
| ⑤x «máy không hỏng» che cả khi HẾT hạn | D4 |
| ⑤y nhãn màn Page mất giờ | D1 |
| ⑤z ngắt vì đọc vẫn nạp | P1 |
| ⑤aa (sau review #4) lượt gửi ĐƯỢC rồi hỏng không xoá chuỗi | P3d |
| ⑤ab (#5) việc «Gửi không rõ» cả khi chỉ thẻ hỏng | P2d |
| ⑤ac (#1) «máy không hỏng» che cả khi còn page bật không ngắt | D6 |
| ⑤ad (#10) nhãn màn Page nói giờ đã qua | D4 |
| ⑤ae (#8) làm mới một câu mà quên mở lại | P1 P8 |
Vế ④9 «đèn lộ tên page team khác ⇒ 6 đỏ» BỎ theo R2-N6 (đèn đọc kẹp team, không có đường lộ để đột biến) — thay bằng ca HTTP hai team (D1: thân
`/api/suc-khoe` và `/api/page-bot/danh-sach` của người team X không chứa tên/id page team Y đang ngắt).

**Đột biến nào KHÔNG đỏ (kết quả thật của các lượt):** lượt 1 — ⑤t KHÔNG đỏ (P2k chỉ khẳng định `kenh ≠ true`; vế `daGoi` đã đủ ⇒ dòng
`if (result?.ok === true) return null` coi như chết) ⇒ siết P2k: lỗi sổ sau gửi OK và đụng UNIQUE phải KHÔNG mang dấu nào (`kenh`/`chiTiet`
`undefined`, đúng chữ phiếu «không gắn dấu»); ⑤v KHÔNG đỏ do THƯỚC (dao truyền hai tệp ca thành một đối số) ⇒ sửa `dao` tách tệp. Lượt 4 (sau
vá review, `lamMoiNgat` chỉ mở khi SELECT thấy hết hạn) — ⑤h KHÔNG đỏ: bốn vòng không còn chắc cùng «thấy» hết hạn ⇒ phép 4-vòng phụ thuộc thời
điểm ⇒ thêm vế P8 «4 lượt mở CÙNG lúc ⇒ đúng 1 lượt trả page» (đo riêng 3/3 lượt đỏ dưới đột biến, rồi ⑤h ✅ ở lượt cổng cuối). Còn KHÔNG có
đảo-vá: cảnh báo-một-lần-MỖI-loại (đổi về một cờ chung không ca nào đỏ — M7a chỉ đếm cảnh báo 034); `daGoi` riêng (ngoài P2k đơn vị, chỉ P3d
chạm «ảnh không url» qua đường thật).

## npm test
- TRƯỚC (cây chung `006ca12`, chưa sửa): `tests 2581 · pass 2577 · fail 0 · skipped 4` (28 s).
- SAU (cây cuối, trước commit): `tests 2612 · pass 2608 · fail 0 · skipped 4` — +31 ca GL4, 0 ca cũ đỏ.

## /code-review (high) trên phần thay đổi — 10 phát hiện, kiểm chứng từng cái
| # | phát hiện | xử lý |
|---|---|---|
| 1 | «máy KHÔNG hỏng» che máy chết khi còn page khác | VÁ: chỉ khi mọi page bật của team đang ngắt còn hạn · ca D6 · ⑤ac |
| 2 | gửi đếm mọi `success:false` (lỗi theo người nhận/nội dung) | KHÔNG vá — phiếu ⑥ «vẫn đếm như v1, đo khi mở van» ⇒ nợ N-GL4-NGUOI-NHAN |
| 3 | lỗi đọc ở bước NẠP không đếm | KHÔNG vá — phiếu ② 8 / ⑥ (GL3c/GL6) ⇒ nợ N-GL4-NAP-KHONG-DEM |
| 4 | gửi được rồi hỏng ở thẻ/ghi chú không xoá chuỗi gửi | VÁ: `soGuiTin` đọc sổ gửi tin/ảnh `da_gui` ⇒ `guiOk` · ca P3d · ⑤aa |
| 5 | việc «Gửi không rõ» cả khi tin đã `da_gui`, chỉ thẻ hỏng | VÁ: việc chỉ khi tin/ảnh `dang_gui`/`khong_ro` · P2d khẳng định · ⑤ab |
| 6 | `chenViec` NOT EXISTS mọi việc mở ⇒ đếm thiếu M | KHÔNG vá — hợp đồng phiếu «vẫn NOT EXISTS việc mở» ⇒ nợ N-GL4-VIEC-MOT-MO |
| 7 | một cờ cảnh báo chung nuốt cảnh báo 034 về sau | VÁ: cảnh báo một lần MỖI loại (khoá 42703 / việc+mã) — không đảo-vá (khai trên) |
| 8 | 2 câu SQL × 4 vòng × ~4/s khi rảnh | VÁ: `lamMoiNgat` MỘT SELECT, chỉ chạy câu mở khi có page hết hạn · ⑤ae · P8 vế mở song song |
| 9 | «N tin đang giữ» gán hết tin chờ của team cho ngắt | VÁ chữ: «hàng đợi của team đang có N tin chờ (tin của page ngắt giữ ở đó tới khi mở)» |
| 10 | nhãn màn Page nói «ngắt tới» giờ đã qua | VÁ: «Quá giờ mở kênh (HH:MM) — máy chạy bot chưa mở lại» · D4 · ⑤ad |
Mỗi chỗ vá có đảo-vá đo bản SAU vá (bẫy 26) trừ #7 (khai) và #9 (chữ — D1/D5 đọc lại chuỗi mới).

## Lệch phiếu — nói thẳng
- Nới ③ `test/gl3b-nap-doc-loi.test.mjs` (ca N5) — tổng gật, phiếu `3c928aa`.
- `suc-khoe.test.mjs`: đổi cả `:184` (tổng đếm = 11) và chữ «mười một/MƯỜI MỘT» ở đầu tệp + tên ca, không chỉ `:173-174`.
- R2-N1: `daGoi` thêm ngoài `ma`+`biChan`; ba trường ở `dauLoiGui` (chỉ tin/ảnh) thay vì `dauLoiMang` (quyết định 3).
- Cửa ném ⇒ không đếm (theo chữ phiếu, khác công thức báo cáo review — quyết định 4).
- ② 4 `pageIds = null` không lọc (bộ ca gọi trần); tiến trình thật luôn truyền mảng — R2-N2 đã ghi.
- ② 6 «chèn việc» chỉ cho tin/ảnh gửi KHÔNG RÕ (sau /code-review #5), không cho mọi `daGui` — lỗi CHỈ ở thẻ/ghi chú không đẻ việc «Gửi không rõ».
- ② 7 câu đèn: «hàng đợi của team đang có N tin chờ» thay «N tin đang giữ ở chờ» (R2-N6 + /code-review #9).
- `gl3b.sh`, `test/l2-m1-nhac-truong.test.js` (có trong ③) KHÔNG phải sửa: không đụng dòng `:347`, không thêm export.

## Nợ (append §9 sổ)
N-GL4-034-VPS · N-GL4-NGUOI-NHAN · N-GL4-NAP-KHONG-DEM · N-GL4-VIEC-MOT-MO · N-GL4-NHIP-SO-THO · N-GL4-MAY-CHET-KHI-NGAT · N-GL4-5XX-JSON ·
N-GL4-MO-TAY + cập nhật N-GL3B-KHUON-VIEC-HAI-BAN · N-GL3B-BANGIAOLOI-PANCAKE (nguyên văn ở §9).
