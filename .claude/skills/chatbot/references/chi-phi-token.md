# Chi phí token

## Trả lời câu "page nào đốt token nhiều nhất, bao nhiêu tiền"

```bash
ssh root@169.58.33.8 'source <(grep -E "^#?ADMIN_" /opt/aicloser/.env | sed "s/^#//"); curl -su "$ADMIN_USER:$ADMIN_PASS" "localhost:3100/admin/api/token-cost?from=2026-08-06&to=2026-08-07"'
```

Trả về: `provider`, `prices`, tổng `tin/tout/cread/calls`, `usd`, `vnd`, và mảng `pages[]` **đã xếp theo chi phí giảm dần**. Dashboard có thẻ "Chi phí AI (đo)" và cột "Chi phí AI" theo page (tooltip hiện số token).

Bỏ `from`/`to` thì tính toàn bộ lịch sử.

## Số ở đâu ra

Đo thật, không ước lượng. Mỗi event `reply` trong Sổ AI mang 4 số lấy từ `usage` của API:

| Trường | Nghĩa |
|---|---|
| `tin` | input_tokens |
| `tout` | output_tokens |
| `cread` | cache_read_input_tokens |
| `calls` | số lần gọi LLM trong lượt đó (**classifier + closer + mỗi vòng tool**) |

`ai-log.js → tokenStats()` cộng theo page. `admin.js` nhân với `config.aiPrices` để ra tiền.

**Bắt đầu đo từ 06/08/2026.** Tin cũ hơn không có số, nên `measured < replies` là bình thường — đừng đọc chênh lệch đó thành lỗi. Muốn ước tính tổng thật thì nhân theo tỉ lệ `replies/measured`.

## Đơn giá (USD / 1 triệu token)

| | vào | cache đọc | ra |
|---|---|---|---|
| kimi-k2.6 | 0,95 | 0,16 | 4,00 |
| claude-haiku-4-5 | 1,00 | 0,10 | 5,00 |

Đè bằng `AI_PRICE_IN` / `AI_PRICE_CACHE` / `AI_PRICE_OUT`; tỉ giá `AI_USD_VND` (mặc định 26.000).

## Đọc con số cho đúng

`cread` thường **gấp ~3 lần** `tin` — đó là prompt caching hoạt động đúng, không phải lãng phí. Khối KB được cache (`cache_control: ephemeral`) nên mỗi lượt chỉ trả giá cache-read rẻ thay vì giá input đầy đủ. Sửa `prompts.js` làm mất hiệu lực cache cũ, chi phí nhích lên đúng một lần rồi về bình thường.

`calls` là thước đo tốt hơn `tin` khi soát lãng phí: `calls / replies` xấp xỉ 2 là khỏe (1 classifier + 1 closer). Vọt lên 4–5 nghĩa là AI đang quay nhiều vòng tool.

Muốn biết token tăng do bug hay do lưu lượng thì **chia ra `tin/khách`**. Số này phẳng nghĩa là chỉ đông khách hơn; số này vọt mới là bug. Đây chính là cách đã bác bỏ nghi ngờ "có vòng lặp đốt token" ngày 06/08.

## Các van tiết kiệm đang bật

| Van | Tác dụng |
|---|---|
| `MAX_AI_TURNS=4` | Trần lượt/khách/24h — hạ từ 5 xuống 4 ngày 06/08/2026 |
| `REPLY_DEBOUNCE_MS=20000` | Khách nhắn dồn 5 tin → 1 lượt AI thay vì 5 |
| Prompt caching trên KB | Cắt phần lớn chi phí input |
| `maxToolIterations=5` | Chặn AI quay vòng tool vô hạn |
| Backoff 2 lỗi → nghỉ 30 phút | Không đốt token vào page đang bị Meta chặn (đã đo: 14% lãng phí trước khi có van này) |
| Nhường Botcake tin đầu | Không tốn lượt AI cho câu chào |

## Chủ trương

Dùng **100% model rẻ** (Haiku 4.5 hoặc Kimi k2.6) cho bot. **Không tự ý nâng lên model đắt hơn** — kể cả khi thấy AI trả lời chưa tốt. Cách xử lý đúng là sửa `prompts.js`.
