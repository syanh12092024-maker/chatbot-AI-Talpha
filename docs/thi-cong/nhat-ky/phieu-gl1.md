# Nhật ký phiếu GL1 — preflight thôi luôn thoát lỗi (05/10/2026 · thợ GL1)

**Môi trường đo:** máy dev, hộp cát Postgres 127.0.0.1:5432 (CSDL `aicloser_v3_test_gl1_*_p<pid>`, tự dựng/dọn). Không đo prod.

## Đã làm
- `deploy/preflight.mjs`: bỏ vế `db.missingPages.length` (TypeError mọi lượt). Exit 1 còn: lỗi cấu hình · CSDL không đọc được · `--ready` còn migration chưa áp. `pagesBotBat` vẫn in JSON, chưa chặn (GL2).
- `test/gl1-preflight-cli-that.test.mjs`: 4 ca chạy CLI THẬT qua `spawnSync(process.execPath, preflight.mjs)` (không node giả): (a) đủ migration ⇒ rc0 + `applied`/`pagesBotBat` (+ `--ready` rc0) · (b) `--ready` + migration chưa áp ⇒ rc1 (không `--ready` ⇒ rc0) · (c) URL sai ⇒ rc1, không lộ mật khẩu/`postgresql://`/host:port · (d) `--config-only` + URL sai ⇒ rc0, không chạm CSDL.
- `ops/bin/nghiem-thu/gl1.sh`: ca + đảo-vá trên bản sao tạm. Không đụng `setup.sh`, `test/deploy-v3.test.mjs` (không cần đổi).

## Ghi chú quyết định
- Đảo-vá ②a khôi phục `missingPages` làm đỏ cả (a) lẫn (b) (vế phụ «không --ready ⇒ rc0» của (b) cũng chết vì TypeError). Cổng đòi (a) đỏ và (c)(d) vẫn xanh; chọn vậy thay vì «chỉ (a)» vì (b) đỏ theo là đúng bản chất. Đảo ②b (bỏ vế `--ready`) đỏ đúng một mình (b).
- Phiếu ② 2(c) khai «KHÔNG in chuỗi nối»: ca kiểm mật khẩu, `postgresql://`, `127.0.0.1:1` đều vắng.
- Nhánh test không chạm: nhánh `e.safe` («Database mới hơn code») — ngoài 4 ca phiếu đòi, đã có ở ca cũ.

## Mốc số ca (`npm test`)
Sau: tests 2467 · pass 2463 · fail 0 (cây chung có thay đổi dở của TT1, không ca đỏ). Mốc trước ≈ 2459 pass (sau − 4 ca mới; không chạy riêng lượt trước để khỏi chạy hai lượt).
`deploy-v3.test.mjs` cũ: pass=8 fail=0.

## Cổng `gl1.sh` (rc=0): ĐỎ 0 / XANH 7 (+ npm test hoãn theo CHAY_NPM_TEST=1)

## _chan1.sh gl1 (trước khi commit nhật ký)
Tất cả ✅ trừ ⑧a (nhật ký chưa có lúc chạy) — chạy lại sau commit, kết quả dán ở dưới.
