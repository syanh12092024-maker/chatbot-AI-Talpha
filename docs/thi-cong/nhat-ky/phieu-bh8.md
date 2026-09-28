# Nhật ký phiếu BH8 — hai bản: người đọc tiếng Việt, model đọc tiếng Anh gọn

28/09/2026 · base `32f645b` · trạng thái: **PHẦN CODE XONG — phần ĐO chờ hạn mức Kimi**.

## Đo lại trước khi code (bước 3)

- `kich_ban` đã có hai cột `noi_dung_nguoi` + `noi_dung_may`; màn Kịch bản đã lưu cả hai
  (`kho-kich-ban.js#luuBanNhap`). Nhưng `noi_dung_may` chỉ là khuôn tiếng Việt ghép từ
  `dungBanChoMay`, và bộ ráp prompt KHÔNG đọc nó (`rap-prompt.js` lấy `noi_dung_nguoi`
  làm `config`, `buildSystem` dựng lại).
- Đường LIVE thật của bản cũ là `kb-overrides.json` qua `dayKichBanLenBot` ⇒ BH8 chỉ đổi
  đường v3 (`rapKb`); bản đang chạy (v2) vẫn dựng tiếng Việt từ `config` — không đổi.
- `dungBanChoMay` còn câu song sinh «khách mới nhắn» mà BH7 bỏ sót; và
  `v3/test/b/kich-ban.test.mjs` có bản CHÉP TAY thứ ba của hàm đó — cũng mang câu cũ, test
  vẫn xanh. Thay bằng import thẳng.
- Team 1 dev không có `bo_luat_chung` riêng ⇒ CORE hằng là thứ model đọc.

## Quyết định + đánh đổi

- **Bộ dịch là mối nối RIÊNG** (`datDichBanMay`), chạy SAU hàm dựng. Bản đầu truyền `bc`
  làm tham số thứ hai của `_dungBanMay` ⇒ `dungBanChoMay(cfg, va)` coi đó là hàm lọc chữ và
  sập 13 ca — bộ ca kich-ban bắt được NGAY khi đổi sang import hàm thật. Không đổi chữ ký
  hàm dựng.
- **Dịch hỏng không chặn lưu**: model lỗi / trả rỗng / kiểm lệch ⇒ bản máy = khuôn tiếng
  Việt như trước BH8, `banMayLaTiengAnh:false`, cảnh báo ra log. Chọn thay «từ chối lưu» vì
  marketer không làm gì được với một lỗi của nhà cung cấp.
- **Kiểm giữ nguyên văn**: số so HAI chiều (bản dịch thêm số = bịa giá); URL; câu trong
  ngoặc không chứa chữ riêng tiếng Việt phải có nguyên văn. Câu trong ngoặc CÓ chữ Việt
  («chốt đơn», «<tổng tiền>») là nhãn nội bộ — được dịch.
- **Dấu `DAU_BAN_MAY`** thay migration `bam_nguoi` (xem «Lệch» trong phiếu).
- **CORE EN dịch tay, trung thành** — không đổi luật (việc đổi luật là BH3). Ký tự EN 8.841
  > VI 7.735 nhưng token EN/ký tự thấp hơn nhiều — số token THẬT chờ đo.
- **Thời gian chờ lời gọi dịch 120s** (mặc định `layModel` 30s): dịch kịch bản Minty ra
  ~3.200 ký tự; lần đầu lỗi «fetch failed» đúng ở mốc 30s trong khi lời gọi ngắn cùng khoá
  chạy 1s. Nới qua tham số `goi` sẵn có của `layModel`, không sửa `layModel`.

## Thước

- `test/bh8-hai-ban.test.mjs` 11 ca (mẩu kịch bản Minty thật). Đảo-vá, mỗi đột biến một
  tiến trình mới — cả 5 đều đỏ đúng ca:
  | đột biến | ca đỏ |
  |---|---|
  | kiểm nguyên văn luôn `ok:true` | H2 H3 H4 H5 H7 |
  | bỏ qua kết quả kiểm trong `dichBanMay` | H7 |
  | `buildSystem` không đọc bản máy | H8 |
  | câu chào song sinh lệch | H11 |
  | `CORE_VI_BAM` lệch | H10 |
- `v3/test/b/kich-ban.test.mjs` +2 ca (nối bộ dịch → lưu bản EN; bộ dịch ném → giữ VI).
- `l4-prompt`: 14 nguyên tắc đối chiếu trên CẢ `CORE_VI` và `CORE` (bảng mẩu EN mới);
  THẨM QUYỀN ở cả hai; trần ký tự `CORE_VI` 7.800, `CORE` EN 9.000.
- `l2-m3` ⑥: seed `bo_luat_chung` v1 = `CORE_VI` (màn Bộ luật là chỗ người duyệt).
- `ops/bin/nghiem-thu/bh8.sh` 12/12 · `npm test` **2.114 pass / 0 fail**.

## Chạy thật trên dev

- `ops/bin/dich-ban-may.mjs --page 1220547807799752 --that`: Minty LIVE v6 (kich_ban #6)
  dịch QUA kiểm — mọi câu mẫu Tagalog/English, `11 PM`, `2-5 days`, `wa.me/971543610815`
  giữ nguyên; câu chào 4 dòng ✅ của marketer giữ nguyên văn nhưng mang nhãn «ONLY for the
  VERY FIRST message». Bản Việt 2.962 ký tự → bản máy 3.251 ký tự (kể cả dấu).

## CHƯA ĐO — chờ hạn mức

`dem-token-kimi.mjs` dừng ở lời gọi đầu: «⛔ Chạm hạn mức token NGÀY». Tổ chức Moonshot
chạm trần 1,5 triệu token/ngày lần hai trong ngày 28/09 (lần đầu lúc đo BH7). Còn phải đo,
theo phiếu ④:
1. `dem-token-kimi.mjs --page 1220547807799752` (6 lời gọi) — token thật CORE EN / tools /
   kịch bản EN; điểm cache dự kiến + phần lẻ (mục ②.6 canh điểm cache làm SAU số này).
2. `gia-lap-mot-minh.mjs --kho … --chi <30 lượt>` × 3 lượt — đ/lượt, phần không-cache,
   ngôn ngữ trả lời, `PRICE_MISMATCH`, ký tự p50.
