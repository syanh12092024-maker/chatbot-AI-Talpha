# PHIẾU GL1 — `deploy/preflight.mjs` thôi luôn thoát lỗi + ca chạy CLI thật

**Base:** `1fb61de` · **Làn:** 🟩 (kịch bản deploy + bộ ca; không chạm đường bot / tiền)
**Nguồn:** nợ N-PREFLIGHT-MISSINGPAGES (sổ §9) · báo cáo `docs/golive-audit-2026-10-02.md` mục 1 · người quyết 05/10 «triển khai» nhóm điều kiện go-live · sổ §10 05/10 «ĐIỀU KIỆN GO-LIVE (GL)»
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

`deploy/preflight.mjs:134` đọc `db.missingPages.length`, nhưng `inspectDatabase()` (`:101-106`) chỉ trả `{database, version, applied, pending,
pagesBotBat}` từ MB4 `357795a` ⇒ TypeError ⇒ khối catch `:138-145` in «Không kiểm tra được PostgreSQL (TypeError)» và exit 1 ở MỌI lượt, kể
cả khi CSDL ổn; nhánh `--ready` (`:135`) không bao giờ tới. `deploy/setup.sh:15,68` gọi preflight ⇒ setup luôn dừng. Bộ ca vẫn xanh vì
`test/deploy-v3.test.mjs:62-73` đặt `node` GIẢ lên PATH (preflight thật không chạy) và ca CSDL thật (`:167-175`) gọi thẳng `inspectDatabase`,
không ai chạy `main()` / CLI.

## ② Hợp đồng vào / ra

**Ra:**
1. Bỏ vế `db.missingPages` (khái niệm đã gỡ ở MB2/MB4). Điều kiện exit 1: lỗi cấu hình (như hiện có) · CSDL không đọc được · `--ready` mà còn
   migration chưa áp. In `pagesBotBat` trong JSON (đã có) — CHƯA chặn theo nó (trần page là GL2).
2. Ca CHẠY CLI THẬT (`node deploy/preflight.mjs` qua `child_process`, KHÔNG node giả) trên Postgres hộp cát (`db/sandbox.js`): (a) CSDL đủ
   migration ⇒ exit 0, JSON có `applied` + `pagesBotBat`; (b) `--ready` khi còn migration chưa áp ⇒ exit 1; (c) URL CSDL sai ⇒ exit 1, KHÔNG in
   chuỗi nối; (d) `--config-only` ⇒ không chạm CSDL.
3. Không đổi `deploy/setup.sh` ở phiếu này (đường deploy đang dùng thật là làm tay: checkout + migrate + restart — sổ §10).

## ③ File được đụng

```
deploy/preflight.mjs
test/deploy-v3.test.mjs
test/gl1-*.test.mjs
ops/bin/nghiem-thu/gl1.sh
```

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl1.sh`, rc=0 khi đạt; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; hộp cát riêng `DB="aicloser_v3_nt_gl1_p$$"`; đảo-vá trên BẢN SAO tạm)

1. Bốn ca CLI thật ② 2 (a)–(d) xanh.
2. Đảo-vá: khôi phục dòng `db.missingPages.length` ⇒ ca (a) đỏ (exit 1); bỏ vế `--ready` ⇒ ca (b) đỏ.
3. `test/deploy-v3.test.mjs` cũ xanh. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl1-*.test.mjs` (CLI thật, hộp cát) + ca cũ `test/deploy-v3.test.mjs`.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Chặn theo số page bật (GL2) · drop-in systemd trên prod (`aicloser-v3.service.d/mn5.conf`) và `setup.sh --apply` · giữ hay bỏ `setup.sh` làm đường deploy chính thức.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-PREFLIGHT"
N-PREFLIGHT-MISSINGPAGES (báo cáo go-live 02/10, tổng xác nhận 05/10) deploy/preflight.mjs:134 đọc db.missingPages.length ...
```
Quan hệ: **trả nợ N-PREFLIGHT-MISSINGPAGES**.
