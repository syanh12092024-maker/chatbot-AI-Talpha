# NHẬT KÝ PHIẾU VA-R3 — Máy trạng thái: CAS ghiDon (RF-13) + nhặt lại đơn kẹt cho_gui_wa (RF-14)

> Thợ **sonnet** · 23/08/2026 · base khai `bf9614a`, HEAD thật lúc khởi công `22a71f5`
> (1 commit sau base — VA-R4 ✅, KHÔNG đụng `src/orders/may-trang-thai.js`/
> `quet-don-moi.js` nên không lệch file của phiếu này) · làn 🟥 · nghiệm thu:
> `ops/bin/nghiem-thu/va-r3.sh` rc=0 (4/4 phép ĐẠT).

---

## 0 · Mục ⑦ — ĐÃ TRA (output máy)

Phiếu tự khai "⑦ ĐÃ TRA: RF-13/14 §9 — phiếu đóng. Không trùng C2/C4 (file tách)". Tự
chạy lại theo luật bổ sung v3.1 (tra SO-NO bắt buộc cho cả vá nhanh) trước khi code:

```
$ find docs -iname 'SO-NO.md'
(không có SO-NO.md trong repo này)
$ ls CLAUDE.md            # gốc repo
(không có CLAUDE.md riêng ở gốc repo — không có §6 để tra)
$ ls ops/bin/tra_no.py
(không có tra_no.py trong repo này)
$ grep -n 'RF-13\|RF-14' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
185: | VA-R3 | C3 máy trạng thái (RF-13/14) | ...
223: | C3 máy trạng thái | RF-13(CAS ghiDon)·RF-14(kẹt cho_gui_wa) | ... | VA-R3 🟥 sonnet |
269: RF-13 (CHẶN): ghiDon() UPDATE mù không CAS trang_thai_he ⇒ ảnh cũ ghi đè...
271: RF-14 (CHẶN): đơn kẹt vĩnh viễn ở cho_gui_wa...
```

Repo này KHÔNG có `SO-NO.md`/`tra_no.py`/`CLAUDE.md` riêng — nợ RF-13/RF-14 chỉ sống ở
§9 sổ điều hành, đúng như phiếu đã dẫn. Không có phán/nợ cũ nào khác trùng. Làm thẳng.

---

## 1 · Đo lại nguyên liệu TRƯỚC khi code (án lệ #4 + bẫy #3 skill)

Chạy `node docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs` (sandbox riêng của chính
script, tự dựng tự dọn) TRƯỚC khi sửa gì — xác nhận baseline ĐỎ đúng như phiếu khai:

```
F5 (RF-13): ghi POS=1 (POS đã sang 12) · hệ sau xac_nhan=day_cho_in
            lượt "het_luot" từ ẢNH CŨ → hệ=cho_sale (POS vẫn 12)   🔴 hai sổ LỆCH
F2 (RF-14): lượt 1: quet=1 saiNhanh=1 → trang_thai_he=cho_gui_wa so_lan_thu_wa=0
            lượt 2: quet=0 · viec_can_xu_ly=0                        🔴 kẹt câm
```

Đọc kỹ mã nguồn `may-trang-thai.js`/`quet-don-moi.js` trước khi sửa: `ghiDon()` UPDATE
theo `team_id`+`id` (không có `trang_thai_he` trong WHERE) — đúng như phiếu mô tả.
`CAU_QUET` chỉ chọn `moi_tu_pos` (mới) và `gui_wa_loi` (retry) — không có nhánh
`cho_gui_wa` — đúng như phiếu mô tả. Nguyên liệu đề bài KHỚP thực tế, không cần chỉnh.

---

## 2 · Thiết kế vá

### RF-13 — CAS ở `ghiDon()`, KHÔNG throw xuyên qua `apDung()`

`ghiDon(pool, {teamId, id, tu, duLieu})` thêm `AND trang_thai_he = $tu` vào WHERE (`tu`
= `buoc.tu` của `chuyen()` — ẢNH `trang_thai_he` đã đọc lúc quyết định chuyển). 0 dòng
chạm ⇒ ném `LoiGhiDonAnhCu` (lỗi có tên, export cùng khuôn 3 lỗi cũ của file).

**Quyết định KHÔNG hiển nhiên (luật 13 — nói rõ tradeoff):** `apDung()` BẮT lỗi
`LoiGhiDonAnhCu` này, ghi `nhat_ky` (hanh_dong tái dùng `don_chuyen_bi_chan` — cùng
phạm trù "lượt chuyển bị chặn" với lỗi `chuyen()`), rồi **trả về `{ghi:false,
biTuChoiAnhCu:true}` thay vì ném tiếp lên caller** — khác hẳn cách `chuyen()` ném vẫn
giữ nguyên (ném lại, KHÔNG bắt).

Lý do đo được, không phải trực giác:

- Baseline đo TRƯỚC: `refute-tong-the-1.repro.mjs` dòng F5 gọi `apDung(...)` trần,
  KHÔNG bọc try/catch, rồi đọc DB ngay dòng sau. Nếu `apDung` ném xuyên, script đứng
  ngay đó (uncaught, top-level await) — dòng ✅/🔴 của F5 KHÔNG BAO GIỜ in ra, và F6 (đất
  VA-R2, không phải việc phiếu này) cũng không chạy được nữa. Đã TỰ ĐO cả hai bản (ném
  xuyên vs bắt-trả-về) bằng cách chạy thật `node docs/.../refute-tong-the-1.repro.mjs`
  — bản ném xuyên: script dừng giữa F5, không có dòng KỲ VỌNG; bản bắt-trả-về: script
  chạy hết, F5 in `✅`, F6 vẫn chạy (giữ nguyên 🔴 của nó, đúng phạm vi). Giữa lúc code,
  tổng cũng chát báo đúng bẫy này (repro rc=0 dù có 🔴 — xem §9 nghiệm thu, đã áp
  luôn nguyên tắc "đừng tin rc, đọc NỘI DUNG" vào cách chọn thiết kế này).
- `chuyen()` ném = lỗi LOGIC xác định (cặp trạng-thái+sự-kiện SAI, không retry nào cứu
  được) — caller BẮT BUỘC phải biết để không làm tiếp giả định sai. CAS-thất-bại =
  đụng độ TẠM THỜI với một lượt khác đã THẮNG TRƯỚC ĐÓ ĐÚNG — bên thắng đã ghi đúng
  ảnh mới, "hai sổ không lệch" đã được BẢO ĐẢM bởi chính bên thắng; bên thua ném tiếp
  không cứu thêm gì mà chỉ đẩy rủi ro crash cho caller không phòng bị (bằng chứng: cả
  `quetDonMoi` (có try/catch per-đơn) và mọi test hiện có (không đơn nào truyền `don`
  cũ) đều AN TOÀN dù ném hay không — nhưng repro chung (KHÔNG do phiếu này sở hữu) thì
  CHỈ an toàn với bản không-ném).
- Giá phải trả: caller nào THỰC SỰ cần biết "lượt của tôi có ghi hay không" phải tự đọc
  `kq.ghi`/`kq.biTuChoiAnhCu` thay vì dựa vào try/catch. Không caller thật nào trong repo
  (đã đọc `nhan-phan-hoi-wa.js`, `lich-nhac.js`, `quet-don-moi.js`) cần phân biệt này —
  tất cả đều tiếp tục đúng dù ghi hay không (POS đã đúng theo bên thắng).

### RF-14 — CAU_QUET + nhánh NHẶT LẠI trong `quetDonMoi()`

- `CAU_QUET` thêm vế `OR trang_thai_he = 'cho_gui_wa'` (vẫn trong ngoặc `nguon =
'trang_ban_hang' AND (...)` — vế `nguon` KHÔNG rơi ra, đo lại bằng test R3-6).
- Trong vòng lặp: `nhatLai = don.trang_thai_he === 'cho_gui_wa'` (đúng nghĩa: dòng này
  đã đứng ở `cho_gui_wa` TỪ TRƯỚC lượt quét — bình thường trạng thái đó chỉ sống trong
  MỘT vòng lặp, đứng qua lượt sau chỉ có một cách giải thích là lượt trước crash giữa
  chừng). `nhatLai` thì bỏ qua bước ①② (đã ở đúng đó), gọi cửa WA lại NGAY.
- Hỏng ở lượt nhặt lại (BẤT KỲ lý do gì, kể cả `LoiSaiNguonDon`/`LoiDonKhongThuocTeam`
  vốn trước giờ bị ném thẳng không đếm) ⇒ đẩy NGAY `cho_sale` + `viec_can_xu_ly`,
  KHÔNG chờ đủ `tranThuLai` lần hai — tái dùng NGUYÊN VẸN hai transition có sẵn
  (`gui_hong` rồi `qua_tran`), không thêm dòng nào vào `BANG_CHUYEN` (không đổi
  `may-trang-thai-don-v1.md` §bảng-chuyển).

**Quyết định KHÔNG hiển nhiên:** vì sao "hỏng lần nhặt lại → escalate NGAY" thay vì
"cho thêm `tranThuLai` lượt nữa"? Đo bằng phép thử ngược: F2 repro dùng đúng 2 lượt
quét (mặc định `tranThuLai=3`) và đòi `viec_can_xu_ly > 0` sau lượt 2. Với trần=3, một
đơn mới cần ĐỦ 3 lần thất bại (qua 3 lượt quét riêng) mới chạm trần — 2 lượt không đủ
dù có tính lại `so_lan_thu_wa` theo cách nào. Suy ra đề bài đòi: **đơn NHẶT LẠI coi như
đã "dùng" một lượt thất bại rồi** (đó là lý do nó đứng ở `cho_gui_wa` chờ nhặt) — hỏng
thêm một lần nữa là đủ lý do giao người, giữ nó quay vòng thêm chính là cái lỗ RF-14 mô
tả ("kẹt vĩnh viễn"/"0 viec_can_xu_ly"). Đã tự verify: R3-4 (nhặt lại rồi THÀNH CÔNG) đi
`da_gui_wa` bình thường — escalate chỉ xảy ra khi nhặt lại mà VẪN hỏng, không phải cứ
nhặt lại là escalate (một ca CHO-QUA thật, bẫy #29).

**Nhánh KHÔNG đổi (nói rõ theo luật 11):** lượt TƯƠI (không phải nhặt lại) gặp
`LoiSaiNguonDon`/`LoiDonKhongThuocTeam` vẫn ném-không-đếm y hệt cũ (giữ `nhatLai` làm
điều kiện rẽ) — đúng khuôn test G8 hiện có (`kq.saiNhanh=1`,
`donSaiNhanh=[LoiSaiNguonDon]`), không mở rộng ra ngoài phạm vi RF-14.

---

## 3 · File KHÔNG đụng dù có lúc cân nhắc

- `src/orders/index.js` — lúc đầu định export thêm `LoiGhiDonAnhCu` qua đây cho gọn,
  nhưng file này NGOÀI pathspec ③ của phiếu ⇒ revert, test tự import THẲNG từ
  `../src/orders/may-trang-thai.js` (đúng tiền lệ có sẵn của
  `l3-m3-lich-nhac.test.js`/`l3-m3-nhan-phan-hoi-wa.test.js`). `git diff --stat` xác
  nhận `index.js` sạch 0 dòng đổi.
- Không đụng `hang-cho.js`/`tao-don.js`/`doc-danh-muc.js` (VA-R2) · `doc-y.js` (VA-R4) ·
  `nhan-phan-hoi-wa.js`/`lich-nhac.js` (đọc để xác nhận tương thích — cả hai đều luôn
  `taiDon()` tươi trước khi gọi `apDung`, không truyền `don` cũ, nên không đụng CAS mới
  — không cần sửa gì ở đó).
- KHÔNG đổi chữ ký `donMessengerDaTao`/`nhanPhanHoi` (VA-R2 đang gọi) — chỉ thêm field
  `ghi`/`biTuChoiAnhCu` vào object trả về (cộng thêm, không phải đổi hình dạng cũ).

---

## 4 · Nghiệm thu

`bash ops/bin/nghiem-thu/va-r3.sh` — rc=0, 4/4 phép ĐẠT:

| #    | Phép                                                                                                                                                                                                                                        | Kết quả           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| ①②A  | `refute-tong-the-1.repro.mjs`, cắt riêng khối F5/F2, đếm `🔴` (KHÔNG đọc rc — bẫy tổng báo 22/08)                                                                                                                                           | F5: `0` · F2: `0` |
| ①②③B | `test/va-r3-cas-nhat-lai.test.js` (R3-1 CAS song song 2 ảnh cùng đọc trước · R3-2 F5-style · R3-3 chuyen() vẫn ném · R3-4 nhặt lại thành công · R3-5 nhặt lại hỏng → escalate · R3-6 CAU_QUET giữ vế nguon · R3-7 per-đơn không hỏng cả lô) | `pass=7 fail=0`   |
| ④    | hồi quy `l3-m1-may-trang-thai` + `l3-m1-quet-don` + `l3-m3-doc-y` + `l3-m3-lich-nhac` + `l3-m3-nhan-phan-hoi-wa` (5 file, 56 ca — KHÔNG neo con số pass tuyệt đối vì `l3-m3-doc-y.test.js` là đất song song VA-R4, chỉ gate cứng ở `fail`)  | `fail=0`          |

Đo lại F5/F2 SAU vá bằng repro gốc (không sửa 1 dòng nào của file này — đúng yêu cầu
"sau vá phải đảo từ đỏ sang xanh"):

```
F5: lượt "het_luot" đi từ ẢNH CŨ → hệ = day_cho_in (POS vẫn 12)   ✅ (trước: cho_sale 🔴)
F2: lượt 2: quet=1 · viec_can_xu_ly của đơn = 1                    ✅ (trước: quet=0/viec=0 🔴)
```

R3-1 lúc đầu viết SAI (hai `apDung(donId,...)` không truyền `don` sẵn) — chạy 5 lượt
phát hiện KHÔNG ổn định: có lượt lỗi ra `LoiChuyenNgoaiBangDon` (tầng `chuyen()` chặn,
vì lượt 1 chạy TRỌN xong trước khi lượt 2 kịp SELECT — pool `max:4` không đảm bảo hai
lượt chồng SELECT thật) thay vì `LoiGhiDonAnhCu` (tầng CAS chặn) — cả hai đều AN TOÀN
(không mất dữ liệu) nhưng là hai lỗi TÊN khác nhau nên assert cứng bị vỡ. Sửa: ép cả
hai lượt dùng CHUNG một ảnh đọc-trước (`don: anh1`/`don: anh2`, cùng khuôn `anhCu` của
chính F5 repro) để loại bỏ độ trôi lịch I/O — đúng bẫy skill #1 "cái thước cũng phải
qua cổng". Giữ lại làm bài học trong nhật ký thay vì xoá dấu vết.

Hồi quy đầy đủ chạy tay 5 lần liên tiếp `test/va-r3-cas-nhat-lai.test.js` — ổn định
7/7 mỗi lần (không phải ca "đỏ ngẫu nhiên xanh lại").

---

## 5 · Kết luận

RF-13 đóng: `ghiDon()` giờ CAS trên `trang_thai_he`, ảnh cũ bị từ chối có tên
(`LoiGhiDonAnhCu`), hai sổ (POS/hệ) không còn lệch được nữa dù có lượt trễ tới sau. RF-14
đóng: đơn kẹt `cho_gui_wa` được `CAU_QUET` nhặt lại ở lượt quét kế tiếp, thành công thì
đi tiếp bình thường, hỏng thì đẩy thẳng người xử kèm dấu vết `viec_can_xu_ly` — không
đơn nào còn "chết câm". Không finding nào cần DỪNG báo tổng; không marker
`[NEEDS CLARIFICATION]` nào để lại (điểm mơ hồ duy nhất — throw hay trả về ở `apDung` —
đã tự đo dứt điểm bằng repro thật, xem §2).
