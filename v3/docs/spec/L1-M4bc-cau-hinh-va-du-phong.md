# [L1-M4b+c] Cấu hình model theo team, kho khoá mã hoá, dự phòng, phễu Sổ AI

## Việc cần làm

Đắp phần còn lại của lớp model lên trên lõi đã có (`L1-M4a`):

- **Cấu hình theo team** — mỗi team ba ô model (chính · dự phòng · nền), độ ngẫu nhiên
  riêng, khoá riêng bốn nhà
- **Kho khoá mã hoá** — khoá API mã hoá khi lưu, không để nguyên văn trong cơ sở dữ liệu
- **Nạp nóng** — đổi model trong cấu hình thì lượt chat kế tiếp đi đúng model mới, **không
  khởi động lại**
- **Dự phòng** — nhà chính lỗi hoặc hết tiền thì tự chuyển dự phòng **dưới 30 giây**, và báo
- **Phễu Sổ AI** — mỗi lượt gọi model ghi được **mã model** ra ngoài
- `goiModel()` — lời gọi duy nhất mà người A dùng (điểm bàn giao #4)

**KHÔNG làm:** màn hình "Model AI & khoá" (giai đoạn 2), A/B so bốn nhà (giai đoạn 2),
sửa lõi ở `L1-M4a` (nếu lõi thiếu gì thì **báo lại**, đừng tự sửa).

## Bối cảnh

- Luồng: L1 — cửa kết nối thứ tư
- Phụ thuộc: **L1-M4a đã nghiệm thu xong** (`bang-model.js`, `goi-mot-lan.js`, `loi.js`, `nha/*`)
- Chạy song song được với: L4-M1 (bảng điều phối)
- Lỗ phải bịt, có thật: ngày 06/08/2026 tài khoản nhà chính hết tiền, bot đứng im **ba
  tiếng** mà không ai biết. Xem thêm `src/llm-health.js` ghi chú đầu file — 08–10/08 còn
  tệ hơn: chết hai ngày, `systemctl` vẫn `active`, dashboard vẫn xanh.

## File được đụng — tạo mới hết

- `v3/src/model/kho-khoa.js` — mã hoá / giải mã khoá API
- `v3/src/model/cau-hinh.js` — đọc/ghi `cau_hinh_model`, bộ đệm nạp nóng
- `v3/src/model/suc-khoe.js` — theo dõi sức khoẻ **theo từng team × từng nhà**
- `v3/src/model/du-phong.js` — chọn model, thử chính rồi chuyển dự phòng
- `v3/src/model/index.js` — `goiModel` · `datPheuSoAi` · `datPheuNhatKy` · `datTaoTruyVan` · `datPheuCanhBao`
- `v3/test/b/model-kho-khoa.test.mjs` · `model-cau-hinh.test.mjs` · `model-du-phong.test.mjs` · `model-goi.test.mjs`

## File CẤM đụng

- `v3/src/model/loi.js` · `bang-model.js` · `chuan-hoa.js` · `goi-mot-lan.js` · `nha/*` —
  **lõi của L1-M4a, đã nghiệm thu. Chỉ import.** Thiếu gì thì báo, đừng sửa.
- `v3/src/auth/boi-canh.js` — hợp đồng với người A, chỉ import
- `v3/testkit/db-gia.js` — nền dùng chung, chỉ dùng
- `v3/src/auth/*` (mọi file khác) · `v3/src/audit/*` · `v3/src/ui/*` — của module khác.
  Cần ghi nhật ký thì **tiêm hàm từ ngoài**, tuyệt đối không `import '../audit/…'`
- `v3/db/*` · `v3/src/db/*` · `v3/src/pos/*` · `v3/src/channels/*` · `v3/src/chat/*` ·
  `v3/src/orders/*` · `v3/src/queue/*` — của người A
- **Toàn bộ `src/` ở gốc repo** · `package.json` · `.env`

## Bảng dữ liệu

- Đọc + ghi: `cau_hinh_model` (mỗi team đúng một dòng)
- Ghi gián tiếp qua phễu: `so_ai` (người A ghi), `nhat_ky` (L0-M4 ghi)
- Điều kiện team: **CÓ**, do cổng truy vấn tự chèn. Module này bắt buộc phải có bối cảnh.

Cột: xem `v3/docs/hop-dong-b-voi-a.md` mục 4.

## Thiết kế bắt buộc

### 1 · `kho-khoa.js`

`AES-256-GCM`. Khoá chủ đọc từ **`V3_KHOA_CHU`** (32 byte, base64).

```js
machHoa(vanBan)   // → { v:1, iv, the, mat }   (base64)
giaiMa(goi)       // → chuỗi
duoiKhoa(vanBan)  // → 4 ký tự cuối, để màn hình nhận ra dán đúng khoá nào
```

- Thiếu `V3_KHOA_CHU` → **ném lỗi ngay lần gọi đầu**. Không tự sinh khoá, không lưu nguyên
  văn. Lưu nguyên văn là đúng cái đang muốn tránh.
- `V3_KHOA_CHU` sai độ dài → ném lỗi, thông điệp nói rõ cần 32 byte base64
- Sửa một ký tự trong `mat` → `giaiMa` ném lỗi (GCM tự bắt)
- Khoá thật **không bao giờ** rời khỏi file này ở dạng chuỗi trả về cho tầng trên, trừ đúng
  chỗ `goi-mot-lan.js` cần để gọi mạng

### 2 · `cau-hinh.js` — và nạp nóng

```js
await docCauHinh(boiCanh)                  // → cấu hình đã giải mã khoá, có bộ đệm
await ghiCauHinh(boiCanh, thayDoi)         // ghi + XOÁ ĐỆM của đúng team đó + ghi nhật ký
xoaDem(teamId)                             // dùng cho test và cho tiến trình khác
await tomTatCauHinh(boiCanh)               // cho màn hình: khoá chỉ còn { daCo, duoi }
```

**Nạp nóng làm thế nào:** bộ đệm theo team, hạn **5 giây**; `ghiCauHinh` xoá đệm của team
đó ngay. Cùng một tiến trình thì đổi xong là lượt kế tiếp đã đúng; nhiều tiến trình thì
chậm nhất 5 giây. Cả hai đều **không phải khởi động lại** — đúng tiêu chí nghiệm thu.

Mặc định khi team chưa có dòng cấu hình: `chinh = kimi-k2.6`, `du_phong = claude-haiku-4.5`,
`nen = deepseek-v4-flash`, `do_ngau_nhien = 0.3`, `do_ngau_nhien_nen = 0.1`.
(Lý do: `kimi-k2.6` là model đang chạy thật; `claude-haiku-4.5` khác nhà nên hết tiền bên
này không kéo theo bên kia — dự phòng cùng nhà với chính là dự phòng giả.)

**Kiểm lúc ghi:** dự phòng **phải khác nhà** với model chính. Cùng nhà → từ chối ghi, kèm
thông điệp nói rõ lý do. Đây là quy tắc nghiệp vụ, không phải sở thích.

Ghi cấu hình → ghi nhật ký `doi_model` (đổi model) hoặc `doi_khoa` (đổi khoá), `truoc`/`sau`
đã che chỗ nhạy cảm.

### 3 · `suc-khoe.js`

Chép cách nghĩ từ `src/llm-health.js` (**chép, không import** — file kia là trạng thái toàn
cục của bản đang chạy). Khác một chỗ căn bản: **theo dõi theo `teamId + nha`**, không phải
một trạng thái toàn cục. Team A hết tiền Kimi thì team B vẫn chạy Kimi bình thường.

```js
ghiNhanOk(teamId, nha)
ghiNhanLoi(teamId, nha, err)     // → true nếu là lỗi tầng tài khoản
dangHong(teamId, nha)            // → bool; cứ 5 phút cho lọt ĐÚNG MỘT lời gọi để dò sống lại
tinhTrang(teamId)                // → cho màn "Sức khoẻ hệ thống"
datDongHo(fn)                    // tiêm đồng hồ để test không phải chờ thật
```

- **Lỗi tầng tài khoản** (401/402/403 hoặc khớp bộ nhận diện ở `loi.js`) → hỏng **ngay lập
  tức**, không đợi đủ ngưỡng. Đây là điều làm cho "chuyển dự phòng dưới 30 giây" thành đúng:
  không phải đo bằng đồng hồ, mà là chuyển **ngay lời gọi tiếp theo**.
- Lỗi thoáng qua → đủ **10 lỗi trong 5 phút** mới coi là hỏng
- Một lời gọi thành công → xoá sạch bộ đếm lỗi và mở lại

### 4 · `du-phong.js`

```js
await goiCoDuPhong({ boiCanh, viec, yeuCau, cauHinh, nhan })
```

Trình tự:
1. Chọn model theo `viec`: `'chot'` → ô chính · `'nen'` → ô nền
2. Nhà đó đang hỏng (`dangHong`) → **bỏ qua luôn**, đi thẳng dự phòng, không tốn một lời gọi
3. Gọi. Thành công → `ghiNhanOk`, trả kết quả
4. Lỗi:
   - **lỗi tầng tài khoản** → `ghiNhanLoi`, chuyển dự phòng **ngay**, không chờ
   - lỗi mạng / 5xx / hết giờ → thử lại **đúng một lần** sau 800 ms, vẫn lỗi thì chuyển dự phòng
   - 4xx khác (400 sai yêu cầu…) → **không** chuyển dự phòng, ném thẳng. Yêu cầu sai thì
     nhà nào cũng sai; chuyển dự phòng chỉ tốn thêm tiền và giấu mất lỗi thật.
5. Chuyển dự phòng → `daChuyenDuPhong: true`, gọi phễu cảnh báo **một lần cho mỗi lần
   chuyển trạng thái** (không phải mỗi lời gọi — 28.469 dòng log của sự cố 08/08 là bài học),
   và ghi nhật ký `chuyen_du_phong`
6. Dự phòng cũng lỗi → ném `LoiCaHaiNhaHong`, ghi nhật ký `lop_model_hong`, cảnh báo mức nặng

Ô **nền** không có dự phòng riêng: hỏng thì lùi về ô chính. Việc nền chậm và đắt vẫn hơn
việc nền không chạy.

### 5 · `index.js` — cửa duy nhất người A dùng

```js
await goiModel({ boiCanh, viec = 'chot', yeuCau, nhan })
// → { traLoi, maModel, nhaCungCap, token, tienUsd, tienVnd, daChuyenDuPhong, doNgauNhien, msChay }

datTaoTruyVan(fn)    // fn(boiCanh) → cổng truy vấn (người A giao)
datPheuSoAi(fn)      // fn(ban) — gọi SAU MỖI lượt, kể cả lượt lỗi
datPheuNhatKy(fn)    // fn(boiCanh, ban)
datPheuCanhBao(fn)   // fn({ muc, thongDiep, teamId, nha, maModel })
```

- `yeuCau.temperature` không truyền → lấy từ cấu hình team (`do_ngau_nhien` hoặc
  `do_ngau_nhien_nen` tuỳ `viec`)
- **Chưa tiêm phễu Sổ AI** → `console.warn` mỗi **100 lượt**, không im lặng và cũng không ồn
- Phễu Sổ AI ném lỗi → nuốt và `console.error`. Sổ hỏng không được làm chết lượt chat.
- `boiCanh` thiếu → ném `LoiThieuBoiCanh`

## Tiêu chí xong — phải đo được

1. `npm test` xanh
2. **Nạp nóng:** gọi `goiModel` (đếm model đã dùng qua `fetchFn` giả) → `ghiCauHinh` đổi
   model chính → gọi lại **trong cùng một tiến trình, không khởi động lại gì** → lời gọi
   thứ hai đi **đúng model mới** — có test
3. **Chuyển dự phòng:** `fetchFn` giả trả `402 insufficient balance` cho nhà chính → lời gọi
   trả về kết quả của **dự phòng**, `daChuyenDuPhong === true`, và **phễu cảnh báo được gọi
   đúng một lần** — có test
4. **Dưới 30 giây:** với đồng hồ giả, từ lúc nhà chính lỗi tới lúc lời gọi kế tiếp chạy bằng
   dự phòng, thời gian trôi **dưới 30.000 ms** (thực tế phải là 0 — chuyển ngay lời gọi tiếp
   theo) — có test đo bằng số
5. Nhà chính đã đánh dấu hỏng → lời gọi sau **không gọi mạng tới nhà chính nữa**
   (`fetchFn` giả không nhận lời gọi nào tới nhà đó) — có test
6. Lỗi `400` sai yêu cầu → **không** chuyển dự phòng, ném thẳng — có test
7. Cả hai nhà hỏng → ném `LoiCaHaiNhaHong`, ghi nhật ký `lop_model_hong` — có test
8. Khoá lưu vào kho là chuỗi mã hoá, `JSON.stringify` bản ghi **không chứa** khoá gốc — có test
9. Thiếu `V3_KHOA_CHU` → ném lỗi, không lưu nguyên văn — có test
10. Ghi dự phòng **cùng nhà** với model chính → bị từ chối — có test
11. Mỗi lượt gọi (kể cả lượt lỗi) đều gọi phễu Sổ AI đúng một lần, bản ghi có `maModel` — có test
12. Truy vấn cấu hình không có bối cảnh → ném lỗi; truyền tay `team_id` team khác → bị chặn,
    có ghi nhật ký — có test
13. `git status` chỉ hiện file trong danh sách "File được đụng"

## Không nằm trong phạm vi

- Màn hình "Model AI & khoá" (nhóm 7, giai đoạn 2)
- A/B đo tiền mỗi đơn giữa bốn nhà (giai đoạn 2) — nhưng dữ liệu để đo **phải** có từ bây
  giờ, đó là lý do bắt buộc ghi `maModel` mỗi lượt
- Hạn mức chi tiêu theo team
- Đếm token trước khi gọi
