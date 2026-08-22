# NHẬT KÝ PHIẾU L3-M3 — Hàng đợi nhắc (2h×5, huỷ khi khách trả lời) + bộ đọc ý 4 nhánh

> Thợ **sonnet** · 23/08/2026 · base phiếu `31172e1`, cây lúc khởi công `09d4704` (sạch,
> đã gồm L3-M2 ✅ + VA-P1 ✅ + VA-Q12 migration 006 song song) · làn 🟥 · nghiệm thu:
> `bash ops/bin/nghiem-thu/l3-m3.sh` → **23 phép ĐẠT / 0 trượt / 0 hoãn**;
> `node --test test/l3-m3-*.test.js` → **28/28**; hồi quy `l3-m1`+`l3-m2` gộp → **94/94**.

---

## 0 · Mục ⑦ của phiếu — ĐÃ TRA (dán lại, phiếu đã tự tra trước khi giao)

Phiếu ⑦ khai sẵn: "Bàn giao máy §5: deps `huyLichNhac` đang no-op `{camChua:false}` CHỜ
ĐÚNG phiếu này — quan hệ: thi-hành-chỗ-chờ. `lich_nhac` chưa ai ghi (luoc-do). Không trùng
phiếu nào." Đo lại độc lập bằng cách đọc trọn §9 sổ điều hành (22/08→23/08, tới hết entry
L3-M2 nợ Q3) trước khi code: xác nhận đúng — không phiếu nào khác chạm `lich_nhac`, và
`huyLichNhac` no-op vẫn nguyên trong `may-trang-thai.js` lúc khởi công.

## 1 · Vì sao KHÔNG hook `quet-don-moi.js` — quyết định kiến trúc số một

Pathspec ③ cấm đụng `may-trang-thai.js`/`quet-don-moi.js`. Đọc kỹ hai file đó (bước 3 của
skill — đo lại nguyên liệu trước khi code) xác nhận: **không có điểm cắm nào** để "đặt
lịch khi đơn vào `da_gui_wa`" mà không sửa `quet-don-moi.js`. Hai lối ra:

- (A) mở phiếu xin sửa `quet-don-moi.js` thêm một dòng gọi hook — chặn công việc, đợi
  TỔNG duyệt vượt pathspec.
- (B) `quetLichNhac` (file của phiếu này) tự quét `don_hang WHERE trang_thai_he='da_gui_wa'
AND NOT EXISTS (lich_nhac...)` mỗi nhịp (5 phút) — TỰ PHÁT HIỆN đơn cần đặt lịch, không
  cần ai gọi nó.

Chọn **(B)**: cùng triết lý với chính `quet-don-moi.js` ("job nền tự quét, không chờ ai
gọi"), không cần vượt pathspec, và độ trễ phát sinh (tối đa một nhịp quét ~5 phút giữa lúc
đơn vào `da_gui_wa` và lúc lịch đầu tiên được tạo) là chấp nhận được so với chu kỳ nhắc
2 giờ. Đã ghi rõ trong `docs/v3/ban-giao/may-trang-thai-don-v1.md` §lịch-nhắc để người sau
khỏi đoán lại.

## 2 · Mô hình dữ liệu: MỖI LẦN NHẮC LÀ MỘT DÒNG, không phải một dòng tự tăng `lan_thu`

`lich_nhac.lan_thu` (1..5, CHECK sẵn trong migration 001) đọc như số thứ tự CỦA DÒNG ĐÓ,
không phải một bộ đếm mutate trên một dòng duy nhất. Lý do chọn cách này thay vì UPDATE
một dòng: (a) khớp đúng nghĩa cột `hen_luc` (`timestamptz NOT NULL`, không nullable) — một
dòng "đã gửi" vẫn giữ nguyên `hen_luc` LỊCH SỬ của chính lần đó, không bị ghi đè bởi lần
kế tiếp; (b) đếm "đã nhắc mấy lần" = `count(*) FROM lich_nhac WHERE don_hang_id=? AND
trang_thai='da_gui'` — không cần đọc một cột đếm riêng có thể lệch khỏi log thật.
④#1 đo đúng thiết kế này: sau khi hết 5 lượt, đếm DÒNG của đơn phải = 5 (không phải đọc
`lan_thu` của MỘT dòng = 5).

## 3 · `so_lan_thu_wa` của `don_hang` — KHÔNG tái dùng cho hàng đợi nhắc (tự quyết, luật 11)

Phiếu ②#1 viết "gửi nhắc qua `guiTinMau` (mẫu nhắc riêng, ghi `so_lan_thu_wa`)". Đo lại
nguyên liệu (bước 3 skill): `don_hang.so_lan_thu_wa` là cột CỦA MIGRATION 004, chủ đọc là
`quet-don-moi.js` (`TRAN_THU_LAI=3`, đếm lượt THỬ LẠI gửi mẫu XÁC NHẬN LẦN ĐẦU khi đơn còn
ở `gui_wa_loi`) — một cơ chế khác hẳn về ý nghĩa và về TRẦN (3 so với 5 của phiếu này). Ghi
đè cột đó cho cả hai mục đích sẽ làm hai trần giẫm lên nhau (đơn thử lại 2 lần lúc gửi đầu
rồi vào `da_gui_wa` với `so_lan_thu_wa=2` có sẵn — nếu dùng chung cột, vòng nhắc thứ 3 sẽ
bị tính nhầm là đã "hết lượt"). **Quyết định: KHÔNG đụng `don_hang.so_lan_thu_wa`** — đếm
lượt nhắc bằng chính số DÒNG `lich_nhac` của đơn (xem §2). Đọc "ghi `so_lan_thu_wa`" trong
phiếu như một cách nói chung chung "ghi lại số lần đã thử", không phải tên cột đích danh.
Tự quyết theo luật 11 (ghi rõ giả định tại chỗ quyết, không cắm marker chờ hỏi vì đã có đủ
chứng cứ đo được để tự tin): cột `so_lan_thu_wa` mang ràng buộc gắn chặt với `gui_wa_loi`
(bất biến migration 004 — CHECK `ly_do_khong_gui IS NULL OR trang_thai_he='gui_wa_loi'`
đứng cạnh nó cùng một ALTER), dùng sai domain cho một cơ chế khác hẳn về trần là một lỗi
tiền, không phải một cách đọc hợp lý của câu chữ phiếu.

## 4 · HUỶ NGAY — `nhanPhanHoi` (L3-M1) chỉ tự huỷ 2/4 nhánh, bù ở `nhan-phan-hoi-wa.js`

Đo lại (bước 3 skill, không tin lời tả trong bàn giao): `may-trang-thai.js#nhanPhanHoi` gọi
`deps.huyLichNhac` ở dòng 466 (`tu_choi`) và dòng 497 (`xac_nhan`) — **KHÔNG** gọi ở nhánh
`doi_sua`/`khong_ro` (dòng 476-494). Xác nhận thêm bằng chính gate của L3-M1
(`ops/bin/nghiem-thu/l3-m1.sh` ④c in `huyGoi=2` trên bốn nhánh test) — hành vi này đã
CHỐT + có cổng riêng, án lệ #25 cấm lật. Nhưng 02 §L3 nghiệm thu nguyên văn "Khách trả lời
**giữa chừng** → lịch nhắc bị huỷ ngay" — không giới hạn kiểu trả lời. Xử: `nhanPhanHoiWa`
(file của phiếu này, KHÔNG đụng `nhanPhanHoi`) tự gọi bù `huyLichNhac(donId)` thêm một lượt
cho `doi_sua`/`khong_ro` sau khi `nhanPhanHoi` trả về. An toàn vì `huyLichNhac` idempotent
(④#4) — nhánh `xac_nhan`/`tu_choi` bị gọi "thừa" từ góc nhìn tổng lượt gọi không sao, đo
được rõ ràng (`huyLichNhacThem` chỉ populated ở hai nhánh cần bù, test N4 xác nhận). Nói rõ
theo luật 13: đây là một PATCH Ở TẦNG CẦU NỐI cho một hành vi đã chốt ở tầng dưới, không
phải sửa lỗi L3-M1 — giá phải trả là logic "huỷ lịch" nằm rải ở hai tầng thay vì một, nhưng
sửa tầng dưới thì phạm án lệ #25 (đụng file phiếu khác đã ✅ + có gate riêng).

## 5 · Cửa ghi hẹp THỨ NĂM — nói ra, không giấu

`suaTheoId` (L0-M2) không hỗ trợ `ctxHeThong()` — job quét lịch bắt buộc chạy dưới
`ctxHeThong` (tin WA tự động tới, không có người đăng nhập). Repo đã có BỐN đường ghi hẹp
tương tự (`suaTheoId` gốc, `suaTheoIdPos` của L1-M1, `ghiDon` của L3-M1, `CAU_GHI_CHAM` của
L3-M2/`ti-le-hoan.js` — xem §9 sổ điều hành các nợ N3/P3, lặp lại lần thứ tư ở L3-M2). Phiếu
này thêm cửa hẹp **thứ NĂM**: `ghiLich` trong `src/orders/lich-nhac.js` (UPDATE hẹp,
allow-list đúng hai cột `trang_thai`/`huy_ly_do`, luôn kẹp `team_id`). Bản vá đúng không đổi:
`suaTheoId` cho `ctxHeThong()` rồi gộp cả năm về một — ngoài pathspec phiếu này.

## 6 · docY — luật từ khoá + bẫy đã tự bắt trước khi nộp

Bộ ca ≥16 câu (≥4/nhánh, AR/EN/PH) tự dựng theo ④#3 rồi CHẠY THẬT trước khi viết test chính
thức (khuôn "cái thước cũng phải qua cổng" — bước 4 skill). Hai bẫy tự bắt được ngay ở lượt
đầu:

1. **So substring trần khớp nhầm** — "no" khớp bên trong "know"/"cannot" nếu không có biên
   từ. Vá: đệm khoảng trắng hai đầu chuỗi rồi so `" tu_khoa "` thay vì `.includes(tu_khoa)`
   trần (test Y4 canh lại).
2. **Dấu nháy đơn bị bộ chuẩn hoá xoá nhầm** — `RE_DAU_CAU` ban đầu gồm cả `'`, biến
   "don't want" thành "don t want" và làm khớp cụm từ trượt (ca thật: "I don't want it
   anymore" đọc SAI ra `khong_ro` thay vì `tu_choi`). Vá: bỏ `'` khỏi tập ký tự bị thay —
   giữ nguyên nghĩa rút gọn tiếng Anh. Cả hai bẫy đã ghi thành comment tại chỗ trong
   `doc-y.js`, không chỉ sửa âm thầm.

`do_tin` (0 / 0,5 / 1) là một quyết định khai THÊM ngoài chữ nguyên văn của phiếu (phiếu chỉ
nói "→ {ket_qua, do_tin}" mà không định nghĩa thang đo) — tự chọn: 1 = đúng một nhánh khớp
rõ, 0,5 = ≥2 nhánh khớp mâu thuẫn (có tín hiệu nhưng không đoán được), 0 = rỗng/không khớp
gì. Ghi rõ theo luật 11, không đoán ngầm.

## 7 · Ba lỗi THƯỚC tự bắt ở CHÍNH cổng nghiệm thu (án lệ #1, #15 skill)

Trước khi cổng `l3-m3.sh` xanh, tự bắt và tự vá ba lỗi ở CÂU ĐO, không phải ở code
nghiệp vụ — dán lại làm bằng chứng, không chỉ nói "đã sửa":

1. **Test tự-nhiễm-nhau qua job quét TOÀN CSDL** — `quetLichNhac` quét GLOBAL (đúng thiết
   kế thật), nhưng bộ ca `test/l3-m3-lich-nhac.test.js` dùng CHUNG một sandbox cho cả 9
   ca; lịch `cho` một ca trước để lại bị ca sau (đồng hồ giả luôn "muộn hơn") nhặt nhầm —
   đo được: ca L5 kỳ vọng `guiTinMau` gọi 0 lần ở vòng đầu nhưng ra 3 (rác của L1/L2/L4).
   Vá: hàm `donSachHangDoiCho()` dọn `lich_nhac` trạng thái `cho` trước MỌI ca có gọi
   `quetLichNhac` toàn cục — cách ly test, giữ nguyên hành vi quét-toàn-cục của code thật.
2. **Bash single-quote không hỗ trợ escape** — `HELPER='...trang_thai=\'cho\'...'` trong
   `l3-m3.sh` (SQL literal nháy đơn lồng trong khối bash nháy đơn) làm bash cắt đứt chuỗi
   giữa chừng → `syntax error near unexpected token '('`. Vá: THAM SỐ HOÁ câu SQL
   (`$1,$2,$3` thay vì literal nháy đơn trần) — né hẳn lớp lỗi này thay vì dùng khuôn
   `'"'"'` (vẫn có ở khối docY vì đó là chuỗi JS cần dấu nháy thật).
3. **Đóng ngoặc thừa một dấu `"`** — năm khối `nodex("${HELPER}"'...')` đều đóng bằng
   `');'")"` (thừa một `"`) thay vì `');')"` đúng — làm bash "unexpected EOF" ở dòng hoàn
   toàn khác chỗ lỗi thật (khuôn tay đầu tiên chép sai, replace_all một lượt cho cả 5 chỗ
   sau khi xác định đúng mẫu).

## 8 · Nhánh test KHÔNG chạm (khai theo bước 4 skill)

- **Gửi WhatsApp THẬT** (HTTP thật qua Pancake) và **poll/webhook đọc tin THẬT** — cả hai
  đều thuộc §7b (T1 nối H1, H2 là việc NGƯỜI). Interface `nhanPhanHoiWa(pool, ctx, {donId,
text}, deps)` đã đúng hình dạng để cutover chỉ cần đấu nguồn thật, không đổi chữ ký —
  không có mục nào cần in `⏸ HOÃN` ở cổng vì phiếu KHÔNG hứa hai việc đó (khác L1-M3/L3-M1).
- **Mẫu tin thật được Meta duyệt** — `BANG_MAU_TIN` vẫn `Object.freeze({})` (nợ đã biết từ
  L1-M3), nên `MAU_NHAC` mới chỉ được ĐO đúng TÊN/route, chưa từng gửi thật.

## 9 · Đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l3-m3.sh
node --test test/l3-m3-doc-y.test.js test/l3-m3-lich-nhac.test.js test/l3-m3-nhan-phan-hoi-wa.test.js
node --test test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js test/l3-m2-loc-trung.test.js test/l3-m2-ti-le-hoan.test.js  # hồi quy
```

Kết quả lượt nộp: cổng **23/23 ĐẠT · 0 TRƯỢT · 0 HOÃN**; bộ ca l3-m3 **28/28**; hồi quy
l3-m1+l3-m2 **66/66** (94/94 khi chạy gộp). Migration 006 (`status_history`, phiếu VA-Q12,
song song) đã áp trong lúc đo — không đụng schema `don_hang`/`lich_nhac` mà phiếu này cần,
không ảnh hưởng. `aicloser_v3` dev còn nguyên 0 dòng `lich_nhac` (cổng ⑥b), 26 đơn thật
không bị đụng.
