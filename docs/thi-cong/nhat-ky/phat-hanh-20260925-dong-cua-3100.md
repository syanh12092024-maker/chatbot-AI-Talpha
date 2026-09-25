# ĐÓNG CỬA HẬU CỔNG 3100 — runbook, viết TRƯỚC khi gõ

> Soạn 25/09/2026 · theo skill `mo-van` §0 · §4 · §5 · §7.
> **ĐÃ CHẠY 25/09/2026 ~07:40 UTC** — người quyết gật «chạy đi». Số đo tại từng mốc ở mục 10.
> Bối cảnh: Q2 của `docs/v3/09-KE-HOACH-GIAO-DIEN.md` — lỗ mà đèn ⑪ «Hai bot cùng một page»
> đang phải canh (`phieu-Q1-GIAO-PAGE.md` mục 4).

## 1 · Ba câu trả lời trước khi chạm prod (§0)

**① Đóng cái gì, nhỏ nhất là bao nhiêu?**
Chặn **cổng 3100 từ bên ngoài**, giữ nguyên đường loopback. Không đụng `.env`, không đụng mã,
không khởi động lại dịch vụ nào. Nhỏ hơn nữa thì không còn đóng được cửa.

**② Hỏng thì biết trong bao lâu, bằng phép đo nào?**
Thứ duy nhất có thể hỏng là **cầu của v3 sang bot cũ**. Đo ngay tại chỗ (+0′) và ở +15′ —
bảng mục 5. Biết trong vòng 1 phút.

**③ Lùi bằng lệnh nào, mất bao lâu, có mất dữ liệu không?**
Hai lệnh `iptables -D`, hiệu lực tức thì, **không mất dữ liệu, không khởi động lại gì**. Xem mục 6.

## 2 · Đo được gì trên máy chủ (chỉ đọc, đã chạy 25/09 07:24 UTC)

| Đo | Kết quả |
|---|---|
| Ba dịch vụ | `aicloser` · `aicloser-v3` · `aicloser-worker-v3` đều **active** |
| Cổng đang nghe | **3100 `*:*`** · **3102 `*:*`** — cả hai **mở ra Internet** |
| Tường lửa | `ufw` **inactive** — chưa có luật nào |
| nginx | có, nhưng phục vụ ứng dụng KHÁC (`443`→`8448`→`127.0.0.1:8765`). **Không** đứng trước 3100/3102 |
| Webhook | `META_WEBHOOK_OFF=1` ⇒ `GET/POST /webhook` trả **404**. Không gì từ ngoài cần cổng 3100 |
| v3 gọi bot cũ qua đâu | `V3_BOT_V1_GOC` **không đặt** ⇒ tự suy **`http://127.0.0.1:3100`** — loopback |
| Còn ai dùng dashboard cũ không | `ai-enabled.json` sửa lần cuối **28/08**, `kb-overrides.json` **28/08** — **28 ngày** không ai ghi gì qua đó |

⇒ Chặn từ ngoài thì **v3 không mất gì** (nó đi loopback) và **khách không mất gì** (webhook đã tắt).

## 3 · Vì sao KHÔNG chọn hai cách kia

- **Đổi mật khẩu dùng chung**: `/admin` và `/admin/api` chung một `adminAuth`, mà ba dịch vụ đọc
  **cùng một `.env`** ⇒ phải khởi động lại cả ba, tức bot ngừng trả lời vài giây. Đắt hơn mà
  đóng ít hơn.
- **`HOST=127.0.0.1` trong `.env`**: ba dịch vụ chung `.env` ⇒ **giao diện v3 (3102) cũng bị
  khoá khỏi Internet**, mà nginx KHÔNG đứng trước nó ⇒ người dùng v3 mất lối vào. ⛔

## 4 · Bậc phơi (§2)

Không thuộc thang ①–⑥ (thang ấy cho đường **ra khách**). Đây là **đóng một cửa quản trị**:
khách không thấy gì, không một tin nào đổi đường. Bậc duy nhất, và đóng bằng bảng mục 5.

## 5 · Cửa sổ quan sát — ngưỡng viết TRƯỚC (§4)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +0′ | cửa đã đóng với bên ngoài | từ máy dev: `curl -m 5 http://169.58.33.8:3100/health` | **phải** timeout/refused. Còn trả 200 = luật chưa ăn |
| +0′ | loopback còn sống | trên máy chủ: `curl -s -m 5 127.0.0.1:3100/health` | không trả `{"ok":true}` ⇒ **LÙI NGAY** |
| +2′ | cầu v3 còn đọc được | trên máy chủ: `curl -s -u "$ADMIN_USER:$ADMIN_PASS" -m 30 127.0.0.1:3100/admin/api/readiness \| head -c 80` | không ra JSON ⇒ **LÙI** |
| +15′ | v3 không kêu mất cầu | `journalctl -u aicloser-v3 --since "15 min ago" \| grep -ciE "Không gọi được tiến trình bot\|cau_bot_hong"` | **> 0 ⇒ LÙI** |
| +1h | bot còn trả lời | `curl -s -u … 127.0.0.1:3100/admin/api/ops/health \| grep -o '"replies1h":[0-9]*'` | tụt > 20% so với cùng giờ hôm trước ⇒ LÙI |

## 6 · Đường lùi — viết TRƯỚC (§5)

```bash
iptables -D INPUT -p tcp --dport 3100 -j DROP
iptables -D INPUT -i lo -p tcp --dport 3100 -j ACCEPT
```

Tức thì · không mất dữ liệu · không khởi động lại dịch vụ nào · không đụng `.env`, không đụng mã.

⚠️ **Luật iptables KHÔNG sống qua reboot** nếu chưa lưu. Lượt này **cố ý không lưu**: reboot là
tự lùi. Lưu vĩnh viễn (`netfilter-persistent save`) là **một lượt gật riêng**, sau khi cửa sổ
quan sát 1 ngày đóng — kèm một dòng vào sổ để người sau không tưởng lỗ đã bịt vĩnh viễn.

## 7 · ⛔ ĐIỂM DỪNG ② — lệnh chờ người quyết gõ

```bash
ssh -i ~/.ssh/aicloser root@169.58.33.8 '
  iptables -I INPUT 1 -i lo -p tcp --dport 3100 -j ACCEPT
  iptables -I INPUT 2 -p tcp --dport 3100 -j DROP
  iptables -L INPUT -n --line-numbers | head -5
  curl -s -m 5 127.0.0.1:3100/health
'
```

Thứ tự hai luật là bắt buộc: `ACCEPT` loopback phải đứng **trước** `DROP`, nếu không v3 mất cầu.

## 8 · Ai mất gì sau khi đóng

- Người muốn vào dashboard cũ **từ xa**: mất. Lối còn lại là SSH tunnel —
  `ssh -i ~/.ssh/aicloser -L 3100:127.0.0.1:3100 root@169.58.33.8` rồi mở `localhost:3100/admin`.
- Bảy màn của giao diện cũ: v3 **chưa có bản thay** cho `ops.html` (tin bị chặn · sức khoẻ LLM ·
  botcake trùng), `economics.html` (Unit Economics), `orders.html` (mổ hội thoại).
  Bằng chứng 28 ngày không ai ghi gì cho thấy giá phải trả là thấp, nhưng **dùng để ĐỌC thì
  không để lại dấu vết** — nên đây là chỗ duy nhất tôi không đo được.

## 9 · Nợ lộ ra trong lượt đo, chưa xử (→ §9 sổ)

- **Cổng 3102 (giao diện v3) cũng đang mở thẳng ra Internet**, chỉ có lớp đăng nhập của v3 che,
  và **không có HTTPS** (nginx trên máy phục vụ ứng dụng khác). Cookie đăng nhập đặt `Secure`
  theo `deploy/README.md` mục 4 ⇒ đang vào bằng HTTP IP là đường **không được hỗ trợ**.
  Lượt sau: đưa 3102 ra sau nginx + chứng chỉ, rồi khoá 3102 về loopback.
- `PANCAKE_READONLY` **không có trong `.env` prod** ⇒ prod đang gửi thật. Đúng chủ ý, ghi lại
  để không ai nhầm nó với máy dev.


## 10 · ĐÃ CHẠY — số đo tại từng mốc

Người quyết gật lúc 25/09 (phiên làm việc này). Lệnh gõ đúng như mục 7, không thêm bớt.

| Mốc | Đo | Kết quả | Đạt? |
|---|---|---|---|
| +0′ | luật vào đúng chỗ | `1 ACCEPT lo tcp dpt:3100` · `2 DROP * tcp dpt:3100` — cột in-interface xác nhận luật 1 CHỈ cho loopback | ✅ |
| +0′ | loopback còn sống | `curl 127.0.0.1:3100/health` → `{"ok":true,"pages":133}` | ✅ |
| +0′ | cửa đã đóng với bên ngoài | từ máy dev: `curl http://<prod>:3100/health` → **mã 000, timeout 8,0 s** | ✅ |
| +0′ | đối chứng, không chặn nhầm | `http://<prod>:3102/dang-nhap` → **200** (giao diện v3 vẫn vào được) | ✅ |
| +2′ | cầu v3 → bot cũ | `/admin/api/readiness` qua loopback → JSON thật (`blocked:626 · warned:73 · ready:0 · 699 page`) | ✅ |
| +5′ | v3 kêu mất cầu | `journalctl -u aicloser-v3 \| grep -c "Không gọi được tiến trình bot\|cau_bot_hong"` → **0** | ✅ |
| +15′ | xem mục 11 | | |

`ready:0 / blocked:626` là **trạng thái có sẵn**, không phải hệ quả của lượt này — cùng con số
họ hàng với những lượt đo trước (page thiếu kịch bản/sản phẩm). Ghi ra để không ai đọc nhầm
thành «đóng cổng làm hỏng cửa kiểm».

## 11 · Còn phải làm

- [ ] Mốc **+1h**: `replies1h` không tụt > 20% so với cùng giờ hôm trước.
- [ ] Sau **1 ngày** quan sát sạch: quyết có **lưu luật vĩnh viễn** không
      (`netfilter-persistent save`). **Chưa lưu thì reboot là tự mở lại cửa** — đây là chỗ dễ
      quên nhất của lượt này.
- [ ] Nợ §9: cổng **3102 mở thẳng ra Internet, không HTTPS** — phiếu riêng.
