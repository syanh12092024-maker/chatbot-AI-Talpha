# PHIẾU B-Y5 — Cửa ĐỌC không ghi nhật ký cho `ctxHeThong()`

**Base:** `14845fd` · **Làn:** 🟨 (không phải đường tiền, nhưng nó **làm hỏng công cụ điều
tra**: `nhat_ky` là bảng chỉ-thêm, và nó đang bị lấp bởi những dòng không ai cần)

> Phiếu do **người B** phát, xin **người A** làm — `src/db/truy-van.js` là đất của A.

---

## ① Thi hành đoạn spec nào

- `docs/v3/01-QUYET-DINH.md` §9 — *"Nhật ký ghi đầy đủ, không sửa không xoá, ghi cả việc máy làm"*
- `docs/v3/gd2/00-KE-HOACH-GD2.md` sóng 3 — màn **Nhật ký thao tác**, *"ghi cả việc máy làm"*
- `src/db/truy-van.js#ghiNhatKyHeThong` — chỗ đang ghi

## ② Hợp đồng vào/ra

### Vào — A phải ĐO LẠI

`src/db/truy-van.js` ghi **một dòng `nhat_ky` cho MỖI lượt gọi** đi qua `ctxHeThong()`:

```js
if (resolved.laHeThong) await ghiNhatKyHeThong(pool, resolved.teamId, "doc", tenBang);
```

Với **job nền ghi dữ liệu** thì đó là luật đúng và phải giữ. Nhưng `src/chat/rap-prompt.js`
dùng `ctxHeThong()` cho **bốn bộ ĐỌC khối prompt**, và màn `Prompt của page` (G2-C3) gọi
đúng bốn bộ đó để hiện prompt thật. Kết quả đo trên `aicloser_v3` hôm nay:

```
$ (mở màn Prompt của page cho 3 page — CHỈ XEM, không sửa gì)
$ psql -c "SELECT hanh_dong, tac_nhan, doi_tuong, count(*) FROM nhat_ky GROUP BY 1,2,3"
 doc | may:tang-truy-van | san_pham      | 6
 doc | may:tang-truy-van | ky_nang       | 3
 doc | may:tang-truy-van | bo_luat_chung | 3
 doc | may:tang-truy-van | kich_ban      | 3
```

**15 dòng nhật ký cho ba lượt XEM.** (B đã sửa phần của mình: đọc `san_pham` một lần thay
vì hai, nên nay là 4 dòng/lượt chứ không phải 5.)

### Cái giá, nói bằng số

Team `tieu-alpha` có **514 page**. Một người lướt qua danh sách để soi prompt là **~2.000
dòng `doc`**. Và:

- `nhat_ky` có trigger `tg_chi_insert_nhat_ky` — **không sửa, không xoá, kể cả chủ CSDL**.
  Những dòng này nằm đó vĩnh viễn.
- Màn **Nhật ký thao tác** (sóng 3) lọc theo `hanh_dong`. Với tỉ lệ hiện tại, mỗi dòng
  «ai bật bot cho page nào» bị chôn dưới hàng trăm dòng `doc` vô nghĩa.
- Đây là **hỏng công cụ điều tra**: `nhat_ky` sinh ra để trả lời «ai làm gì, lúc nào». Một
  cuốn sổ mà 99% số dòng là «có người mở ra xem» thì không ai đọc nó nữa.

⚠️ **KHÔNG phải lỗi của bên nào.** Luật «ghi cả việc máy làm» đúng cho *job nền ghi dữ
liệu*. Cái mới là một màn XEM đi qua cùng cửa đó — người A không thể lường trước khi viết
`layNhieu`, và người B không thể tránh mà không tự viết lại bộ đọc (xem ⑥).

### Ra — nói bằng câu đo được

B đề xuất **đường 1**:

1. **`ctxHeThong({ ghiNhatKy: false })`** — cửa thoát job nền nhận một cờ tắt ghi. Mặc định
   `true`, giữ nguyên mọi hành vi hiện có; chỉ nơi gọi khai rõ «đây là đường XEM» mới tắt.
   Ba dòng ở `src/db/boi-canh.js` + một điều kiện ở `truy-van.js`.
2. Hoặc: **chỉ ghi cho lệnh GHI**, không ghi cho `layNhieu`/`layMotTheoId`. B **không đề
   xuất** — nó đổi hành vi của mọi nơi gọi hiện có, kể cả những chỗ đang cần dấu vết đọc.
3. Hoặc: gộp — ghi **một dòng cho mỗi phiên xem**, không phải mỗi bảng. Đúng hơn về ngữ
   nghĩa nhưng cần một khái niệm «phiên» mà tầng truy vấn chưa có.

## ③ File được đụng (pathspec)

```
src/db/boi-canh.js
src/db/truy-van.js
test/l0-m2-truy-van.test.js
```

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# 1 · đếm trước, xem 3 page, đếm sau — chênh phải bằng 0
psql "$DATABASE_URL_V3" -tAc "SELECT count(*) FROM nhat_ky;"      # ghi lại N
#   (mở /prompt-page cho 3 page qua cổng 3102)
psql "$DATABASE_URL_V3" -tAc "SELECT count(*) FROM nhat_ky;"      # kỳ vọng: vẫn N

# 2 · job nền GHI thì VẪN phải để lại dấu vết — không được tắt nhầm chỗ
#   (chạy một job nền có ghi, ví dụ đồng bộ POS)
psql "$DATABASE_URL_V3" -tAc "SELECT count(*) FROM nhat_ky WHERE tac_nhan LIKE 'may:%';"
# kỳ vọng: TĂNG

# 3 · mặc định KHÔNG đổi: gọi ctxHeThong() không tham số vẫn ghi như cũ
node --test test/l0-m2-truy-van.test.js                            # kỳ vọng: N passed
```

## ⑤ Test chạm nhánh nào

1. `ctxHeThong()` không tham số → vẫn ghi (mặc định không đổi)
2. `ctxHeThong({ ghiNhatKy: false })` + `layNhieu` → **0 dòng nhật ký**
3. `ctxHeThong({ ghiNhatKy: false })` + `themMoi` → **vẫn ghi**, vì đó là lệnh GHI
   (⚠️ nhánh này quan trọng nhất: cờ tắt phải chỉ tắt cho ĐỌC, không tắt cho GHI)
4. `ctx` thường (không phải hệ thống) → không đổi gì

## ⑥ Ngoài phạm vi

- **B tự viết lại bốn bộ đọc khối để tránh `ctxHeThong`** — B đã cân nhắc và **TỪ CHỐI**:
  bản khác thì màn «Prompt của page» hiện một prompt **khác cái bot thật sự gửi**, mà đó
  đúng là thứ màn đó sinh ra để loại trừ. Hỏng nặng hơn hẳn vấn đề đang xin vá.
- Dọn ~15 dòng `doc` đang có → **không làm được**, `nhat_ky` cấm xoá ở tầng CSDL. Cứ để.
- Màn «Nhật ký thao tác» lọc bỏ `hanh_dong='doc'` ở phía hiển thị → **cách chữa triệu
  chứng**, B sẽ làm ở sóng 3 như một lớp đỡ, nhưng nó không thay được phiếu này: bảng vẫn
  phình, và ai truy vấn thẳng CSDL vẫn gặp đúng đống rác đó.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "ghiNhatKyHeThong" src/db/truy-van.js
149:async function ghiNhatKyHeThong(pool, teamId, hanhDong, tenBang) {
191:    await ghiNhatKyHeThong(pool, resolved.teamId, "doc", tenBang);
...

$ grep -c "ctxHeThong" src/chat/rap-prompt.js
6

$ psql -tAc "SELECT hanh_dong, count(*) FROM nhat_ky GROUP BY 1"
doc|15
```

**Quan hệ: MỚI.** Không trùng nợ nào trong §9, không trùng phán quyết đang treo. Khác hẳn
`PHIEU-B-Y1` (nới `suaTheoId`) và `PHIEU-B-Y3` (chuyển page) — cùng file `truy-van.js` nhưng
khác việc và khác hàm.
