# NHẬT KÝ PHIẾU BH1 — giá do SERVER tính · hội thoại đã CHỐT bị khoá · van READONLY

Ngày 16/09/2026 · base `0c6c1ed` · cổng `ops/bin/nghiem-thu/bh1.sh` **10/10** ·
bộ ca `test/bh1-gia-va-cua-chot.test.js` **26/26** · `npm test` **1795/1798** (D7 đỏ sẵn,
nợ dữ liệu 25/08; đo hai lượt liên tiếp đều 1 fail).

---

## 1 · Ba lỗi phiếu này đóng, và vì sao chúng sống được lâu thế

| | Lỗi | Sống được vì |
|---|---|---|
| C1 | tổng tiền đơn là **tham số model tự điền**, đi thẳng vào `shipping_fee` = tiền người giao hàng thu của khách | luật chống bịa giá nằm trong PROMPT (`CORE §6`), mà prompt là lời dặn, không phải cái cửa |
| C2 | hội thoại đã chốt **không bị khoá**: `markClosing()` ghi `orderAt` từ lâu nhưng `grep orderAt src/*.js` chỉ ra chỗ GHI, không có chỗ ĐỌC | `decideConv` xét `HANDOFF` và `POST_SALE`, quên `CLOSING` — mà bảng quyền nói §6.3 khai rõ CLOSING thì AI ⛔ |
| C3 | `PANCAKE_READONLY` kiểm ở vòng poll, không ở chỗ bắn ra mạng | `grep PANCAKE_READONLY src/pancake.js src/messenger.js` = 0 dòng |

Cả ba nằm trong nhóm file **cấm sửa** của luật 4 cũ. Đó là lý do chúng chưa từng được vá,
và là lý do người quyết đổi luật 4 hôm nay.

## 2 · Hai QUYẾT ĐỊNH thu hẹp so với phiếu, khai rõ (luật 11 skill)

**(a) Cửa tiền chỉ chặn SỐ SAI, KHÔNG chặn THIẾU SỐ.**
Phiếu ④ G4 viết «page không có bảng giá → fail-CLOSED, không tạo đơn mù». Đo lại nguyên
liệu trước khi code (đúng bước 3 skill `tho-thi-cong`) thì thấy làm đúng chữ đó sẽ **phá
một hợp đồng đang xanh**: `test/l2-m1-nhac-truong.test.js` ca N1b chốt đơn **không kèm
`total_price`** và neo cứng `guiNgam.pkAddNote === 1`. Ca đó không sai — nó phản ánh hành
vi thật của bộ não hôm nay.

Và chặn thêm ở đây **không thêm một lớp an toàn nào**: đường "thiếu tổng" đã fail-closed
sẵn ở cửa ⑤ (`order-bridge.js#precheck` → `NO_TOTAL` / `NO_PRICE_TABLE` khoá nút Tạo đơn
của sale). Nên BH1 đóng đúng lỗ **số SAI**; lỗ "thiếu số" giữ nguyên người gác cũ.
Ba ca khoá quyết định này: `G2d`, `G4b`, và chính ca N1b vẫn xanh.

**(b) `pkSendReply` của `pancake-poll.js` VẪN HỞ.** Van chặn được 5 lượt ghi trong
`tools.js` (ảnh · thẻ đơn · ghi chú đơn · thẻ handoff · ghi chú handoff), nhưng tin chữ đi
ra từ `pancake-poll.js:520` và `admin.js:358` — hai file thuộc 57 file vẫn cấm. Không tự ý
mở rộng phạm vi; đã ghi §9 nợ **N-SEND** kèm đúng dòng cần vá, chờ người quyết mở phiếu BH1b.

## 3 · Một thay đổi NGOÀI phiếu nhưng bắt buộc: thứ tự cửa

Phiếu không nói tới thứ tự, nhưng khi viết bộ ca thì lộ ra: cửa tiền đặt **sau**
`conversationHasOrder` — cửa duy nhất trong tool phải đi mạng (quét tới 6 trang đơn POS).
Hệ quả đo được, không phải suy đoán:

```
ca G1-tool (giá sai → phải từ chối)   bản CŨ: 34.842 ms      bản MỚI: 0,58 ms
ca G6     (hội thoại đã chốt)          bản CŨ: 28.504 ms      bản MỚI: 0,05 ms
```

Bản cũ mỗi lượt chốt đơn **hỏi POS trước rồi mới biết giá sai** — tốn một vòng mạng cho
một lượt chắc chắn bị từ chối, và làm bộ ca chạm API thật. Đã đảo: hai cửa cục bộ (đã
chốt chưa · giá đúng chưa) lên trước, cửa mạng xuống sau. Đúng nguyên tắc «rẻ trước, đắt
sau» của chính dự án (§2.3 TONG-QUAN). Phép ⑤ của cổng neo thứ tự này bằng số dòng.

## 4 · ĐẢO-VÁ — bằng chứng bộ ca có răng

Luật của skill `viet-thuoc`: xanh một mình không chứng minh gì. Lùi ba file về bản cũ
(`git stash push src/tools.js src/conv-owner.js src/outbound-guard.js`) rồi chạy lại đúng
bộ ca đó:

```
bản CŨ:  21 pass / 5 fail   ← G1-tool · G2-tool-b · G5 · G6 · G7c
bản MỚI: 26 pass / 0 fail
```

Năm ca đỏ đúng là năm hành vi phiếu này thêm vào. Ca `tinhTong`/`chonGoi` thuần vẫn xanh ở
cả hai bản — đúng, vì `src/core/gia.js` là file MỚI, không nằm trong lượt lùi.

## 5 · Chỗ dễ sai mà bộ ca phải khoá

**Khớp gói là chỗ dễ thu sai tiền nhất.** `kb.js#productTiers` trả `{label, price}` —
**không có số lượng**, nhãn là chuỗi marketer gõ tự do. Nhãn thật trong `kb-overrides.json`:
`"Buy 1 Get 2 FREE (Total 3 Products)"` chứa cả **1, 2 và 3**. Khớp lỏng theo số là chọn
gói 109 cho khách muốn 3 cái → thu sai tiền của một người thật. Nên `chonGoi` chỉ nhận số
đứng **ở ĐẦU nhãn** hoặc ngay sau `buy`, và **trả `null` khi không chắc** — không chắc thì
tầng trên hỏi lại khách một câu, đúng `CORE §6` mục 2. Ca khoá: *"Total 3 Products" ≠ khách
muốn 3*.

Kèm theo: nhãn thật có chữ toán học Unicode (`𝐁𝐮𝐲 𝟏 𝐆𝐞𝐭 𝟏` — 4 page dùng kiểu này), nên
`chuan()` phải hạ được `𝐁𝐮𝐲 𝟐` về `buy 2`. Ca riêng khoá việc đó.

## 6 · Cổng tự bắt lỗi của chính nó — hai phép thước hỏng

Lượt chạy đầu cổng đỏ 3 phép, **cả ba là lỗi của thước, không phải của code**:

- ③ đếm chuỗi thô `productTiers` → đỏ vì một dòng **CHÚ THÍCH** nhắc tên hàm. Thước bắt
  nhầm chú thích là thước dạy người ta xoá chú thích. Đổi sang neo dòng `^import`.
- ④b `grep -c ... | grep -c ":1"` → sai vì `tools.js` có 2 lần xuất hiện chuỗi (1 import +
  1 chú thích). Đổi sang đếm từng file riêng.
- ⑧ kiểm pathspec bằng `git diff HEAD` → đỏ vì `src/pos/tao-don.js` của **phiên trước** còn
  trong cây. Đã **bỏ hẳn phép này**: `_chan1.sh` phép ④ so `base..HEAD` và làm đúng hơn.
  Một việc một chỗ — cổng phiếu lo NỘI DUNG, chặng 1 lo PHẠM VI.

## 7 · Luật 4 sống ở BA chỗ, không phải một

Sửa sổ §0a xong vẫn bị chặn: `.claude/hooks/canh-file-cam.sh` đang thi hành **bản luật cũ**
và từ chối lượt Edit đầu tiên vào `outbound-guard.js`. Luật hành vi của dự án này sống ở
ba nơi — **sổ** (người đọc) · **cổng `_chan1.sh`** (máy canh lúc nghiệm thu) · **hook**
(máy canh lúc gõ). Đổi một chỗ mà quên hai chỗ kia thì luật mới chỉ là chữ.
Đã đồng bộ cả ba trong cùng lượt.

## 8 · Ngoài phạm vi — đã ghi §9, KHÔNG sửa

- **N-SEND**: `pkSendReply` (`pancake-poll.js:520`) và nút gửi tay (`admin.js:358`) chưa có van.
- Nợ **đơn vị tiền KWD/OMR/BHD** (`pancake-orders.js:162` `CCY_FACTOR` ×1000) — §9 đã có
  mục này từ trước. BH1 làm **giảm** rủi ro (số không còn do model bịa) nhưng **không đóng**
  nợ đó: phép xác nhận cuối vẫn là mở POS xem một đơn Kuwait hiện `10,900 KD` hay `1,090 KD`.
- `order-bridge.js#checkTotal` trùng việc với `core/gia.js#tinhTong` → gộp ở phiếu sau.
- `handler.js:348` gọi `extractFromText` SAU `runCloser`, tức tin của lượt này chỉ vào hồ sơ
  ở lượt sau. Đúng-sai chưa rõ, cần đo (liên quan BH2).
