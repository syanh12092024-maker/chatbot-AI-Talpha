# Vận hành

## Hạ tầng

- **VPS production**: `root@169.58.33.8` · thư mục `/opt/aicloser` · systemd service `aicloser` · log `/var/log/aicloser.log`. SSH key đã cài sẵn trên máy local.
  Log **không có timestamp** — cần mốc thời gian thì dùng `journalctl -u aicloser --since "1 hour ago"`.
- **Dashboard**: `http://169.58.33.8:3100/admin` — Basic Auth, user/pass ở `/opt/aicloser/.env`.
- **GitHub**: `syanh12092024-maker/chatbot-AI-Talpha`, nhánh `main`.
- **Local**: repo này. `.env.vps` là bản sao cấu hình VPS để đối chiếu.

## Deploy

```bash
git add -A && git commit -m "..." && git push origin HEAD:main
ssh root@169.58.33.8 'cd /opt/aicloser && git pull -q && systemctl restart aicloser && sleep 8 && systemctl is-active aicloser'
```

Sửa **chỉ** `public/*.html` thì không cần restart — server `sendFile` đọc lại mỗi request, chỉ cần Ctrl+Shift+R ở trình duyệt.

Sau restart nên xác nhận nhà cung cấp AI nạp đúng:

```bash
ssh root@169.58.33.8 'tac /var/log/aicloser.log | grep -m1 "\[llm\]"'
```

## Kiểm tra sức khỏe

```bash
ssh root@169.58.33.8 'systemctl is-active aicloser && curl -s localhost:3100/health'
ssh root@169.58.33.8 'tail -80 /var/log/aicloser.log'
```

Gọi API admin trên VPS (tự nạp user/pass từ `.env`):

```bash
ssh root@169.58.33.8 'source <(grep -E "^#?ADMIN_" /opt/aicloser/.env | sed "s/^#//"); curl -su "$ADMIN_USER:$ADMIN_PASS" localhost:3100/admin/api/overview'
```

Các endpoint hay dùng: `/admin/api/overview` · `/admin/api/needsale` · `/admin/api/orders` (chậm ~35s lần đầu, sau đó cache) · `/admin/api/token-cost?from=&to=` · `/admin/api/recount`.

## Chạy local

```bash
npm start
```

Dashboard `http://localhost:3100/admin` (local không cần đăng nhập). Nhắc lại: `.env` local **bắt buộc** `PANCAKE_READONLY=1`.

## Báo cáo WhatsApp

Cron trên VPS chạy 8:00 và 17:00 giờ VN (`CRON_TZ=Asia/Ho_Chi_Minh`).

```bash
npm run report -- morning              # XEM TRƯỚC, không gửi
npm run report -- morning --send
npm run wa:login -- --phone 84xxxxxxxxx   # đăng nhập lại khi phiên rớt (mã ghép 8 ký tự)
ssh root@169.58.33.8 'tail -20 /var/log/aicloser-report.log'
```

`afternoon` tính từ 00:00 hôm nay tới giờ chạy. Số liệu cắt mốc theo **giờ VN** trong `report.js` (Sổ AI vốn tính ngày theo UTC).

Thư mục `wa-auth/` chính là mật khẩu phiên WhatsApp — mất là phải ghép lại từ đầu.

## Chạy thử một kịch bản hội thoại (test trên VPS)

Đây là cách duy nhất nghiệm thu hành vi AI cho chắc, vì local thiếu KB thật (`kb.js` lấy từ Google Sheet + `kb-overrides.json` chỉ có trên VPS — local sẽ báo `page_no_kb` và bàn giao ngay, không phản ánh thực tế).

```bash
# 1. Viết script vào scratchpad, import từ /opt/aicloser/src/
cat > /tmp/t.mjs <<'EOF'
const D='/opt/aicloser/src/';
const { handleIncoming } = await import(D+'handler.js');
const { resetState } = await import(D+'store.js');
const { loadKB, syncFromSheet } = await import(D+'kb.js');
const { getSheetId } = await import(D+'sheets.js');
loadKB(); if (getSheetId()) await syncFromSheet(getSheetId());
const PAGE='<pageId đang bật AI>';
const hist=[ {from:{id:'C'},original_message:'...'}, {from:{id:PAGE},original_message:'...'} ];
for (let i=1;i<=3;i++){                       // chạy ≥3 lần: LLM không tất định
  const psid='TEST_'+i; resetState(psid);
  const r = await handleIncoming({ psid, text:'<tin khách>', pageId:PAGE, history:hist });
  console.log(i, (r.reply||'(im)').replace(/\n/g,' ').slice(0,180));
}
EOF
# 2. Chép lên VPS và chạy
scp -q /tmp/t.mjs root@169.58.33.8:/tmp/t.mjs
ssh root@169.58.33.8 'cd /opt/aicloser && node /tmp/t.mjs 2>&1 | grep -vE "^\[kb\]|^\[llm\]|^\[hist\]"; rm -f /tmp/t.mjs'
```

Lưu ý khi viết script test:
- `history` dùng đúng dạng Pancake: `{from:{id}, original_message}`. `from.id === pageId` nghĩa là tin của page.
- Chạy ít nhất 3 lượt và đánh giá **cả 3**. Một lần đúng không chứng minh bản vá có tác dụng.
- `resetState(psid)` mỗi lượt, và dùng psid giả (`TEST_*`) để không đụng khách thật.
- Script test **có ghi vào Sổ AI** — chấp nhận được, nhưng đừng chạy hàng loạt.

## Bẫy shell hay vấp

- Lệnh ssh nhiều dòng: dùng heredoc `ssh root@... 'bash -s' <<'EOF'` thay vì nhồi quote lồng nhau.
- `pkill -f <chuỗi>` trên VPS: chính chuỗi lệnh ssh cũng khớp và tự giết phiên. Viết `[w]a-login` thay vì `wa-login`, hoặc dùng `systemd-run`.
- Đồng bộ file dữ liệu về local để xem: `scp root@169.58.33.8:/opt/aicloser/<file> .`
