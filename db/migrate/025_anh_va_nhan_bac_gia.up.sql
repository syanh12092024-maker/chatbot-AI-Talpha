-- ═══════════════════════════════════════════════════════════════════════════
-- 025_anh_va_nhan_bac_gia — ẢNH SẢN PHẨM VÀ NHÃN BẬC GIÁ CÓ NHÀ TRONG v3 (CR-28-09b · MN1)
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- Luật một nguồn (01-QUYET-DINH §8, 28/09): sản phẩm · giá · ẢNH · kịch bản có đúng MỘT chỗ
-- ghi là CSDL v3. Đo trên prod 28/09: 543 ảnh bot đang gửi nằm CHỈ trong `kb-overrides.json`
-- của tiến trình bot v1, và v3 không có bảng nào giữ được chúng — nên ảnh không sửa được ở
-- đâu cả. Bảng này là nhà của chúng.
--
-- ─── VÌ SAO ẢNH GẮN `san_pham`, KHÔNG GẮN `page` ─────────────────────────────────────
-- Bot chọn ảnh theo SẢN PHẨM (`send_product_image(product_id, category)`). Hai page cùng bán
-- một sản phẩm trong cùng shop thì dùng chung một bộ ảnh — sửa một lần, cả hai đổi.
--
-- ─── `nhan` LÀ CHỮ BOT CHỌN THEO, GIỮ NGUYÊN VĂN ─────────────────────────────────────
-- `src/tools.js#send_product_image` lọc ảnh bằng `label.includes(category)` và ưu tiên nhãn
-- chứa «sản phẩm». Đo 28/09: nhãn thật là «Ảnh sản phẩm» 275 · «Feedback» 89 · «Feedback
-- khách» 77 · «Chứng nhận» 35… Chuẩn hoá nhãn ở đây là đổi ảnh nào bot gửi — cấm.
--
-- ─── `goi_gia.nhan` — TÊN BẬC GIÁ KHÁCH ĐỌC ──────────────────────────────────────────
-- Bảng giá bot v1 là `{label, price}` với nhãn tự do gửi thẳng cho khách («Buy 1 Get 1 FREE
-- (Total 2 Products)», «2 Pairs – (Most Popular Choice)», chữ in đậm Unicode…). `goi_gia` chỉ
-- có `so_luong`. Không có cột này thì chuyển giá sang v3 là đổi lời bot nói với khách.
-- Rỗng = chưa đặt tên; nơi đẩy sang bot tự dựng «Buy <số lượng>» như `kb.js#productTiers`.
--
-- ⛔ CHỈ THÊM. Không bảng nào cũ đổi hành vi; `DEFAULT ''` nên mã cũ (không biết cột mới)
--    vẫn chạy sau khi migrate — thứ tự deploy nào cũng an toàn (bài học lưới migration 014).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE anh_san_pham (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     bigint      NOT NULL REFERENCES team(id),
  san_pham_id bigint      NOT NULL REFERENCES san_pham(id) ON DELETE CASCADE,
  -- Link CÔNG KHAI (Facebook/Pancake tự tải về khi gửi) hoặc đường tệp của chính máy mình
  -- `/uploads/<tệp>` — nơi đẩy sang bot ghép gốc công khai vào. Cấm mọi dạng khác: một
  -- đường tương đối lạ là một ảnh không bao giờ gửi được (đo 28/09: 7 ảnh như thế).
  duong       text        NOT NULL CHECK (duong ~ '^(https?://[^[:space:]]+|/uploads/[A-Za-z0-9_-][A-Za-z0-9._-]*)$'),
  nhan        text        NOT NULL DEFAULT '',
  thu_tu      int         NOT NULL DEFAULT 0,
  -- `nguoi` = tải lên trên giao diện · `kb` = nạp một lượt từ `kb-overrides.json` (MN2).
  nguon       text        NOT NULL DEFAULT 'nguoi' CHECK (nguon IN ('nguoi', 'kb')),
  tao_luc     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (san_pham_id, duong)
);
CREATE INDEX anh_san_pham_theo_sp ON anh_san_pham (team_id, san_pham_id, thu_tu);
COMMENT ON TABLE anh_san_pham IS
  'Ảnh bot gửi khách, theo sản phẩm. Nguồn DUY NHẤT từ CR-28-09b; kb-overrides.json chỉ còn là bản chép máy sinh.';
COMMENT ON COLUMN anh_san_pham.nhan IS
  'Nhãn bot chọn theo (send_product_image lọc bằng includes) — giữ nguyên văn, cấm chuẩn hoá.';

-- ─── `san_pham.bien_the` — PHÂN LOẠI bot in ra cạnh tên ──────────────────────────────
-- Bot v1 in «(phân loại: …)» trong khối sản phẩm (`kb.js#buildProductText`). Đo 28/09: 2/79
-- sản phẩm có. Không có cột thì chuyển sang v3 là mất chữ ấy khỏi prompt.
ALTER TABLE san_pham ADD COLUMN bien_the text NOT NULL DEFAULT '';

ALTER TABLE goi_gia ADD COLUMN nhan text NOT NULL DEFAULT '';
COMMENT ON COLUMN goi_gia.nhan IS
  'Tên bậc giá KHÁCH ĐỌC («Buy 1 Get 1 FREE (Total 2 Products)»). Rỗng = chưa đặt; nơi đẩy sang bot dựng «Buy <so_luong>».';
