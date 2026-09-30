# Nhật ký phiếu VE-VA1 — «tên chưa khai»: ba lỗi sống trên prod mà không thước nào chạm (30/09/2026)

> Vá · làn 🟨 (một lỗi ở màn Cài đặt › Người và team: tạo người dùng · chuyển page giữa team = QUYỀN / DỮ LIỆU) · base `6f4be3b` ·
> commit `557fbd9` · Đụng bộ não: không.

## Tìm ra thế nào

Agent dò nguồn cho VE6 báo `bao-cao.html` dùng `T` không khai trong `tai()`. Kiểm lại: đúng — `T` chỉ là THAM SỐ của
`veThuoc(m, T)`. Lỗi đến từ commit `89c847b` (25/09, «rà lời TÁM màn») ⇒ không vá lẻ một chỗ mà QUÉT cả lớp lỗi: cài tạm ESLint 8
vào scratchpad (KHÔNG thêm gói vào dự án), tách script nội tuyến của 35 trang, luật `no-undef`:

| # | Tệp · dòng | Tên | Từ | Hệ quả trên prod |
|---|---|---|---|---|
| ① | `bao-cao.html` 142–144 | `T` | 25/09 `89c847b` | MỌI lượt tải thành công ném → ô lỗi «Không đọc được báo cáo — **Chưa lấy được số từ tiến trình bot**»: Số liệu › Tổng quan chưa hiện số lần nào từ 25/09, và câu lỗi đổ oan cho bot |
| ② | `cau-hinh-team.html` 231 | `nap` | 15/09 `53289117` | tạo người dùng xong ⇒ hộp báo «nap is not defined», danh sách không tải lại (người dùng VẪN được tạo — POST đi trước) |
| ③ | `cau-hinh-team.html` 391–392 | `tuKhoTam` | 17/09 `c7eabe1b` | «Chuyển page đã chọn» / «Kéo page đã chọn về» ném TRƯỚC khi gửi ⇒ chưa lượt chuyển page nào qua được bằng màn |
| — | `van-hanh.js` 757 | (phân tích) | — | BÁO NHẦM: tệp nạp `type="module"` ⇒ `await` ngoài cùng hợp lệ; quét lại chế độ module: sạch |

Vì sao sống lâu: bộ ca đo CẤU TRÚC trang; lượt bò e2e không bấm «tạo người dùng» / «chuyển page», và `/api/bao-cao` trả 502 trong
sandbox (gọi bot cũ) nên không bao giờ tới nhánh tải thành công.

## Làm gì

- ① `const T = d.thuoc;` (máy chủ luôn trả `thuoc` ở cả hai nhánh `manBaoCao`).
- ② hàm tự chạy `(async function nap(){…})()` ⇒ `async function nap(){…}` + `nap();`.
- ③ `chuyen()` tự tính `tuKhoTam = NGUON_PAGE === 'chua-phan'` — ĐÚNG nguồn `veGanPage()` dùng (nguồn đang xem; đổi nguồn là vẽ lại).
- Công cụ `ops/bin/quet-ten-chua-khai.mjs`: cùng phép quét, chạy lại được; ESLint do người chạy chỉ ra (`ESLINT_BIN`), thiếu thì
  rc=2 HOÃN — KHÔNG đọc là đạt. Kiểm công cụ: đưa lại lỗi ① ⇒ rc=1 đúng ba dòng; khôi phục khớp băm.

## Thước

`v3/test/b/va1-ten-chua-khai.test.mjs` — CHẠY THẬT script trang trong `vm` trên DOM giả, tới đúng nhánh từng nổ: R1 (Tổng quan tải
thành công ⇒ không ô lỗi, ba thước được vẽ; payload dựng bằng `manBaoCao` thật) · R2 đối chứng (máy chủ trả lỗi ⇒ màn vẫn nói lỗi) ·
T1 (tạo người dùng ⇒ không «is not defined», có nạp lại) · T2 (chuyển page ⇒ POST `/api/team/gan-page` mang `tuKhoTam=false`,
`lyDo` đúng). Trên mã CHƯA sửa: R1 · T1 · T2 đỏ đúng câu lỗi thật («T is not defined» · «nap is not defined» · «tuKhoTam is not
defined»), R2 xanh.

## Đảo-vá — 4/4 đỏ

M1 bỏ khai `T` · M2 `nap` về hàm tự chạy · M3 `chuyen` bỏ khai `tuKhoTam` · M4 `tuKhoTam` tính ngược nguồn.

## Nợ

- **N-NOUNDEF** (mới): lưới `no-undef` THƯỜNG TRỰC cần ESLint là devDependency của dự án (đổi `package.json` ⇒ xin người quyết).
  Tới lúc đó phép quét chỉ chạy khi có người đặt `ESLINT_BIN` (cổng `va1.sh` ③ nói HOÃN, không giả đạt).

## Đo

- Cổng `ops/bin/nghiem-thu/va1.sh` (có `ESLINT_BIN`): ĐỎ 0 / XANH 7 · quét 35 script trang (1 module): 0 tên chưa khai.
- `npm test` (dev, sandbox): **2.328 ca · 2.324 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0.
