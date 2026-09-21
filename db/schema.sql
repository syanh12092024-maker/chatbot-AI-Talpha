-- ═══════════════════════════════════════════════════════════════════════════
-- db/schema.sql — LƯỢC ĐỒ HỢP NHẤT của nền v3.
-- ⛔ SINH RA từ db/migrate/*.up.sql bằng `node db/migrate.js schema`. CẤM SỬA TAY:
--    sửa ở đây thì CSDL thật không đổi, và hai bản sẽ trôi khỏi nhau trong im lặng.
--    Muốn đổi lược đồ → thêm một bản migrate mới rồi sinh lại file này.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 001_nen ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 001_nen — NỀN DỮ LIỆU v3 · 19 bảng nghiệp vụ, team_id ở mọi bảng trừ 3 bảng dùng chung
-- Phiếu L0-M1 · spec: docs/v3/02-KE-HOACH-CODE.md §"Nền dữ liệu" · 01-QUYET-DINH §1·§8·§9
--
-- LUẬT CỨNG ĐƯỢC THI HÀNH Ở ĐÂY (không chỉ ở code):
--   · team kỹ thuật KHÔNG được nhận thành viên            → trigger tg_chan_tv_team_ky_thuat
--   · nhat_ky / so_ai chỉ INSERT, cấm UPDATE và DELETE     → trigger tg_chi_insert_*
--   · khoá API của cau_hinh_model phải là bản MÃ HOÁ       → CHECK khoa_api_ma LIKE 'v1.%'
--   · don_hang mang cột nguồn + trạng thái hệ TÁCH POS     → CHECK + 2 cột riêng
--   · bo_luat_chung.team_id NULLABLE (NULL = toàn hệ); MỌI bảng nghiệp vụ khác NOT NULL
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── BA BẢNG DÙNG CHUNG — KHÔNG mang team_id (02 §"Nền dữ liệu") ────────────

CREATE TABLE team (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text        NOT NULL UNIQUE,
  ten         text        NOT NULL,
  -- true = team KỸ THUẬT (chỗ đậu của dữ liệu chưa chốt chủ). Cấm gán người vào,
  -- cấm hiện trên màn chọn team. Xem hợp đồng đọc trong ban-giao/luoc-do-v1.md.
  la_ky_thuat boolean     NOT NULL DEFAULT false,
  tao_luc     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nguoi_dung (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text        NOT NULL UNIQUE,
  ten           text        NOT NULL DEFAULT '',
  -- Cách băm do người B chốt ở L0-M3; cột để sẵn, NULL = chưa đặt mật khẩu.
  mat_khau_hash text,
  hoat_dong     boolean     NOT NULL DEFAULT true,
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vai (
  id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ma  text NOT NULL UNIQUE,
  ten text NOT NULL
);

-- ─── BẢNG NGHIỆP VỤ — team_id NOT NULL (trừ bo_luat_chung) ──────────────────

CREATE TABLE thanh_vien_team (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  nguoi_dung_id bigint      NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  vai_id        bigint      NOT NULL REFERENCES vai(id),
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, nguoi_dung_id, vai_id)
);

CREATE TABLE cau_hinh_model (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  vai_tro       text        NOT NULL CHECK (vai_tro IN ('chinh', 'du_phong', 'nen')),
  nha_cung_cap  text        NOT NULL,
  ma_model      text        NOT NULL,
  -- ⛔ CẤM ghi khoá nguyên văn. Chỉ nhận bao thư của db/khoa.js (`v1.<iv>.<tag>.<ct>`).
  --    CHECK này là cái RÀO ở tầng DB — code có quên gọi bộ mã hoá thì INSERT vẫn đỏ.
  khoa_api_ma   text        CHECK (khoa_api_ma IS NULL OR khoa_api_ma LIKE 'v1.%'),
  -- 01 §12 «độ ngẫu nhiên chưa đặt» — cột để sẵn, NULL = dùng mặc định nhà cung cấp.
  do_ngau_nhien numeric(3,2) CHECK (do_ngau_nhien IS NULL OR do_ngau_nhien BETWEEN 0 AND 2),
  bat           boolean     NOT NULL DEFAULT true,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  sua_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, vai_tro)
);

CREATE TABLE page (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     bigint      NOT NULL REFERENCES team(id),
  page_id     text        NOT NULL UNIQUE,   -- id Facebook, khoá tự nhiên của di trú
  ten         text        NOT NULL DEFAULT '',
  thi_truong  text        NOT NULL DEFAULT '',
  nganh_hang  text        NOT NULL DEFAULT '',
  marketer    text        NOT NULL DEFAULT '',
  -- NGUỒN DUY NHẤT của cờ này là ai-enabled.json (TONG-QUAN §11.1 «công tắc thật»).
  -- Page ngoài danh sách đó = false. Cấm suy ra từ bất kỳ trường nào của pages.json.
  bot_ai_bat  boolean     NOT NULL DEFAULT false,
  botcake_tat boolean     NOT NULL DEFAULT false,
  trong_diem  boolean     NOT NULL DEFAULT false,
  pos_shop_id text,
  pos_via     text,
  token_idx   int,
  the_pancake jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- pages.json .tags {ai,order,handoff}
  mat_dau     boolean     NOT NULL DEFAULT false,        -- pages.json .lost
  kiem_luc    timestamptz,                               -- pages.json .checkedAt
  tao_luc     timestamptz NOT NULL DEFAULT now(),
  sua_luc     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX page_team ON page (team_id);
CREATE INDEX page_bot_ai_bat ON page (bot_ai_bat) WHERE bot_ai_bat;

CREATE TABLE san_pham (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id  bigint      NOT NULL REFERENCES team(id),
  page_id  bigint      REFERENCES page(id) ON DELETE SET NULL,
  ma       text        NOT NULL,
  ten      text        NOT NULL DEFAULT '',
  mo_ta    text        NOT NULL DEFAULT '',
  ton_kho  int,
  het_hang boolean     NOT NULL DEFAULT false,
  nguon    text        NOT NULL DEFAULT 'pos',
  tao_luc  timestamptz NOT NULL DEFAULT now(),
  sua_luc  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma)
);

CREATE TABLE goi_gia (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     bigint       NOT NULL REFERENCES team(id),
  san_pham_id bigint       NOT NULL REFERENCES san_pham(id) ON DELETE CASCADE,
  so_luong    int          NOT NULL CHECK (so_luong > 0),
  gia         numeric(14,2) NOT NULL,
  tien_te     text         NOT NULL,
  UNIQUE (san_pham_id, so_luong)
);

CREATE TABLE khach (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  -- Khoá nối ba kênh. NULL ĐƯỢC (N8): khách Messenger giữa chừng chưa đưa số.
  so_dien_thoai  text,
  ten            text        NOT NULL DEFAULT '',
  dia_chi        text        NOT NULL DEFAULT '',
  thanh_pho      text        NOT NULL DEFAULT '',
  ti_le_hoan     numeric(5,2),
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  sua_luc        timestamptz NOT NULL DEFAULT now()
);
-- UNIQUE «trong team, khi CÓ giá trị» — index bộ phận thay vì UNIQUE thường để
-- nhiều dòng NULL cùng tồn tại mà vẫn cấm hai khách cùng số trong một team.
CREATE UNIQUE INDEX khach_sdt_trong_team ON khach (team_id, so_dien_thoai)
  WHERE so_dien_thoai IS NOT NULL;

CREATE TABLE hoi_thoai (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  page_id        bigint      NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  psid           text        NOT NULL,
  khach_id       bigint      REFERENCES khach(id) ON DELETE SET NULL,  -- nullable (N8)
  -- Sáu trạng thái đo từ conv-state.json ngày 22/08/2026 (18.790 hội thoại).
  trang_thai     text        NOT NULL
                 CHECK (trang_thai IN ('GREET','QUALIFY','SELLING','CLOSING','HANDOFF','POST_SALE')),
  chu_so_huu     text        NOT NULL CHECK (chu_so_huu IN ('AI','SALE','BOTCAKE')),
  trang_thai_truoc text,
  ly_do_cuoi     text        NOT NULL DEFAULT '',
  bat_dau_luc    timestamptz,
  cham_luc       timestamptz,
  nguoi_that_luc timestamptz,
  chot_don_luc   timestamptz,
  ai_noi_luc     timestamptz,
  ai_noi_gi      text        NOT NULL DEFAULT '',
  -- SỐ lượt gọi model, và MỐC từng lượt. Cả hai đều cần: số để đọc nhanh, mốc để
  -- ngân sách lượt/24h (M11) sống sót qua cutover — bỏ mốc thì mọi khách được cấp
  -- lại ngân sách đầy ngay ngày chuyển nền.
  luot_llm       int         NOT NULL DEFAULT 0,
  moc_luot_llm   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  luot_ai        int         NOT NULL DEFAULT 0,
  luot_doi_thu   int         NOT NULL DEFAULT 0,   -- conv-state.oppTurns (bot khác nói)
  nhac_da_gui    int         NOT NULL DEFAULT 0,   -- conv-state.followupSent
  diem_nong      int         NOT NULL DEFAULT 0,   -- = diem_lead->>'score', tách ra để lọc
  diem_lead      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ho_so          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  sua_luc        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, psid)
);
CREATE INDEX hoi_thoai_team ON hoi_thoai (team_id);

-- Sổ AI — CHỈ THÊM. page_id để dạng TEXT KHÔNG khoá ngoại: sổ là sử liệu, nó ghi cả
-- page đã rơi khỏi sổ cái (đo 22/08: 3 page có dữ liệu mà không có trong pages.json).
-- Khoá ngoại ở đây sẽ làm cutover mất dòng thật.
CREATE TABLE so_ai (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  xay_ra_luc    timestamptz NOT NULL,
  page_id       text        NOT NULL DEFAULT '',
  psid          text        NOT NULL DEFAULT '',
  loai          text        NOT NULL
                CHECK (loai IN ('reply','order','handoff','image','other_bot','yielded','spent_no_send')),
  -- 02 §"Nền dữ liệu": ghi MÃ MODEL ngay từ đầu, «nếu không sau này không so được
  -- model nào rẻ hơn thật». NOT NULL — bộ nạp phải khai, cấm đoán im lặng.
  ma_model      text        NOT NULL,
  lane          text,
  trang_thai    text,
  ban_kich_ban  text,
  ly_do         text,
  token_vao     int,
  token_ra      int,
  cache_doc     int,
  cache_ghi     int,
  so_lan_goi    int,
  du_lieu       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Neo idempotent của bộ nạp: TỆ NGUỒN + SỐ DÒNG. Không băm nội dung và không
  -- dùng (giờ,page,psid,loại) làm vân tay — hai dòng thật giống hệt nhau trong một
  -- sổ append-only là chuyện bình thường, băm sẽ NUỐT dòng thật và làm phép
  -- «đối chiếu số dòng» của 02 §L0 sai theo chiều khó thấy nhất.
  nguon_tep     text        NOT NULL,
  nguon_dong    int         NOT NULL CHECK (nguon_dong > 0),
  ghi_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nguon_tep, nguon_dong)
);
CREATE INDEX so_ai_team_luc ON so_ai (team_id, xay_ra_luc);

CREATE TABLE don_hang (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  ma_pos         text,
  -- 01 §1 «quyết định quan trọng nhất về nghiệp vụ» — máy trạng thái L3 rẽ nhánh theo cột này.
  nguon          text        NOT NULL CHECK (nguon IN ('trang_ban_hang','messenger')),
  -- HAI cột trạng thái TÁCH HẲN nhau (02 §"Hai quyết định đáng nói"): đơn có thể
  -- «chờ khách trả lời» trong hệ mà trên POS vẫn «chờ xác nhận».
  trang_thai_he  text        NOT NULL,
  trang_thai_pos text,
  khach_id       bigint      REFERENCES khach(id) ON DELETE SET NULL,
  hoi_thoai_id   bigint      REFERENCES hoi_thoai(id) ON DELETE SET NULL,
  page_id        bigint      REFERENCES page(id) ON DELETE SET NULL,
  tong_tien      numeric(14,2),
  tien_te        text,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  sua_luc        timestamptz NOT NULL DEFAULT now(),
  dong_luc       timestamptz,
  UNIQUE (team_id, ma_pos)
);
CREATE INDEX don_hang_nguon ON don_hang (team_id, nguon, trang_thai_he);

CREATE TABLE viec_can_xu_ly (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  loai          text        NOT NULL CHECK (loai IN ('hoi_thoai','don_hang')),
  hoi_thoai_id  bigint      REFERENCES hoi_thoai(id) ON DELETE CASCADE,
  don_hang_id   bigint      REFERENCES don_hang(id) ON DELETE CASCADE,
  ly_do_day     text        NOT NULL,                  -- lý do BOT đẩy sang, hiện trên mỗi dòng
  day_luc       timestamptz NOT NULL DEFAULT now(),
  han_luc       timestamptz NOT NULL,                  -- mốc 10 phút, quá là báo động
  nguoi_nhan_id bigint      REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  nhan_luc      timestamptz,
  ket_qua       text,
  ly_do_dong    text,
  chi_phi       numeric(14,2),
  dong_luc      timestamptz,
  CHECK (loai <> 'hoi_thoai' OR hoi_thoai_id IS NOT NULL),
  CHECK (loai <> 'don_hang'  OR don_hang_id  IS NOT NULL)
);
CREATE INDEX viec_can_xu_ly_mo ON viec_can_xu_ly (team_id, han_luc) WHERE dong_luc IS NULL;

CREATE TABLE hang_cho_tao_don (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  hoi_thoai_id  bigint      NOT NULL REFERENCES hoi_thoai(id) ON DELETE CASCADE,
  du_lieu_don   jsonb       NOT NULL,
  cua_kiem      jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- kết quả BỐN cửa kiểm chống trùng
  trang_thai    text        NOT NULL DEFAULT 'cho_duyet'
                CHECK (trang_thai IN ('cho_duyet','da_duyet','tu_choi')),
  nguoi_duyet_id bigint     REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  duyet_luc     timestamptz,
  don_hang_id   bigint      REFERENCES don_hang(id) ON DELETE SET NULL,
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kich_ban (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  page_id        bigint      NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  phien_ban      int         NOT NULL,
  trang_thai     text        NOT NULL CHECK (trang_thai IN ('DRAFT','REVIEW','LIVE','ARCHIVED')),
  -- BẢN CHO NGƯỜI: đúng 6 trường marketer viết và sửa (kb.js SCRIPT_FIELDS).
  noi_dung_nguoi jsonb       NOT NULL,
  -- BẢN CHO MÁY: khối chữ nạp vào prompt, dựng từ tone/greeting/salesPrompt theo
  -- prompts.js:99-101. Giữ riêng để đo token và A/B mà không phải dựng lại mỗi lượt.
  noi_dung_may   text        NOT NULL,
  nguoi_sua      text        NOT NULL DEFAULT '',
  ghi_chu        text        NOT NULL DEFAULT '',
  sua_luc        timestamptz,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, phien_ban)
);
-- Mỗi page nhiều nhất MỘT bản LIVE — bất biến của kho phiên bản (kb.js recordVersion).
CREATE UNIQUE INDEX kich_ban_live_moi_page ON kich_ban (page_id) WHERE trang_thai = 'LIVE';

-- team_id NULLABLE ở ĐÚNG bảng này: NULL = bộ luật của TOÀN HỆ (01 §6, dùng chung mọi page).
-- HỢP ĐỒNG ĐỌC: mọi truy vấn bảng này dùng (team_id = $ctx OR team_id IS NULL).
-- Mọi bảng khác dùng luật đồng nhất team_id = $ctx.
CREATE TABLE bo_luat_chung (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id   bigint      REFERENCES team(id) ON DELETE CASCADE,
  phien_ban int         NOT NULL DEFAULT 1,
  noi_dung  text        NOT NULL,
  dang_dung boolean     NOT NULL DEFAULT false,
  nguoi_sua text        NOT NULL DEFAULT '',
  sua_luc   timestamptz,
  tao_luc   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ky_nang (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  ma             text        NOT NULL,
  ten            text        NOT NULL,
  noi_dung       text        NOT NULL,
  bat_cho_nhom_sp text[]     NOT NULL DEFAULT '{}',   -- «bật cho nhóm sản phẩm nào»
  bat            boolean     NOT NULL DEFAULT false,
  phien_ban      int         NOT NULL DEFAULT 1,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma)
);

CREATE TABLE lich_nhac (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id      bigint      NOT NULL REFERENCES team(id),
  don_hang_id  bigint      REFERENCES don_hang(id) ON DELETE CASCADE,
  hoi_thoai_id bigint      REFERENCES hoi_thoai(id) ON DELETE CASCADE,
  loai         text        NOT NULL,
  hen_luc      timestamptz NOT NULL,
  lan_thu      int         NOT NULL DEFAULT 1 CHECK (lan_thu BETWEEN 1 AND 5),  -- tối đa 5 lần
  trang_thai   text        NOT NULL DEFAULT 'cho'
               CHECK (trang_thai IN ('cho','da_gui','da_huy')),
  huy_ly_do    text,
  tao_luc      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lich_nhac_cho ON lich_nhac (hen_luc) WHERE trang_thai = 'cho';

-- Nhật ký thao tác — CHỈ THÊM, ghi cả việc MÁY làm (01 §9).
CREATE TABLE nhat_ky (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  xay_ra_luc    timestamptz NOT NULL DEFAULT now(),
  tac_nhan      text        NOT NULL,   -- 'nguoi:<email>' | 'may:<ten-job>'
  nguoi_dung_id bigint      REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  hanh_dong     text        NOT NULL,
  doi_tuong     text        NOT NULL DEFAULT '',
  doi_tuong_id  text        NOT NULL DEFAULT '',
  truoc         jsonb,
  sau           jsonb,
  ghi_chu       text        NOT NULL DEFAULT ''
);
CREATE INDEX nhat_ky_team_luc ON nhat_ky (team_id, xay_ra_luc);

-- ─── RÀO Ở TẦNG DB ─────────────────────────────────────────────────────────

-- (1) Cấm gán thành viên vào team KỸ THUẬT. Chặn ở CẢ HAI cửa: thêm thành viên,
--     và lật cờ một team đang có người thành team kỹ thuật.
CREATE FUNCTION chan_tv_team_ky_thuat() RETURNS trigger AS $$
BEGIN
  IF (SELECT la_ky_thuat FROM team WHERE id = NEW.team_id) THEN
    RAISE EXCEPTION 'cam gan thanh vien vao team ky thuat (team_id=%)', NEW.team_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_chan_tv_team_ky_thuat
  BEFORE INSERT OR UPDATE ON thanh_vien_team
  FOR EACH ROW EXECUTE FUNCTION chan_tv_team_ky_thuat();

CREATE FUNCTION chan_lat_co_ky_thuat() RETURNS trigger AS $$
BEGIN
  IF NEW.la_ky_thuat AND NOT OLD.la_ky_thuat
     AND EXISTS (SELECT 1 FROM thanh_vien_team WHERE team_id = NEW.id) THEN
    RAISE EXCEPTION 'team % dang co thanh vien, khong the doi thanh team ky thuat', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_chan_lat_co_ky_thuat
  BEFORE UPDATE ON team
  FOR EACH ROW EXECUTE FUNCTION chan_lat_co_ky_thuat();

-- (2) CHỈ INSERT: nhat_ky và so_ai. Cấm UPDATE, cấm DELETE — kể cả của chủ CSDL.
CREATE FUNCTION chan_sua_xoa() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'bang % chi INSERT — cam % ', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'check_violation';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_chi_insert_nhat_ky
  BEFORE UPDATE OR DELETE ON nhat_ky
  FOR EACH ROW EXECUTE FUNCTION chan_sua_xoa();

CREATE TRIGGER tg_chi_insert_so_ai
  BEFORE UPDATE OR DELETE ON so_ai
  FOR EACH ROW EXECUTE FUNCTION chan_sua_xoa();

-- ─── SEED — 4 team + 5 vai (idempotent) ────────────────────────────────────
-- Ba team NGHIỆP VỤ (01 §8) + MỘT team KỸ THUẬT làm chỗ đậu cho dữ liệu di trú
-- chưa chốt chủ (chờ H7 §8 sổ điều hành). KHÔNG đoán team theo thị trường.
INSERT INTO team (slug, ten, la_ky_thuat) VALUES
  ('tieu-alpha', 'Tiểu Alpha', false),
  ('auus',       'Auus',       false),
  ('pialpha-eu', 'Pialpha EU', false),
  ('chua-phan',  'Chưa phân team (kỹ thuật)', true)
ON CONFLICT (slug) DO NOTHING;

-- Năm vai của 01 §9.
INSERT INTO vai (ma, ten) VALUES
  ('quan-tri',       'Quản trị'),
  ('marketer',       'Marketer'),
  ('sale',           'Sale'),
  ('quan-ly',        'Quản lý'),
  ('duyet-kich-ban', 'Người duyệt kịch bản')
ON CONFLICT (ma) DO NOTHING;

-- ─── 002_ket_noi_pos ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 002_ket_noi_pos — KẾT NỐI POS THEO TEAM (phiếu L1-M1 ②.1)
--
-- VÌ SAO CÓ BẢNG NÀY: 01-QUYET-DINH.md §8 đòi «mỗi team có kết nối POS riêng»,
-- nhưng 19 bảng của 001_nen không có chỗ nào chứa nó — khoá POS thật đang nằm
-- trong tệp phẳng `pancake-shops.json` ở gốc repo (7 dòng {market, shop_id,
-- api_key}, đo 22/08). Tệp phẳng không mang team, không mã hoá, và mọi tiến
-- trình đọc được đĩa là đọc được khoá.
--
-- HAI RÀO Ở TẦNG CSDL (không chỉ ở code):
--   · `api_key_ma` phải là bao thư MÃ HOÁ  → CHECK ... LIKE 'v1.%'
--     Cùng cơ chế `db/khoa.js` (AES-256-GCM, khoá gốc ở biến V3_KHOA_MA_HOA)
--     đã dùng cho `cau_hinh_model.khoa_api_ma`. Code quên gọi maHoa() thì
--     INSERT đỏ ngay, không lặng lẽ ghi khoá nguyên văn vào cột.
--   · `team_id NOT NULL REFERENCES team(id)` — giống mọi bảng nghiệp vụ khác.
--
-- ⛔ Bảng này KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn L0-M2
--    (src/db/truy-van.js — neo 15 tên gõ tay). Cố ý: nó chứa BÍ MẬT, đọc nó là
--    đọc khoá POS, nên nó có bộ đọc/ghi RIÊNG (`src/pos/ket-noi.js`,
--    `db/di-tru/ket-noi-pos.js`) đúng theo án lệ `ghiCauHinhModel` của L0-M1 —
--    không mở nó ra cho một hàm đọc chung `SELECT *`.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE ket_noi_pos (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    bigint      NOT NULL REFERENCES team(id),
  -- Tên thị trường đúng như `pancake-shops.json` (Saudi/UAE/Kuwait/…): đây là
  -- khoá NGƯỜI dùng để gọi cửa POS, vì `don_hang` không có cột shop.
  market     text        NOT NULL,
  shop_id    text        NOT NULL,
  api_key_ma text        NOT NULL CHECK (api_key_ma LIKE 'v1.%'),
  bat        boolean     NOT NULL DEFAULT true,
  tao_luc    timestamptz NOT NULL DEFAULT now(),
  sua_luc    timestamptz NOT NULL DEFAULT now(),
  -- Một team KHÔNG có hai kết nối cho cùng một thị trường, và không có hai
  -- thị trường trỏ về cùng một shop — cả hai đều là lỗi cấu hình câm.
  UNIQUE (team_id, market),
  UNIQUE (team_id, shop_id)
);

CREATE INDEX ket_noi_pos_team ON ket_noi_pos (team_id);

COMMENT ON TABLE  ket_noi_pos            IS 'Kết nối POS Pancake theo team (01 §8). Khoá API lưu MÃ HOÁ, đọc qua src/pos/ket-noi.js.';
COMMENT ON COLUMN ket_noi_pos.market     IS 'Tên thị trường như pancake-shops.json — khoá gọi cửa POS.';
COMMENT ON COLUMN ket_noi_pos.api_key_ma IS 'Bao thư v1.<iv>.<tag>.<ct> (AES-256-GCM, db/khoa.js). CẤM ghi nguyên văn.';

-- ─── 003_tin_cho_xu_ly ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 003_tin_cho_xu_ly — HÀNG ĐỢI TIN (phiếu L2-M1 ②.1)
--
-- VÌ SAO CÓ BẢNG NÀY: bản đang chạy xử lý tin NGAY TRONG vòng poll
-- (`src/pancake-poll.js` → `handleIncoming` → gửi), nên «đọc tin» và «trả lời»
-- dính làm một. Hệ quả đo được ở bản cũ: một lượt model chậm giữ luôn slot của
-- vòng poll; một tiến trình chết giữa lượt là tin biến mất không dấu vết; và
-- không có chỗ nào ghi «tin này đã xử chưa» ngoài RAM.
-- 02-KE-HOACH-CODE.md §L2 đòi tách hai việc: POLL chỉ NẠP, WORKER mới xử lý.
-- Bảng này là chỗ nối giữa hai việc đó — và là chỗ DUY NHẤT nhớ được trạng thái
-- của một tin qua restart.
--
-- BA RÀO Ở TẦNG CSDL (không chỉ ở code):
--   · UNIQUE (page_id, conv_id, msg_id) — vòng poll chạy lại 6 giây một lần và
--     Pancake trả lại y nguyên các tin cũ. Không có rào này thì mỗi vòng poll đẻ
--     thêm một bản sao của CÙNG MỘT tin ⇒ khách nhận n câu trả lời. Bộ nạp dùng
--     `ON CONFLICT DO NOTHING` trên đúng bộ ba này.
--   · CHECK trang_thai — năm giá trị, KHÔNG phải bốn:
--       cho        · chờ tới lượt
--       dang_xu    · một worker đang giữ (khoá dòng + khoá hội thoại)
--       xong       · đã trả lời khách
--       loi        · hỏng, còn được thử lại tới trần `so_lan_thu`
--       chan_guard · CỬA GỬI ĐÓNG (V3_PANCAKE_GUI/PANCAKE_READONLY) — ⛔ KHÔNG
--                    retry. Tách khỏi `loi` vì hai thứ này khác nhau về TIỀN:
--                    `loi` là mạng chập chờn, thử lại thì lần sau có thể qua;
--                    cửa đóng là một QUYẾT ĐỊNH của môi trường, thử lại chỉ đốt
--                    thêm một lượt model nữa cho một tin chắc chắn không gửi được.
--   · team_id NOT NULL REFERENCES team(id) — như mọi bảng nghiệp vụ khác.
--
-- ⛔ Bảng này KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn L0-M2
--    (src/db/truy-van.js — vẫn 15 tên, phiếu này không đụng thư mục đó). Cố ý:
--    worker phải rút việc bằng `FOR UPDATE SKIP LOCKED` CỘNG
--    `pg_try_advisory_xact_lock(hashtext(conv_id))`, hai thứ mà một hàm
--    `layNhieu` chung không có cách nào diễn đạt. Bộ đọc/ghi riêng nằm ở
--    `src/queue/kho.js` — cùng tiền lệ `ket_noi_pos` (002) và `ghiCauHinhModel`
--    (001), và `kho.js` LUÔN kẹp `team_id` vào mọi câu.
--
-- ⚠️ `page_id` ở bảng này là id Facebook dạng TEXT (khoá tự nhiên), KHÔNG phải
--    `page.id` bigint — đúng khoá mà cửa Messenger v3 nhận vào
--    (`docs/v3/ban-giao/cua-messenger-v1.md` §1) nên worker không phải dịch khoá.
--    Cũng vì vậy KHÔNG có FK tới `page`: tin của một page chưa kịp vào sổ cái vẫn
--    phải nằm được trong hàng đợi để người ta còn nhìn thấy nó (3 page LẠC của
--    §9 sổ điều hành là ca thật).
-- ⚠️ `conv_id` (id hội thoại của Pancake) ≠ `psid` (Page-Scoped ID của khách).
--    Giữ CẢ HAI: `conv_id` để gọi API, `psid` để tra `hoi_thoai` UNIQUE(page,psid).
--    Xem `docs/v3/ban-giao/cua-messenger-v1.md` §2.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE tin_cho_xu_ly (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     bigint      NOT NULL REFERENCES team(id),
  page_id     text        NOT NULL,
  psid        text        NOT NULL,
  conv_id     text        NOT NULL,
  cust_id     text        NOT NULL DEFAULT '',
  msg_id      text        NOT NULL,
  noi_dung    text        NOT NULL,
  trang_thai  text        NOT NULL DEFAULT 'cho'
              CHECK (trang_thai IN ('cho', 'dang_xu', 'xong', 'loi', 'chan_guard')),
  so_lan_thu  int         NOT NULL DEFAULT 0 CHECK (so_lan_thu >= 0),
  khoa_worker text,
  -- Vì sao tin đứng ở trạng thái hiện tại. Trạng thái nói CÁI GÌ, cột này nói TẠI SAO —
  -- thiếu nó thì một hàng đợi đầy 'loi' không đọc ra được điều gì.
  ly_do       text        NOT NULL DEFAULT '',
  thoi_diem   timestamptz NOT NULL DEFAULT now(),
  sua_luc     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, conv_id, msg_id)
);

-- Câu rút việc của worker quét đúng `trang_thai='cho'` theo thứ tự id. Index bộ phận
-- vì 99% dòng của bảng sẽ ở 'xong' sau vài phút — quét cả bảng để tìm vài dòng 'cho'
-- là cách chắc chắn làm vòng worker chậm dần theo tuổi hệ thống.
CREATE INDEX tin_cho_xu_ly_cho ON tin_cho_xu_ly (id) WHERE trang_thai = 'cho';
CREATE INDEX tin_cho_xu_ly_team ON tin_cho_xu_ly (team_id);
CREATE INDEX tin_cho_xu_ly_conv ON tin_cho_xu_ly (page_id, conv_id);

COMMENT ON TABLE  tin_cho_xu_ly             IS 'Hàng đợi tin Messenger chờ worker xử lý (02 §L2). Poll chỉ NẠP, worker mới xử.';
COMMENT ON COLUMN tin_cho_xu_ly.page_id     IS 'id Facebook dạng text — khoá cửa Messenger v3 nhận, KHÔNG phải page.id bigint.';
COMMENT ON COLUMN tin_cho_xu_ly.conv_id     IS 'id hội thoại của Pancake (≠ psid). Khoá của advisory lock theo hội thoại.';
COMMENT ON COLUMN tin_cho_xu_ly.trang_thai  IS 'cho|dang_xu|xong|loi|chan_guard. chan_guard = cửa gửi ĐÓNG, KHÔNG retry.';
COMMENT ON COLUMN tin_cho_xu_ly.so_lan_thu  IS 'Tăng 1 mỗi lượt worker RÚT được tin. Trần ở src/queue/worker.js.';

-- ─── 004_trang_thai_don ───────────────────────────────────────────────────────

-- 004_trang_thai_don — hai cột cho MÁY TRẠNG THÁI ĐƠN (phiếu L3-M1, finding N2).
--
-- ĐO TRƯỚC KHI THÊM (22/08/2026, CSDL dev `aicloser_v3`, 26 đơn thật):
--   information_schema.columns của `don_hang` có ĐÚNG 14 cột, KHÔNG cột nào chứa được
--   «vì sao đơn này không gửi được WhatsApp» hay «đã thử mấy lần». Không có cột jsonb,
--   không có cột text rỗng dùng tạm. Nhét lý do vào `trang_thai_he` là hỏng chính cột
--   máy trạng thái rẽ nhánh (và hỏng index `don_hang_nguon`); nhét vào `nhat_ky` thì
--   đếm «3 lý do 1/1/1» phải DISTINCT ON trên một bảng chỉ-INSERT, và số lần thử không
--   có chỗ đứng. Nên: hai cột, khai hẹp nhất có thể.
--
-- ⛔ Số bản 004 do TỔNG cấp (003 là của phiếu L2-M1 đang chạy song song — án lệ khe/trùng
--    số migration). Bản này chỉ ALTER `don_hang`, không đụng bảng nào của 003.

ALTER TABLE don_hang
  -- Vì sao KHÔNG gửi được mẫu WhatsApp — chỉ có nghĩa khi trang_thai_he='gui_wa_loi'.
  -- Deny-by-default ở tầng CSDL: thêm lý do thứ tư PHẢI qua một migration (án lệ «danh
  -- sách gõ tay là lỗ hẹn giờ» — allow-list trên cột TEXT tự do thì giá trị mới lách van).
  -- Ba giá trị này là ba gạch nghiệm thu của 02 §L3, không phải ba giá trị tiện tay.
  ADD COLUMN ly_do_khong_gui text
    CHECK (ly_do_khong_gui IS NULL
           OR ly_do_khong_gui IN ('thieu_so_wa','mau_chua_duyet','loi_kenh')),
  -- Số lượt đã THỬ gửi (job quét lại `gui_wa_loi` có trần). Không NULL — «chưa thử lần
  -- nào» là 0, không phải «không biết»; NULL ở đây làm phép so trần im lặng thành NULL.
  ADD COLUMN so_lan_thu_wa integer NOT NULL DEFAULT 0
    CHECK (so_lan_thu_wa >= 0);

-- Bất biến ĐÔI: lý do chỉ tồn tại cùng trạng thái thất bại. Không có ràng buộc này thì
-- một đơn `da_gui_wa` vẫn đeo `ly_do_khong_gui='loi_kenh'` cũ và mọi phép đếm theo lý do
-- đọc ra số cao hơn sự thật (đúng bệnh «cổng lỏng mà log nói dối»).
ALTER TABLE don_hang
  ADD CONSTRAINT don_hang_ly_do_theo_trang_thai
  CHECK (ly_do_khong_gui IS NULL OR trang_thai_he = 'gui_wa_loi');

-- ─── 005_loc_trung_va_ti_le_hoan ───────────────────────────────────────────────────────

-- 005_loc_trung_va_ti_le_hoan — cột + index cho LỌC TRÙNG CHÉO và CHẤM TỈ LỆ HOÀN
-- (phiếu L3-M2). Số bản 005 do TỔNG cấp (án lệ #25 khe/trùng số migration).
--
-- ⛔ KHÔNG thêm bảng nào (`grep -c '^CREATE TABLE' = 0`) ⇒ thước l0-m1 vẫn đọc 21 bảng,
--    không phải tự vá NEO như án lệ bản 003.
--
-- ═══ ĐO TRƯỚC KHI THÊM — 23/08/2026 ═══════════════════════════════════════════
-- (a) CSDL dev `aicloser_v3`: `khach` có 9 cột, KHÔNG có chỗ nào chứa «tầng hoàn»;
--     `ti_le_hoan numeric(5,2)` có sẵn nhưng KHÔNG khai đơn vị (0–1 hay 0–100?) và
--     không có tử/mẫu nên một con số 0.50 không tra ngược được là 1/2 hay 50/100.
-- (b) `don_hang` có 16 cột (14 của 001 + 2 của 004), KHÔNG cột nào giữ SẢN PHẨM —
--     mà nghiệm thu 02 §L3 là «đặt trang bán hàng rồi chat Messenger CÙNG SẢN PHẨM
--     → bị bắt là trùng». Không có cột này thì vế «cùng sản phẩm» không tồn tại.
-- (c) POS THẬT trả sản phẩm ở `items[].variation_id` trên 4.935/5.144 đơn (95,9%),
--     một đơn có NHIỀU dòng hàng ⇒ cột phải là MẢNG, không phải một text (đo 7/7 shop).
ALTER TABLE khach
  -- BỐN TẦNG hoàn (01 §11 «chia bốn tầng thay vì một ngưỡng») + MỘT nhãn vắng mặt.
  -- `chua_du_don` KHÔNG phải tầng thứ năm: nó là câu «chưa đủ dữ liệu để xếp tầng»,
  -- có tên riêng vì để NULL là im lặng — và im lặng ở đây đọc nhầm thành «hàng ngon».
  -- ĐO 23/08 trên 5.144 đơn thật/7 shop: 859 khách có ĐÚNG MỘT đơn đã kết và đơn đó
  -- hoàn ⇒ tỉ lệ 100%. Xếp họ vào `rui_ro_cao` bằng một điểm dữ liệu là bịa.
  ADD COLUMN IF NOT EXISTS tang_hoan text,
  -- TỬ và MẪU của chính con số `ti_le_hoan` — để một tầng luôn tra ngược được.
  -- «So DANH SÁCH, không so SỐ»: lưu mỗi tỉ lệ thì không ai kiểm được nó tính trên
  -- 2 đơn hay 200 đơn, mà đó đúng là khác biệt giữa nhiễu và bằng chứng.
  ADD COLUMN IF NOT EXISTS so_don_ket  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS so_don_hoan integer NOT NULL DEFAULT 0,
  -- Lượt chấm gần nhất. Tuổi PHÉP ĐO ≠ tuổi SỰ VIỆC (án lệ #9): thiếu cột này thì
  -- một tầng chấm từ 3 tháng trước trông y hệt tầng chấm đêm qua.
  ADD COLUMN IF NOT EXISTS cham_hoan_luc timestamptz;

ALTER TABLE don_hang
  -- Mã biến thể POS của các dòng hàng, khuôn `"<shop_id>:<variation_id>"` (cùng khoá
  -- với `san_pham.ma` của L1-M1). MẢNG vì một đơn có nhiều dòng hàng.
  -- ⚠️ NÓI THẲNG: cột này CHƯA CÓ NGƯỜI GHI — cửa POS `src/pos/doc-don.js` là chủ,
  -- đất phiếu L1-M1 (án lệ #25, đã ghi §9 sổ). `kiemTrung` xử cột rỗng bằng nhánh
  -- «mù CÓ NÓI RA» (`nghi_trung_chua_ro_san_pham`), không im lặng cho qua.
  ADD COLUMN IF NOT EXISTS san_pham_ma text[];

DO $$
BEGIN
  -- Bốn tầng + nhãn vắng mặt, deny-by-default ở TẦNG CSDL (án lệ #22: allow-list trên
  -- cột TEXT tự do là lỗ hẹn giờ — thêm tầng thứ sáu PHẢI qua một migration).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_tang_hoan_hop_le') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_tang_hoan_hop_le
      CHECK (tang_hoan IS NULL OR tang_hoan IN
             ('chua_du_don','tot','binh_thuong','canh_bao','rui_ro_cao'));
  END IF;

  -- ĐƠN VỊ khai ở tầng CSDL, không phải trong một comment ai cũng quên: PHẦN TRĂM
  -- 0–100. Cột `numeric(5,2)` nhận cả 0.45 lẫn 45.00 nên nếu không kẹp thì hai người
  -- viết hai đường sẽ cùng «đúng» và lệch nhau 100 lần (đúng họ lỗi ×100 của M07).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_ti_le_hoan_phan_tram') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_ti_le_hoan_phan_tram
      CHECK (ti_le_hoan IS NULL OR (ti_le_hoan >= 0 AND ti_le_hoan <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_dem_hoan_hop_le') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_dem_hoan_hop_le
      CHECK (so_don_ket >= 0 AND so_don_hoan >= 0 AND so_don_hoan <= so_don_ket);
  END IF;

  -- Bất biến ĐÔI, cùng khuôn với `don_hang_ly_do_theo_trang_thai` của 004: một tầng
  -- KHÔNG được tồn tại mà không có mốc chấm ra nó, và ngược lại. Thiếu ràng buộc này
  -- thì một lượt job hỏng nửa chừng để lại tầng mồ côi không ai biết tuổi.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_tang_di_kem_moc_cham') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_tang_di_kem_moc_cham
      CHECK ((tang_hoan IS NULL) = (cham_hoan_luc IS NULL));
  END IF;
END $$;

COMMENT ON COLUMN khach.ti_le_hoan IS
  'Tỉ lệ hoàn/hủy tính theo PHẦN TRĂM 0–100 (KHÔNG phải phân số 0–1). Tử = so_don_hoan, mẫu = so_don_ket. Chủ cột: src/orders/ti-le-hoan.js (phiếu L3-M2).';
COMMENT ON COLUMN khach.tang_hoan IS
  'Bốn tầng của 01 §11 + nhãn chua_du_don (chưa đủ đơn ĐÃ KẾT để xếp tầng). CHỈ ĐỂ ĐỌC — không nhánh nào trong v3 chặn đơn theo cột này (quyết định CHẶN còn Chờ chốt ở 01 §11).';
COMMENT ON COLUMN don_hang.san_pham_ma IS
  'Mã biến thể POS "<shop_id>:<variation_id>" của các dòng hàng. Chủ cột: cửa POS src/pos/doc-don.js (L1-M1) — CHƯA ghi, xem §9 sổ điều hành.';

-- ═══ INDEX ════════════════════════════════════════════════════════════════════
-- (1) Tra khách theo SĐT khi hai luồng khai LỆCH ĐỊNH DẠNG. Luật chuẩn hoá SỐNG Ở
--     MỘT CHỖ DUY NHẤT là `chuanHoaSdt()` trong JS; index này CỐ Ý chỉ giữ BẢY CHỮ SỐ
--     CUỐI — một vế thô, bao rộng hơn luật thật, để câu SQL lọc được bằng index rồi
--     JS phán chính xác. Viết lại luật chuẩn hoá bằng SQL ở đây là đẻ nguồn luật thứ
--     hai (án lệ: hai nguồn một luật thì chúng trôi khỏi nhau, và trôi im lặng).
--     Vì sao BẢY CHỮ SỐ CUỐI là vế an toàn: chuẩn hoá chỉ CẮT TIỀN TỐ (+, 00, số 0
--     đầu, mã quốc gia) nên hai số bằng nhau sau chuẩn hoá luôn có đuôi giống nhau.
--     Đo 23/08 trên 5.144 đơn thật: số ngắn nhất còn 7 chữ số.
CREATE INDEX IF NOT EXISTS khach_duoi7_sdt
  ON khach (team_id, right(regexp_replace(so_dien_thoai, '[^0-9]', '', 'g'), 7))
  WHERE so_dien_thoai IS NOT NULL;

-- (2) Cửa sổ ngày của phép lọc trùng quét theo (team, khách, ngày tạo).
CREATE INDEX IF NOT EXISTS don_hang_khach_ngay
  ON don_hang (team_id, khach_id, tao_luc)
  WHERE khach_id IS NOT NULL;

-- (3) Giao mảng sản phẩm (`san_pham_ma && ARRAY[...]`) — GIN là chỉ mục của phép `&&`.
CREATE INDEX IF NOT EXISTS don_hang_san_pham_ma
  ON don_hang USING gin (san_pham_ma);

-- ─── 006_lich_su_trang_thai ───────────────────────────────────────────────────────

-- 006_lich_su_trang_thai — cột `status_history` (jsonb) trên `don_hang` (phiếu VA-Q12,
-- Q3 — nếu làm). Số bản 006 do TỔNG cấp SẴN trong phiếu (án lệ #25 khe/trùng migration).
--
-- ⛔ KHÔNG thêm bảng nào (`grep -c '^CREATE TABLE' = 0`) ⇒ thước l0-m1 vẫn đọc 21 bảng.
--
-- ═══ ĐO TRƯỚC KHI THÊM — 23/08/2026 (SO-DIEU-HANH-THI-CONG.md §9 nợ Q3) ═══════════
-- Job chấm tỉ lệ hoàn (`src/orders/ti-le-hoan.js`) hôm nay chấm bằng ẢNH CHỤP
-- `don_hang.trang_thai_pos` vì cửa POS không lưu lịch sử chuyển trạng thái xuống cột
-- nào. Độ lệch đo được giữa «lịch sử TỪNG chạm {4,5,6,7}» và «hiện tại thuộc {4,5,6,7}»
-- là 4/5.144 đơn thật (0,08%) — nhỏ, không gấp, nhưng POS trả sẵn `status_history` trên
-- 5.144/5.144 đơn (mảng {status, old_status, editor, updated_at, …}), chỉ thiếu lượt
-- ghi. Bản này CHỈ LƯU — không hàm nào trong phiếu VA-Q12 ĐỌC cột này để tính tỉ lệ
-- hoàn (chủ đọc là `src/orders/ti-le-hoan.js`, ngoài pathspec VA-Q12, xem §9 nợ Q3
-- phần còn lại: «Xoá nốt 0,08% = cửa POS lưu status_history — đất L1-M1»).
ALTER TABLE don_hang
  ADD COLUMN IF NOT EXISTS status_history jsonb;

COMMENT ON COLUMN don_hang.status_history IS
  'Lịch sử chuyển trạng thái RAW từ POS (mảng {status, old_status, editor, updated_at, …}), ghi nguyên văn KHÔNG diễn giải. Chủ cột: src/pos/doc-don.js (phiếu VA-Q12). CHƯA có job nào đọc cột này (job chấm tỉ lệ hoàn vẫn chấm bằng ảnh chụp trang_thai_pos) — xem SO-DIEU-HANH-THI-CONG.md §9 nợ Q3.';

-- ─── 007_idempotent_tao_don_va_don_vi_tien ───────────────────────────────────────────────────────

-- 007_idempotent_tao_don_va_don_vi_tien — CỤM VÁ VA-R2 (RF-12 · RF-9).
-- Số bản 007 do phiếu VA-R2 (§5b sổ điều hành) cấp — án lệ #25 (khe/trùng số migration
-- khi có worktree song song). CÙNG SÓNG: VA-R1/R3/R4 KHÔNG đụng db/migrate.
--
-- ⛔ KHÔNG thêm bảng nào (`grep -c '^CREATE TABLE' = 0`) ⇒ thước l0-m1 vẫn đọc 21 bảng,
--    không tự vá NEO. Chỉ thêm MỘT index idempotent + hai COMMENT khai đơn vị.
--
-- ═══ RF-12 · IDEMPOTENT «MỘT hàng chờ = NHIỀU NHẤT MỘT đơn POS thành công» ══════════
-- Ca «POST THÀNH CÔNG rồi giao dịch duyet() ROLLBACK» (repro F4): đơn THẬT đã sinh trên
-- POS, `hang_cho.don_hang_id` bị rollback trả về null, và nhật ký hai pha CÂN BẰNG nên
-- cửa (c)③ mồ-côi mù. Dấu DUY NHẤT sống qua rollback là dòng `nhat_ky` (bảng chỉ-INSERT,
-- ghi trên POOL GỐC ngoài giao dịch) mang `hanh_dong='pos_tao_don_ket_qua'` VÀ
-- `sau->>'ma_pos'` (POS đã nhận đơn). UNIQUE CỨNG ở tầng DB: KHÔNG BAO GIỜ có hai
-- `ket_qua` thành công cho cùng một hàng chờ (án lệ #31 — cửa RA đúng một cái). Lượt POS
-- bị TỪ CHỐI ghi `ket_qua` KHÔNG mang `ma_pos` nên KHÔNG rơi vào index (partial WHERE)
-- ⇒ vẫn cho thử lại, đúng nghiệp vụ. Cửa `tao-don.js` (lớp c③b) đọc chính dấu này TRƯỚC
-- POST để chặn ÊM; index là chốt cứng cuối nếu cửa bị vượt (race không lường).
CREATE UNIQUE INDEX IF NOT EXISTS nhat_ky_pos_ket_qua_thanh_cong_moi_hang_cho
  ON nhat_ky (team_id, doi_tuong_id)
  WHERE doi_tuong = 'hang_cho_tao_don'
    AND hanh_dong = 'pos_tao_don_ket_qua'
    AND (sau ->> 'ma_pos') IS NOT NULL;

-- ═══ RF-9 · ĐƠN VỊ TIỀN KHAI MỘT NGUỒN — đơn vị nhỏ POS (minor), kèm tệ ═════════════
-- `goi_gia.gia` và `don_hang.tong_tien` LƯU đơn vị nhỏ POS (= `retail_price` POS, vốn đã
-- minor), MỖI số đi kèm cột `tien_te`. Cửa tạo đơn (`src/pos/tao-don.js`) dùng THẲNG con
-- số này khi dựng `shipping_fee`, KHÔNG nhân `HE_SO_TE` lần nữa — nhân đúp = thu 1.500
-- AED thay vì 15,00. Dự án ĐA TỆ Trung Đông: hệ số khác nhau theo tệ (AED/SAR/QAR/USD
-- ×100 · KWD/OMR/BHD ×1000), độc-lập-tệ, KHÔNG quy về một tệ neo, KHÔNG có VND.
COMMENT ON COLUMN goi_gia.gia IS
  'Giá Ở ĐƠN VỊ NHỎ (minor) của POS — = retail_price POS ghi thẳng (src/pos/doc-danh-muc.js), KÈM cột tien_te. Cửa tạo đơn (src/pos/tao-don.js) dùng TRỰC TIẾP, KHÔNG nhân HE_SO_TE lần nữa (RF-9). Đa tệ độc-lập-tệ, KHÔNG VND.';
COMMENT ON COLUMN don_hang.tong_tien IS
  'Tổng tiền đơn Ở ĐƠN VỊ NHỎ (minor) của POS, KÈM cột tien_te — cùng đơn vị với goi_gia.gia. KHÔNG nhân HE_SO_TE khi dựng payload POST (RF-9).';

-- ─── 008_khoa_theo_nha ───────────────────────────────────────────────────────

-- 008 · KHOÁ API LƯU MỘT BẢN CHO MỖI (TEAM × NHÀ) — thi hành PHIEU-B-Y2.
--
-- ═══ VÌ SAO ═══════════════════════════════════════════════════════════════════
-- `cau_hinh_model` là BA dòng một team (`UNIQUE (team_id, vai_tro)`), và 001 đặt
-- `khoa_api_ma` trên TỪNG dòng vai trò. Nhưng khoá API thuộc về NHÀ CUNG CẤP, không
-- thuộc về vai trò. Một team xếp `chinh=kimi-k2.6` và `nen=kimi-k2.5` là cùng một khoá
-- Kimi bị lưu HAI BẢN. Ngày đổi khoá mà chỉ sửa ô «chính» thì ô «nền» giữ khoá cũ:
-- chat với khách VẪN CHẠY, việc nền CHẾT CÂM (mổ hội thoại, đề xuất kịch bản, chạy đêm).
-- Không dòng lỗi nào nói «bạn quên một bản khoá»; triệu chứng chỉ là báo cáo trống dần.
-- Cùng họ với `NHOM_HUY_HOAN` ở §9 — «bản khai thứ hai cùng giá trị».
--
-- ═══ VÌ SAO ĐỔI BÂY GIỜ ═══════════════════════════════════════════════════════
-- Đo 25/08 trên `aicloser_v3` (169.58.33.8): `cau_hinh_model` có **0 DÒNG**. Chưa ai
-- nhập khoá thật ⇒ đổi lúc này KHÔNG phải di trú dữ liệu, chỉ là đổi hình. Đợi tới lúc
-- ba team đã nhập khoá rồi mới đổi thì phải viết bộ di trú biết GIẢI MÃ và MÃ HOÁ LẠI.
--
-- ⛔ `khoa_nha` CỐ Ý không nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn: nó chứa
--    khoá đã mã hoá, nên chỉ đi qua `db/khoa.js` — đúng tiền lệ `ket_noi_pos` (002).

CREATE TABLE khoa_nha (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id      bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  nha_cung_cap text        NOT NULL,
  -- ⛔ CẤM ghi khoá nguyên văn. Rào này THEO CỘT sang bảng mới, không được rơi mất:
  --    nó là chỗ bắt «code quên gọi maHoa()» ở tầng CSDL, chứ không phải ở tầng code.
  khoa_api_ma  text        CHECK (khoa_api_ma IS NULL OR khoa_api_ma LIKE 'v1.%'),
  tao_luc      timestamptz NOT NULL DEFAULT now(),
  sua_luc      timestamptz NOT NULL DEFAULT now(),
  -- Đây là cả cái lý do của migration này: MỘT bản khoá cho mỗi (team × nhà).
  UNIQUE (team_id, nha_cung_cap)
);

-- Di trú dữ liệu. Hôm nay 0 dòng, nhưng câu này phải ĐÚNG kể cả khi có dòng — migration
-- còn chạy lại trên bản sao của CSDL cũ, và ở đó cái bug hai-bản có thể đã xảy ra rồi.
-- Hai dòng cùng (team × nhà) mà khoá LỆCH nhau thì lấy bản `sua_luc` mới nhất, và KÊU
-- ra chứ không nuốt: chọn hộ trong im lặng là làm mất một khoá mà không ai biết.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT team_id, nha_cung_cap, count(DISTINCT khoa_api_ma) AS n
      FROM cau_hinh_model WHERE khoa_api_ma IS NOT NULL
     GROUP BY 1, 2 HAVING count(DISTINCT khoa_api_ma) > 1
  LOOP
    RAISE WARNING '[008] team_id=% nha=% có % bản khoá KHÁC NHAU — lấy bản sua_luc mới nhất, % bản còn lại bị bỏ. Đây chính là cái lỗi migration này vá.',
      r.team_id, r.nha_cung_cap, r.n, r.n - 1;
  END LOOP;
END $$;

INSERT INTO khoa_nha (team_id, nha_cung_cap, khoa_api_ma)
SELECT DISTINCT ON (team_id, nha_cung_cap) team_id, nha_cung_cap, khoa_api_ma
  FROM cau_hinh_model
 WHERE khoa_api_ma IS NOT NULL
 ORDER BY team_id, nha_cung_cap, sua_luc DESC, id DESC;

ALTER TABLE cau_hinh_model DROP COLUMN khoa_api_ma;

-- ─── 009_phien_ban_noi_dung ───────────────────────────────────────────────────────

-- 009 · PHIÊN BẢN + DUYỆT cho bộ luật chung và kỹ năng (G2-A4).
--
-- ═══ VÌ SAO ═══════════════════════════════════════════════════════════════════
-- Bộ luật chung là 2.256 token DÙNG CHUNG cho mọi page đang bật bot. Sửa sai một dòng là
-- 51 page đổi cách nói với khách trong MỘT lượt. Sổ giao việc ghi thẳng: không có phiên
-- bản và không lùi được thì đừng cho sửa.
--
-- ═══ RÀNG BUỘC THIẾT KẾ: KHÔNG ĐƯỢC ĐẬP MÀN NGƯỜI B VỪA DỰNG ══════════════════
-- `v3/src/ui/bo-luat/` và `v3/src/ui/ky-nang/` đã chạy trên lược đồ hiện tại. Nên bản này
-- CỘNG THÊM, không đổi hình cái đang có:
--
--   · `bo_luat_chung` VỐN ĐÃ nhiều dòng một team (đó là cách B làm phiên bản) ⇒ chỉ thêm
--     cột duyệt + chỉ mục. `dang_dung` GIỮ NGUYÊN là cờ LIVE duy nhất — thêm một cột
--     `trang_thai` song song là đẻ bản khai thứ hai cho cùng một sự thật (án lệ đã có).
--   · `ky_nang` thì KHÔNG: màn của B đọc `db.chon('ky_nang', {})` và hiện mỗi dòng là một
--     kỹ năng. Nhét phiên bản vào chính bảng đó là màn của họ hiện một kỹ năng thành N
--     dòng. Nên lịch sử đi ra bảng RIÊNG `ky_nang_lich_su`, và `UNIQUE (team_id, ma)`
--     của bảng gốc GIỮ NGUYÊN.
--
-- ═══ RF-17 ĐÓNG Ở ĐÂY ═════════════════════════════════════════════════════════
-- §9 sổ điều hành, 23/08: «`bo_luat_chung` thiếu UNIQUE + `seedBoLuatChung` SELECT-rồi-
-- INSERT không atomic ⇒ dup luật toàn hệ khi chạy song song». Và `apPhienBan()` của B hạ
-- bản cũ rồi dựng bản mới bằng HAI lời gọi rời — hai lượt áp đồng thời có thể để lại hai
-- bản `dang_dung=true`, mà `docBoLuatChung` thì che đi bằng cách lấy `phien_ban` cao nhất.
-- Chỉ mục dưới đây làm trạng thái đó KHÔNG TỒN TẠI ĐƯỢC nữa.

-- ── bộ luật chung ────────────────────────────────────────────────────────────
ALTER TABLE bo_luat_chung
  -- 01-QUYET-DINH §9: «Kịch bản do NGƯỜI viết thì áp thẳng. Đề xuất của AI thì PHẢI có
  -- người duyệt mới áp.» Hai đường khác nhau ⇒ phải phân biệt được nguồn.
  ADD COLUMN nguon     text NOT NULL DEFAULT 'nguoi' CHECK (nguon IN ('nguoi', 'ai')),
  ADD COLUMN duyet_boi text,
  ADD COLUMN duyet_luc timestamptz,
  ADD COLUMN ghi_chu   text NOT NULL DEFAULT '';

COMMENT ON COLUMN bo_luat_chung.duyet_luc IS
  'NULL = chưa duyệt. Cửa `apBoLuat()` từ chối áp bản chưa duyệt khi nguon=ai. Chưa đặt '
  'CHECK ở tầng CSDL vì màn của người B còn ghi thẳng qua db.sua() — siết sau khi B đổi '
  'sang gọi apBoLuat() (cutover hai bước, ghi §9).';

-- ⚠️ `team_id` NULLABLE (NULL = luật toàn hệ) và trong Postgres hai NULL là KHÁC nhau, nên
--    `UNIQUE (team_id) WHERE dang_dung` KHÔNG ràng được dòng toàn hệ. Phải COALESCE.
CREATE UNIQUE INDEX bo_luat_chung_mot_ban_dang_ap
  ON bo_luat_chung (COALESCE(team_id, 0)) WHERE dang_dung;

CREATE UNIQUE INDEX bo_luat_chung_phien_ban_duy_nhat
  ON bo_luat_chung (COALESCE(team_id, 0), phien_ban);

-- ── kỹ năng: lịch sử ra bảng RIÊNG ───────────────────────────────────────────
-- Bảng gốc `ky_nang` giữ đúng MỘT dòng mỗi (team, ma) = bản ĐANG DÙNG. Mỗi lượt sửa đẩy
-- ảnh của bản cũ vào đây trước khi ghi đè, nên lùi được mà màn hình của B không đổi hình.
CREATE TABLE ky_nang_lich_su (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id         bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  ma              text        NOT NULL,
  phien_ban       int         NOT NULL,
  ten             text        NOT NULL,
  noi_dung        text        NOT NULL,
  bat_cho_nhom_sp text[]      NOT NULL DEFAULT '{}',
  bat             boolean     NOT NULL,
  nguon           text        NOT NULL DEFAULT 'nguoi' CHECK (nguon IN ('nguoi', 'ai')),
  nguoi_sua       text        NOT NULL DEFAULT '',
  ghi_chu         text        NOT NULL DEFAULT '',
  duyet_boi       text,
  duyet_luc       timestamptz,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma, phien_ban)
);

CREATE INDEX ky_nang_lich_su_tra ON ky_nang_lich_su (team_id, ma, phien_ban DESC);

COMMENT ON TABLE ky_nang_lich_su IS
  'Ảnh các bản CŨ của ky_nang. Bản ĐANG DÙNG nằm ở chính bảng ky_nang (một dòng mỗi '
  'team×ma) — cố ý, để màn «Thư viện kỹ năng» của người B không phải đổi hình.';

ALTER TABLE ky_nang
  ADD COLUMN nguon     text NOT NULL DEFAULT 'nguoi' CHECK (nguon IN ('nguoi', 'ai')),
  ADD COLUMN nguoi_sua text NOT NULL DEFAULT '',
  ADD COLUMN sua_luc   timestamptz,
  ADD COLUMN ghi_chu   text NOT NULL DEFAULT '',
  ADD COLUMN duyet_boi text,
  ADD COLUMN duyet_luc timestamptz;

-- ─── 010_kich_ban_ba_tang ───────────────────────────────────────────────────────

-- 010 · KỊCH BẢN BA TẦNG có KẾ THỪA (G2-A5).
--
-- ═══ CÂY ══════════════════════════════════════════════════════════════════════
--   sản phẩm  →  (sản phẩm × nước)  →  page
--   rộng nhất                          hẹp nhất, thắng
--
-- Page không có bản riêng thì DÙNG bản tầng trên. Và API phải NÓI RÕ đang kế thừa từ tầng
-- nào — trả về im lặng là marketer sửa nhầm tầng sản phẩm rồi đổi kịch bản của mọi page
-- dưới nó mà không biết.
--
-- ═══ ĐO TRƯỚC KHI THIẾT KẾ — hai tầng trên HÔM NAY GẦN NHƯ KHÔNG TỚI ĐƯỢC ═════
-- Đo 25/08 trên `aicloser_v3`:
--   · `san_pham`            = 0 dòng    ⇒ tầng SẢN PHẨM chưa có khoá nào để móc vào
--   · `page.thi_truong`     = 140/514   ⇒ tầng NƯỚC chỉ với tới 27% số page
--   · `page.nganh_hang`     = 0/514     ⇒ KHÔNG dùng làm khoá thay thế được
--   · `kich_ban`            = 71 bản / 70 page có LIVE ⇒ 444 page chưa có bản riêng
--
-- Nghĩa là: cấu trúc dựng đúng, nhưng hôm nay hầu hết page rơi xuống «không kế thừa được
-- từ đâu cả». Đó KHÔNG phải lỗi — đó là trạng thái thật, và bộ giải phải NÓI RA nó thay vì
-- trả `null` (bài học 3 GD2: màn rỗng phải phân biệt «xong hết rồi» với «chưa cài xong»).

ALTER TABLE kich_ban
  ADD COLUMN cap         text NOT NULL DEFAULT 'page'
             CHECK (cap IN ('san_pham', 'nuoc', 'page')),
  -- Khoá tầng sản phẩm. Dùng CHUNG vốn từ với `ky_nang.bat_cho_nhom_sp` (= `san_pham.ma`),
  -- để cả hệ chỉ có MỘT cách gọi tên «nhóm sản phẩm».
  ADD COLUMN san_pham_ma text,
  -- Khoá tầng nước = `page.thi_truong` (KSA · UAE · Kuwait · Bahrain · Khác…).
  ADD COLUMN thi_truong  text;

ALTER TABLE kich_ban ALTER COLUMN page_id DROP NOT NULL;

-- Mỗi tầng phải mang ĐỦ khoá của nó và KHÔNG mang khoá của tầng khác. Không có rào này thì
-- một dòng `cap='nuoc'` kèm `page_id` là một dòng không ai đọc ra được nó thuộc về đâu.
ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_khoa_dung_cap CHECK (
  (cap = 'page'     AND page_id IS NOT NULL AND san_pham_ma IS NULL     AND thi_truong IS NULL)
  OR
  (cap = 'nuoc'     AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NOT NULL)
  OR
  (cap = 'san_pham' AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NULL)
);

-- ═══ ĐÚNG MỘT BẢN LIVE MỖI PHẠM VI ════════════════════════════════════════════
-- Nghiệm thu sóng 2 ghi thẳng: «đúng MỘT bản LIVE mỗi page — bản thứ hai bật lên thì bản
-- cũ tự hạ». Cho tầng trên cũng vậy. Đây là rào ở tầng CSDL, không phải lời hứa của code:
-- §9 đã có án lệ `napKichBan` UPSERT chết khi nguồn có ≥2 LIVE/page (RF-19).
-- ⚠️ KHÔNG thêm chỉ mục cho tầng page: `kich_ban_live_moi_page` đã có sẵn từ migration
--    001 (`ON kich_ban (page_id) WHERE trang_thai='LIVE'`). Thêm cái thứ hai nói cùng một
--    chuyện là đúng cái «bản khai thứ hai» mà cả sóng này đang dọn. Nó vẫn ràng đúng sau
--    010: chỉ dòng `cap='page'` mới có `page_id` khác NULL (rào `kich_ban_khoa_dung_cap`),
--    và hai NULL trong Postgres là khác nhau nên dòng tầng trên không đụng vào nó.

CREATE UNIQUE INDEX kich_ban_mot_live_nuoc
  ON kich_ban (team_id, san_pham_ma, thi_truong) WHERE trang_thai = 'LIVE' AND cap = 'nuoc';

CREATE UNIQUE INDEX kich_ban_mot_live_san_pham
  ON kich_ban (team_id, san_pham_ma) WHERE trang_thai = 'LIVE' AND cap = 'san_pham';

-- `UNIQUE (page_id, phien_ban)` sẵn có chỉ ràng được tầng page (page_id NULL thì hai NULL
-- là khác nhau). Hai tầng trên cần khoá phiên bản riêng.
CREATE UNIQUE INDEX kich_ban_phien_ban_nuoc
  ON kich_ban (team_id, san_pham_ma, thi_truong, phien_ban) WHERE cap = 'nuoc';

CREATE UNIQUE INDEX kich_ban_phien_ban_san_pham
  ON kich_ban (team_id, san_pham_ma, phien_ban) WHERE cap = 'san_pham';

CREATE INDEX kich_ban_tra_theo_cap ON kich_ban (team_id, cap, trang_thai);

COMMENT ON COLUMN kich_ban.cap IS
  'Tầng của bản này trong cây sản phẩm → nước → page. Tầng HẸP NHẤT có bản LIVE thì thắng; '
  'bộ giải `docKichBanChoPage()` (src/db/kich-ban.js) luôn khai NGUỒN, không trả im lặng.';

-- ─── 011_so_ai_tien ───────────────────────────────────────────────────────

-- 011 · Sổ AI ghi TIỀN tại thời điểm gọi (G2-A6).
--
-- ═══ VÌ SAO LƯU TIỀN, KHÔNG TÍNH LẠI TỪ TOKEN ═════════════════════════════════
-- Màn «Chi phí AI» phải tìm được page nào ĐỐT TIỀN MÀ KHÔNG RA ĐƠN. Tính tiền lúc ĐỌC
-- (token × bảng giá hôm nay) là sai hai lần:
--   ① bảng giá đổi thì mọi con số LỊCH SỬ đổi theo — báo cáo tháng trước tự nhiên khác đi;
--   ② nó bắt tầng dữ liệu phải giữ một BẢN SAO của bảng giá, trong khi bảng giá thật nằm ở
--      `01-QUYET-DINH.md §7` và ở lớp model của người B. Bản sao thứ hai bao giờ cũng trôi.
-- Án lệ #18: «so hai giá trị dẫn xuất phải đóng dấu THAM SỐ DẪN XUẤT vào chỗ lưu».
--
-- Lớp model của người B ĐÃ tính sẵn `tienUsd`/`tienVnd` và đẩy qua phễu `datPheuSoAi`
-- (hợp đồng `v3/docs/hop-dong-b-voi-a.md` mục 2) — bản này chỉ mở chỗ để nhận.
--
-- `so_ai` có trigger CHỈ-INSERT; `ALTER TABLE` thêm cột KHÔNG đụng trigger đó.
-- Đo 25/08: `so_ai` = 0 dòng ⇒ không có gì để lấp ngược.

ALTER TABLE so_ai
  ADD COLUMN nha_cung_cap       text,
  ADD COLUMN tien_usd           numeric(12,6),
  ADD COLUMN tien_vnd           numeric(14,2),
  ADD COLUMN do_ngau_nhien      numeric(3,2),
  ADD COLUMN da_chuyen_du_phong boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN so_ai.tien_vnd IS
  'Tiền của CHÍNH lượt gọi này, tính bằng bảng giá ĐANG HIỆU LỰC lúc gọi. Cấm tính lại từ '
  'token lúc đọc: bảng giá đổi thì báo cáo lịch sử đổi theo (án lệ #18).';

-- Đọc theo page + khoảng thời gian là câu của màn «Chi phí AI»; đọc theo model là câu
-- «model nào rẻ hơn thật» — cả hai đều quét theo `xay_ra_luc`.
CREATE INDEX so_ai_chi_phi_theo_page ON so_ai (team_id, page_id, xay_ra_luc);
CREATE INDEX so_ai_chi_phi_theo_model ON so_ai (team_id, ma_model, xay_ra_luc);

-- ─── 012_kich_ban_tang_nuoc_va_mau_0_dong ───────────────────────────────────────────────────────

-- 012 · Hai chỗ chặn sóng 2 (B-Y6 mục ⓐ và ⓑ).
--
-- ═══ ⓐ TẦNG NƯỚC CỦA TÔI ĐANG CHẾT — sửa hình dạng của chính 010 ═════════════
-- 010 (G2-A5) dựng cây `sản phẩm → (sản phẩm × nước) → page`, và ràng bằng
-- `kich_ban_khoa_dung_cap`: bản `cap='nuoc'` BẮT BUỘC có `san_pham_ma`.
--
-- Đo lại 25/08: `san_pham` = **0 dòng**. Nghĩa là tầng nước của tôi KHÔNG BAO GIỜ tới
-- được — muốn dùng nó phải có mã sản phẩm trước, mà mã sản phẩm thì chưa có cái nào.
-- Trong khi `page.thi_truong` có giá trị ở **140/514 page** (KSA 34 · UAE 32 · Kuwait 23…).
-- Tức là tôi đã treo một tầng dùng được vào một tầng chưa tồn tại.
--
-- Sửa: cho phép phạm vi **CHỈ THEO NƯỚC** (`san_pham_ma IS NULL`). Cây thành:
--
--   sản phẩm  →  (sản phẩm × nước)  →  NƯỚC  →  page
--   rộng nhất                                   hẹp nhất, thắng
--
-- Bản (sản phẩm × nước) vẫn hẹp hơn bản chỉ-nước, nên thứ tự ưu tiên không mơ hồ.

ALTER TABLE kich_ban DROP CONSTRAINT kich_ban_khoa_dung_cap;

ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_khoa_dung_cap CHECK (
  (cap = 'page'     AND page_id IS NOT NULL AND san_pham_ma IS NULL     AND thi_truong IS NULL)
  OR
  -- Tầng nước: BẮT BUỘC có `thi_truong`. `san_pham_ma` thì TUỲ:
  --   có   → bản riêng cho (sản phẩm × nước), hẹp hơn
  --   NULL → bản cho CẢ NƯỚC, bất kể sản phẩm nào — đây là cái dùng được hôm nay
  (cap = 'nuoc'     AND page_id IS NULL     AND thi_truong IS NOT NULL)
  OR
  (cap = 'san_pham' AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NULL)
);

-- Chỉ mục MỘT-BẢN-LIVE của 010 dùng `(team_id, san_pham_ma, thi_truong)`; với
-- `san_pham_ma IS NULL` thì hai NULL là KHÁC nhau ⇒ hai bản LIVE cùng một nước sẽ LỌT.
-- Đúng cái lỗ mà B-Y6 ⓐ cảnh báo. `COALESCE` bịt nó.
DROP INDEX kich_ban_mot_live_nuoc;
CREATE UNIQUE INDEX kich_ban_mot_live_nuoc
  ON kich_ban (team_id, coalesce(san_pham_ma, ''), thi_truong)
  WHERE trang_thai = 'LIVE' AND cap = 'nuoc';

DROP INDEX kich_ban_phien_ban_nuoc;
CREATE UNIQUE INDEX kich_ban_phien_ban_nuoc
  ON kich_ban (team_id, coalesce(san_pham_ma, ''), thi_truong, phien_ban)
  WHERE cap = 'nuoc';

-- ═══ ⓑ LỚP TRẢ LỜI 0 ĐỒNG ════════════════════════════════════════════════════
-- Tiêu chí nghiệm thu sóng 2: «lớp 0 đồng chặn ≥33% lưu lượng». Hôm nay ba trường
-- `fastLanePrice`/`fastLaneShip`/`fastLaneHowto` nằm trong `kich_ban.noi_dung_nguoi`
-- THEO TỪNG PAGE ⇒ 514 page là 514 lần gõ lại cùng một câu trả lời phí ship, và không
-- có chỗ nào đếm được «chặn bao nhiêu %».
CREATE TABLE mau_0_dong (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  ma         text        NOT NULL,
  ten        text        NOT NULL,
  -- Bộ từ khoá kích hoạt. Đối chiếu với bộ từ khoá Botcake là việc của màn hình; ở đây
  -- chỉ lưu. `text[]` chứ không phải chuỗi phân tách — để truy vấn bằng `&&` được.
  tu_khoa    text[]      NOT NULL DEFAULT '{}',
  noi_dung   text        NOT NULL,
  -- Phạm vi: NULL = cả team. Dùng CHUNG vốn từ với `ky_nang.bat_cho_nhom_sp`.
  bat_cho_nhom_sp text[] NOT NULL DEFAULT '{}',
  bat        boolean     NOT NULL DEFAULT false,
  -- Đếm ngay tại dòng: mỗi lượt lớp 0 đồng trả lời thay model thì +1. Đây là chỗ trả lời
  -- câu «chặn được bao nhiêu» mà không phải suy từ `so_ai` (ở đó lượt 0 đồng KHÔNG đẻ
  -- dòng nào — vì không gọi model — nên đếm ở `so_ai` là đếm cái không tồn tại).
  so_lan_chan bigint     NOT NULL DEFAULT 0,
  chan_lan_cuoi timestamptz,
  nguoi_sua  text        NOT NULL DEFAULT '',
  tao_luc    timestamptz NOT NULL DEFAULT now(),
  sua_luc    timestamptz,
  UNIQUE (team_id, ma)
);

CREATE INDEX mau_0_dong_dang_bat ON mau_0_dong (team_id) WHERE bat;
-- GIN cho phép hỏi «mẫu nào khớp từ khoá này» bằng `tu_khoa && ARRAY[...]`.
CREATE INDEX mau_0_dong_tu_khoa ON mau_0_dong USING gin (tu_khoa);

COMMENT ON COLUMN mau_0_dong.so_lan_chan IS
  'Số lượt mẫu này trả lời THAY model. Đếm ở đây chứ không suy từ so_ai: lượt 0 đồng không '
  'gọi model nên KHÔNG đẻ dòng so_ai nào — đếm ở đó là đếm cái không tồn tại.';

-- ─── 013_khoa_dinh_danh_khach ───────────────────────────────────────────────────────

-- 013 · KHOÁ ĐỊNH DANH KHÁCH ĐI KÈM THỊ TRƯỜNG (A7-1).
--
-- ═══ VÌ SAO — ĐO 25–26/08 TRÊN POS THẬT, KHÔNG PHẢI SUY ═════════════════════════
-- Khoá cũ: `UNIQUE (team_id, so_dien_thoai) WHERE so_dien_thoai IS NOT NULL`.
-- Cả BẢY shop POS đều nằm ở team 1, mỗi shop một nước. Nên khoá cũ nói:
-- «trong một team, một số điện thoại là MỘT người» — mà một team ở đây là bảy nước.
--
-- ① POS LƯU SĐT KHÔNG CÓ MÃ NƯỚC. Đo: Kuwait `66410373` · Qatar `55534997` ·
--    Saudi/UAE `5xxxxxxxx`. Tức `chuanHoaSdt` chạy trên dữ liệu POS là **no-op** —
--    nó cắt tiền tố, mà POS không có tiền tố nào để cắt. Nước KHÔNG nằm trong số;
--    nó chỉ nằm ở «đơn này đến từ shop nào». Đây là gốc của RF-23, không phải
--    việc cắt mã vùng.
--
-- ② RF-23 (§9, 23/08) KHAI SAI TÊN NƯỚC. Sổ nêu Kuwait/Bahrain/Oman/Qatar. Đo lại:
--
--      nhóm 8 số  Kuwait·Qatar·Bahrain·Oman   5.703 sđt phân biệt →  0 va chạm THẬT
--                 (đúng 1 hit và nó là rác: `123123123123`)
--      nhóm 9 số  Saudi·UAE                   2.529 + 2.537 sđt   →  6 va chạm THẬT
--                 561698732 · 547049872 · 575461472 · 546241121 · 538440108 · 386685425
--
--    Sổ gọi tên đúng cái nhóm KHÔNG va chạm, và bỏ sót nhóm CÓ va chạm — cũng là
--    nhóm chiếm 82% đơn (Saudi 62.494 + UAE 38.641 / tổng 122.615).
--
-- ③ DÂN SỐ THẬT LÀ 122.615 ĐƠN, không phải 5.144 như mốc 23/08 (= 4,2%). Sáu va
--    chạm trên là mẫu 3.000 đơn/shop; ngoại suy (không gian hiệu dụng suy từ mẫu
--    ≈ 1,07M) ra hàng trăm tới ~1.000 khách bị gộp khi nạp đủ. CON SỐ ĐO ĐƯỢC LÀ 6 —
--    phần còn lại là ước lượng, và migration này không cần nó để đúng.
--
-- ④ LÀM BÂY GIỜ VÌ `khach` ĐANG 0 DÒNG. Đây là một migration rỗng hôm nay. Sau khi
--    122.615 đơn đã nạp thì gỡ một cặp đã gộp phải tự suy ngược nước cho từng khách —
--    đắt hơn nhiều. Cửa sổ này đóng ngay lượt ai đó chạy đồng bộ POS.
--
-- ═══ HÌNH DẠNG KHOÁ MỚI ═════════════════════════════════════════════════════════
-- `coalesce(thi_truong, '')` là BẮT BUỘC, không phải cho gọn: hai NULL là KHÁC nhau
-- trong index, nên `(team, thi_truong, sdt)` trần sẽ cho hai dòng cùng số cùng team
-- LỌT khi cả hai chưa biết nước. Đúng cái lỗ mà 012 vừa bịt cho `kich_ban` — cùng
-- một cái bẫy, lần thứ hai.
--
-- KHÔNG có CHECK liệt kê tên nước ở đây, CỐ Ý: danh sách gõ tay là lỗ hẹn giờ (án lệ
-- #22). Nguồn hợp lệ DUY NHẤT của cột này là `ket_noi_pos.market`; bên ghi lấy qua
-- `traMarketCuaPage()` (`src/orders/hang-cho.js`) hoặc qua chính tham số `shop` của
-- `docDon()`. Lưu ý người sau: `page.thi_truong` là nhãn NGƯỜI (`KSA`·`Khác`·rỗng) và
-- KHÔNG cùng từ vựng — khớp theo tên trúng 0/502 page, đã đo 23/08.
--
-- CHƯA BIẾT NƯỚC thì để NULL và hai dòng chưa-biết cùng số VẪN gộp làm một — tức giữ
-- nguyên hành vi cũ cho phần mù, chứ không bịa ra nước. Trên dữ liệu có SĐT thật thì
-- phần mù rất nhỏ: tra được nước trên 789/790 hội thoại mang SĐT (99,9%).

ALTER TABLE khach ADD COLUMN thi_truong text;

COMMENT ON COLUMN khach.thi_truong IS
  'Thị trường của khách — LẤY TỪ ket_noi_pos.market, không phải page.thi_truong '
  '(hai từ vựng khác nhau: KSA vs Saudi). NULL = chưa tra được nước; khi NULL thì '
  'khoá định danh lùi về hành vi cũ (gộp theo team + số).';

DROP INDEX khach_sdt_trong_team;

CREATE UNIQUE INDEX khach_sdt_trong_team_nuoc
  ON khach (team_id, coalesce(thi_truong, ''), so_dien_thoai)
  WHERE so_dien_thoai IS NOT NULL;

-- ─── 014_san_pham_goc ───────────────────────────────────────────────────────

-- 014 · SẢN PHẨM GỐC — mã sản phẩm KHÔNG mang shop (CR-15/09)
--
-- ═══ VÌ SAO ═══════════════════════════════════════════════════════════════════════════
-- `san_pham.ma` dựng ở `src/pos/doc-danh-muc.js` là `"<shopId>:<variationId>"`. Mỗi thị
-- trường là một shop POS riêng, nên CÙNG MỘT sản phẩm có mã khác nhau ở mỗi nước. Đo
-- 15/09 trên đơn thật: Fitgum Acai Berry ra BA mã —
--     Saudi  1328205216:e4108b77-8685-487e-a712-8cc103d00eb7
--     Kuwait 1328205226:717bfb27-4a96-4c16-b934-527d0dcce8ab
--     Oman   <shop Oman>:e87acfbd-cb26-446c-b0eb-4903f861d2d5
--
-- Mà `kich_ban.san_pham_ma` (migration 010) và `ky_nang.bat_cho_nhom_sp` dùng chung vốn từ
-- đó. Hệ quả: tầng kịch bản `cap='san_pham'` thực chất là «sản phẩm TRONG MỘT SHOP», và
-- tầng `cap='nuoc'` — vốn sinh ra để tách phần khác nhau theo nước — thành dư thừa.
--
-- Đo thêm 15/09, để thấy đây không phải ca biên:
--   · 115/577 page = 19,9% đang `lost`, riêng tháng 9/2026 có 106 page;
--   · Oman đang chạy cảnh «page chết, sản phẩm chuyển page»: 82 đơn Fitgum chia cho một
--     page đã `lost` (26 đơn) và một page KHÔNG có trong `pages.json` (56 đơn);
--   · kịch bản Kuwait vs Saudi: 14/18 khối giống nhau từng byte.
-- ⇒ Sản phẩm phải SỐNG LÂU HƠN page. Lược đồ 001 cho `san_pham` đúng một cột `page_id` nên
--   nó mô hình hoá ngược chiều.
--
-- ═══ MIGRATION NÀY CHỈ THÊM, KHÔNG ĐỔI NGHĨA GÌ ═══════════════════════════════════════
-- Cột cũ giữ nguyên tuyệt đối. Sau 014, chưa mã nào đọc cột mới — bot chạy y như trước.
-- Đổi bộ giải là phiếu CR4; ghi dữ liệu thật là CR5 (điểm dừng ②).
--
-- ⛔ PHẠM VI ÂM, viết vào đây để người sau không nới: KHÔNG đụng `don_hang.san_pham_ma`
--    (4.581/4.581 phần tử dạng POS, và `src/orders/loc-trung.js` lọc đơn trùng bằng nó),
--    KHÔNG đụng `tachMaBienThe()`, KHÔNG đụng luồng tạo đơn.
--
-- ⚠️ TÊN CỘT Ở `kich_ban` LÀ `san_pham_goc_ma`, KHÔNG phải giữ tên `san_pham_ma` mang
--    nghĩa mới. Cố ý: sau CR sẽ có hai vốn từ cùng tồn tại (`don_hang.san_pham_ma` = mã
--    POS, `kich_ban.san_pham_goc_ma` = mã gốc). Một cái tên hai nghĩa là đúng kiểu nhầm
--    đã có án lệ trong dự án này; đắt hơn một cột nhưng người sau đọc là biết.

CREATE TABLE san_pham_goc (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  -- Mã NGƯỜI đặt, không sinh từ shop: `fitgum-acai-berry`. Đây là khoá của tầng kịch bản
  -- «sản phẩm» và của `ky_nang.bat_cho_nhom_sp_goc`.
  ma_goc  text        NOT NULL CHECK (ma_goc <> '' AND ma_goc !~ ':'),
  ten     text        NOT NULL DEFAULT '',
  mo_ta   text        NOT NULL DEFAULT '',
  -- SỐ HIỆU nội bộ mà đội vận hành gõ vào ĐẦU TÊN sản phẩm trên POS: `125 - Fitgum Acai
  -- Berry`. Đo 15/09 trên danh mục 7 shop: 173 số hiệu, **78 số có mặt ở >1 shop**, và
  -- **75/78 tên khớp nhau** giữa các shop (3 cái còn lại chỉ lệch chính tả: `Birth Stone
  -- Set` / `Birthstone Set` / `Birth stone set`). Tức số hiệu là khoá gộp CHẮC HƠN so tên.
  --
  -- Vì sao không gộp bằng tên: Saudi có cả `125 - Fitgum Acai Berry` VÀ `128 - Fitgum
  -- Organic Barley` — tên gần giống mà là hai sản phẩm. So tên thì gộp nhầm; số thì không.
  --
  -- NULLABLE: 113 biến thể trong danh mục KHÔNG có số đầu tên, chúng phải do người gán.
  so_hieu text        CHECK (so_hieu IS NULL OR so_hieu ~ '^[0-9]{1,4}$'),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma_goc)
);

-- Một số hiệu = một sản phẩm gốc. Đây là cái làm cho «mở thị trường mới» KHÔNG cần người:
-- biến thể mới của shop mới mang cùng số hiệu ⇒ `doc-danh-muc.js` tự nối `ma_goc`.
CREATE UNIQUE INDEX san_pham_goc_so_hieu ON san_pham_goc (team_id, so_hieu)
  WHERE so_hieu IS NOT NULL;

COMMENT ON TABLE  san_pham_goc        IS 'Sản phẩm THẬT (CR-15/09): không mang shop, không gắn page. Sống lâu hơn page.';
COMMENT ON COLUMN san_pham_goc.ma_goc IS 'Mã người đặt, CẤM chứa dấu ":" — dấu đó là của mã POS <shop>:<variation>.';

-- `san_pham` (biến thể POS) nay là CẦU NỐI: một sản phẩm gốc × một shop.
-- Nullable tới khi người soát xong (CR3) — 137 dòng hiện có chưa biết gộp thế nào, và máy
-- KHÔNG đoán hộ được: chỉ TÊN nói lên hai mã là cùng một sản phẩm, mà tên thì người gõ.
ALTER TABLE san_pham ADD COLUMN ma_goc text;

-- Khoá ngoại tổ hợp: `ma_goc` không thể gõ nhầm thành một sản phẩm không tồn tại
-- (án lệ #22 — deny-by-default, đừng để danh sách gõ tay lách van).
ALTER TABLE san_pham
  ADD CONSTRAINT san_pham_ma_goc_co_that
  FOREIGN KEY (team_id, ma_goc) REFERENCES san_pham_goc (team_id, ma_goc)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX san_pham_ma_goc ON san_pham (team_id, ma_goc) WHERE ma_goc IS NOT NULL;

COMMENT ON COLUMN san_pham.ma     IS 'Khoá KỸ THUẬT "<shopId>:<variationId>" — trỏ POS để tạo đơn. KHÔNG phải khoá nghiệp vụ.';
COMMENT ON COLUMN san_pham.ma_goc IS 'Khoá NGHIỆP VỤ → san_pham_goc.ma_goc. NULL = chưa ai soát gộp (CR3).';

-- Tầng kịch bản: cột MỚI cạnh cột cũ. Bỏ cột cũ là một phiếu SAU, cách CR5 ít nhất một
-- tuần chạy ổn (đường lùi của CR).
ALTER TABLE kich_ban ADD COLUMN san_pham_goc_ma text;

-- ⚠️ PHẢI NỚI RÀO CỦA 010 — phát hiện lúc viết thước, không phải lúc thiết kế.
--
-- Bản đầu của migration này giữ nguyên `kich_ban_khoa_dung_cap` và ghi «dòng mới phải mang
-- CẢ HAI khoá trong quãng chuyển». Viết ca test mới thì thấy câu đó VÔ NGHĨA: một kịch bản
-- dùng CHUNG cho Saudi · Kuwait · Oman thì `san_pham_ma` phải điền cái gì? Không có một mã
-- POS nào đại diện cho ba shop — đó chính là lý do CR này tồn tại. Rào cũ khoá đúng thứ nó
-- sinh ra để mở.
--
-- ⚠️ VÀ NỚI TỪ BẢN CỦA **012**, KHÔNG PHẢI BẢN 010 — tôi viết sai chỗ này lần đầu và bộ ca
--    K17/K18/K19 bắt được. 012 đã nới `cap='nuoc'` cho phép `san_pham_ma IS NULL` («bản cho
--    CẢ NƯỚC, bất kể sản phẩm nào») vì lúc ấy `san_pham` còn 0 dòng. Chép lại rào theo bản
--    010 là xoá lặng lẽ tầng «chỉ nước» — tầng duy nhất dùng được hồi 25/08.
--    📌 Bài học: rào của một bảng là TỔNG của mọi migration đã sửa nó, không phải bản khai
--    ở migration đầu tiên. Đọc bản MỚI NHẤT trước khi viết lại.
--
-- Nới: tầng `san_pham` nhận «CÓ ÍT NHẤT MỘT trong hai khoá». Tầng `nuoc` giữ đúng 012 —
-- chỉ bắt buộc `thi_truong`, hai khoá sản phẩm đều tuỳ. `cap='page'` vẫn KHÔNG được mang
-- khoá sản phẩm nào, kể cả khoá mới.
ALTER TABLE kich_ban DROP CONSTRAINT kich_ban_khoa_dung_cap;
ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_khoa_dung_cap CHECK (
  (cap = 'page'     AND page_id IS NOT NULL
                    AND san_pham_ma IS NULL AND san_pham_goc_ma IS NULL
                    AND thi_truong IS NULL)
  OR
  (cap = 'nuoc'     AND page_id IS NULL AND thi_truong IS NOT NULL)
  OR
  (cap = 'san_pham' AND page_id IS NULL
                    AND (san_pham_ma IS NOT NULL OR san_pham_goc_ma IS NOT NULL)
                    AND thi_truong IS NULL)
);

-- Và ĐÚNG MỘT BẢN LIVE cho phạm vi theo khoá GỐC — song song với hai chỉ mục của 010 theo
-- khoá POS. Thiếu chỗ này thì hai bản LIVE cùng `(team, ma_goc)` cùng tồn tại, và bộ giải
-- chọn bản nào là do `ORDER BY` quyết — đúng kiểu hỏng im lặng mà 010 dựng chỉ mục để chặn.
CREATE UNIQUE INDEX kich_ban_mot_live_goc_san_pham
  ON kich_ban (team_id, san_pham_goc_ma)
  WHERE trang_thai = 'LIVE' AND cap = 'san_pham' AND san_pham_goc_ma IS NOT NULL;
-- Tầng nước theo khoá gốc: lọc `IS NOT NULL` để KHÔNG đụng chỉ mục «chỉ nước» của 012
-- (`coalesce(san_pham_ma,'')`). Hai chỉ mục canh hai phạm vi khác nhau, không chồng nhau.
CREATE UNIQUE INDEX kich_ban_mot_live_goc_nuoc
  ON kich_ban (team_id, san_pham_goc_ma, thi_truong)
  WHERE trang_thai = 'LIVE' AND cap = 'nuoc' AND san_pham_goc_ma IS NOT NULL;
CREATE INDEX kich_ban_san_pham_goc_ma ON kich_ban (team_id, san_pham_goc_ma)
  WHERE san_pham_goc_ma IS NOT NULL;

COMMENT ON COLUMN kich_ban.san_pham_goc_ma IS 'Khoá tầng sản phẩm/nước theo mã GỐC (CR-15/09). Cột cũ san_pham_ma còn để chuyển tiếp.';

-- Kỹ năng: cùng cách, cột mới cạnh cột cũ.
ALTER TABLE ky_nang ADD COLUMN bat_cho_nhom_sp_goc text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN ky_nang.bat_cho_nhom_sp_goc IS 'Bật cho nhóm sản phẩm GỐC (CR-15/09). Cột cũ bat_cho_nhom_sp còn để chuyển tiếp.';

-- ─── 015_page_ban_san_pham_nao ───────────────────────────────────────────────────────

-- 015 · PAGE KHAI NÓ BÁN SẢN PHẨM NÀO (CR-15/09 · phiếu 015)
--
-- ═══ VÌ SAO — VÀ VÌ SAO TÔI ĐÃ SAI Ở 014 ═════════════════════════════════════════════
-- Ở migration 014 (cùng CR) tôi từ chối thêm cột này, với lý lẽ: «`san_pham.page_id` đã nối
-- page với sản phẩm rồi; thêm `page.ma_goc` là khai cùng một sự thật ở hai chỗ».
--
-- Lý lẽ ấy dựa trên một TIỀN ĐỀ SAI. Đo 16/09 trên `pages.json`:
--
--     shop 1635200759 (UAE)     35 page
--     shop 1328205226 (Kuwait)  26 page
--     shop 1328205216 (Saudi)   23 page
--     shop 1021271617 (Qatar)   10 page
--     shop 100943483  (Bahrain)  7 page
--     shop 1942200986 (Oman)     7 page
--
-- **KHÔNG shop nào có 1 page.** Mà `src/pos/doc-danh-muc.js:69` chỉ gán `page_id` khi shop
-- có ĐÚNG MỘT page:
--     const pageId = pagesCuaShop.length === 1 ? pagesCuaShop[0].id : null;
-- ⇒ `san_pham.page_id` là **NULL cho mọi sản phẩm, luôn luôn**. Nó không nối gì cả.
--
-- Và nó KHÔNG THỂ nối: một biến thể POS ở shop Kuwait được **26 page** cùng bán. Đó là quan
-- hệ N–M bị nhét vào một cột 1–1. Nên `page.san_pham_goc_ma` không phải bản sao thứ hai —
-- nó là chỗ DUY NHẤT chứa được sự thật «page này bán sản phẩm nào».
--
-- Ba thứ đang tắc mà cột này mở ra:
--   ① tầng kịch bản `cap='san_pham'` (migration 010) — `khoaTangCuaPage` tra
--      `san_pham WHERE page_id` nên nó CHƯA BAO GIỜ với tới được page nào;
--   ② cột «Sản phẩm gốc» của màn Page & bot (014/CR6) — hôm nay trả 409 cho mọi page;
--   ③ cảnh «page chết → page mới khai cùng sản phẩm là kế thừa hết kịch bản» — 19,9% page
--      đang `lost`, nên đây là đường chính, không phải ca biên.
--
-- ═══ CHỈ THÊM ═════════════════════════════════════════════════════════════════════════
-- `san_pham.page_id` GIỮ NGUYÊN, không xoá, không đổi. Nó đang NULL sạch nên ngừng đọc nó
-- không mất gì; bỏ cột là phiếu khác, sau này, khi chắc không ai còn đọc.

ALTER TABLE page ADD COLUMN san_pham_goc_ma text;

-- Khoá ngoại tổ hợp — cùng lý do với `san_pham.ma_goc` ở 014: một mã gõ nhầm không được
-- phép thành một sản phẩm ma (án lệ #22).
ALTER TABLE page
  ADD CONSTRAINT page_san_pham_goc_co_that
  FOREIGN KEY (team_id, san_pham_goc_ma) REFERENCES san_pham_goc (team_id, ma_goc)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- Tra ngược «những page nào bán sản phẩm này» — dùng ở màn và ở lượt page chết chuyển page.
CREATE INDEX page_san_pham_goc_ma ON page (team_id, san_pham_goc_ma)
  WHERE san_pham_goc_ma IS NOT NULL;

COMMENT ON COLUMN page.san_pham_goc_ma IS
  'Page này bán sản phẩm GỐC nào (015). Khoá của tầng kịch bản «sản phẩm»/«nước». NULL = chưa gán. Thay cho san_pham.page_id vốn NULL sạch vì mọi shop đều nhiều page.';

-- ─── 016_webhook_va_gui_ben ───────────────────────────────────────────────────────

-- Một nguồn nhận tin cho mỗi Page. Gửi vẫn đi qua Pancake hiện có.
ALTER TABLE page ADD COLUMN nguon_tin text NOT NULL DEFAULT 'poll'
  CHECK (nguon_tin IN ('poll', 'webhook'));
ALTER TABLE tin_cho_xu_ly ADD COLUMN nguon text NOT NULL DEFAULT 'poll'
  CHECK (nguon IN ('poll', 'webhook'));
ALTER TABLE tin_cho_xu_ly ADD COLUMN thu_lai_luc timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX tin_webhook_mid ON tin_cho_xu_ly(page_id,msg_id) WHERE nguon='webhook';
CREATE INDEX tin_cho_hoi_thoai ON tin_cho_xu_ly(team_id,page_id,psid,id)
  WHERE trang_thai IN ('cho','dang_xu');

-- Ghi trên kết nối độc lập TRƯỚC HTTP, sống qua rollback của lượt xử lý.
-- Không hứa exactly-once khi provider không có idempotency key: dang_gui/khong_ro
-- cần đối chiếu thủ công, không tự phát lại.
CREATE TABLE lan_gui (
  id bigserial PRIMARY KEY,
  team_id bigint NOT NULL REFERENCES team(id),
  -- Không FK tới queue: worker đang FOR UPDATE dòng tin; FK trên kết nối sổ gửi
  -- độc lập sẽ chờ chính worker đó. Caller truyền id tin đã lưu bền.
  tin_id bigint NOT NULL,
  buoc integer NOT NULL CHECK (buoc > 0),
  loai text NOT NULL CHECK (loai IN ('guiTin','guiAnh','ghiNote','gatThe')),
  noi_dung jsonb NOT NULL,
  trang_thai text NOT NULL CHECK (trang_thai IN ('dang_gui','da_gui','khong_ro')),
  provider_id text,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id,tin_id,buoc)
);
CREATE INDEX lan_gui_can_doi_chieu ON lan_gui(team_id,tao_luc)
  WHERE trang_thai <> 'da_gui';

-- ─── 017_cong_tac_v3 ───────────────────────────────────────────────────────

-- NULL preserves already allowlisted workers until the operator explicitly sets a switch.
ALTER TABLE page ADD COLUMN v3_ai_bat boolean;
COMMENT ON COLUMN page.v3_ai_bat IS 'V3 switch; NULL preserves existing allowlist behavior. Independent of legacy bot_ai_bat.';

ALTER TABLE san_pham ADD COLUMN cau_hinh_tay boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN san_pham.cau_hinh_tay IS 'Operator owns product text / availability / offers; POS sync only updates inventory.';

-- ─── 018_nhat_ky_ip ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 018_nhat_ky_ip — CỘT `ip` CHO BẢNG NHẬT KÝ
--
-- VÌ SAO (đo 17/09/2026): `v3/src/audit/index.js` ghi `ip` từ lượt HTTP
-- (`v3/src/audit/lop-express.js` lấy `req.ip`) nhưng bảng `nhat_ky` của 001 KHÔNG có cột
-- này — nên MỌI lượt ghi nhật ký của v3 đều ném `column ... does not exist`. Mã nào thuộc
-- `nhomBatBuoc` thì ném tiếp lên HTTP: người bấm nhận 500 SAU KHI việc chính đã chạy
-- (đo được: thêm kết nối POS tạo hàng thật rồi trả 500, không một dòng nhật ký).
--
-- Vá đi hai hướng: hai cột kia (`thoi_gian`→`xay_ra_luc`, `doi_tuong_loai`→`doi_tuong`)
-- sửa Ở CODE vì lược đồ mới là bản đã ký và `src/db/nhat-ky.js` — cửa ghi audit dùng chung
-- của người A — đã dùng đúng tên đó từ đầu. Riêng `ip` là dữ liệu THẬT đang bị vứt: sự cố
-- an ninh (`dang_nhap_that_bai`, `chan_xuyen_team`) mà không có IP thì mất nửa manh mối.
--
-- CỘNG THÊM, KHÔNG SỬA CHỖ CŨ: `NOT NULL DEFAULT ''` nên bản code cũ (không ghi cột này)
-- vẫn chạy được sau khi migrate — thứ tự deploy code/migration nào cũng an toàn, đúng bài
-- học của lưới migration 014.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE nhat_ky ADD COLUMN IF NOT EXISTS ip text NOT NULL DEFAULT '';

-- ─── 019_kho_token_pancake ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 019_kho_token_pancake — KHO TOKEN PANCAKE VÀO CSDL
--
-- VÌ SAO: token Pancake đang sống ở hai nơi ngoài CSDL — biến `.env` và tệp
-- `pancake-tokens.json` của tiến trình bot v1. Hệ quả đo được 17/09/2026:
--   · màn «Kết nối & token» của v3 phải gọi HTTP sang `/admin/api` của v1 để xem và sửa,
--     nên tắt v1 là màn chết; và cửa ghi ấy bị van `PANCAKE_READONLY` chắn, khiến máy dev
--     KHÔNG thêm được token bằng giao diện dù thêm token không gửi một tin nào cho ai;
--   · không có dấu vết ai thêm/bỏ token lúc nào — tệp JSON không biết người.
--
-- TOÀN HỆ, KHÔNG THEO TEAM — và đó là sự thật của nghiệp vụ, không phải đường tắt: một
-- tài khoản Pancake phủ một NHÓM PAGE, nhóm ấy có thể thuộc nhiều team. Chia theo team là
-- vỡ cơ chế dự phòng đa-token (`src/pancake.js#_pageTokIdx`). Vì vậy bảng này KHÔNG có
-- `team_id`, không vào `BANG_NGHIEP_VU` của tầng truy vấn chung, và chỉ đi qua bộ đọc/ghi
-- riêng `src/token-pancake.js` — cùng khuôn với `ket_noi_pos`, bảng cũng chứa bí mật.
-- Màn hình đã nói thẳng điều này bằng chữ (`LA_TOAN_HE` trong `kho-ket-noi.js`).
--
-- ⛔ TOKEN KHÔNG NẰM TRẦN: `token_ma` là bản mã hoá bằng `V3_KHOA_MA_HOA` (db/khoa.js),
--    y hệt `ket_noi_pos.api_key_ma`. `duoi` giữ 8 ký tự cuối để người nhận mặt được token
--    mà không cần giải mã; `token_bam` là SHA-256 để chặn thêm trùng mà không so bản rõ.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE token_pancake (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten         text        NOT NULL DEFAULT '',   -- tên tài khoản đọc từ payload JWT
  uid         text        NOT NULL DEFAULT '',   -- uid trong JWT, để đối chiếu khi trùng tên
  duoi        text        NOT NULL DEFAULT '',   -- 8 ký tự cuối — KHÔNG đủ để dùng lại token
  het_han     timestamptz,                       -- `exp` của JWT; NULL = token không khai hạn
  token_ma    text        NOT NULL,              -- ⛔ BÍ MẬT (đã mã hoá)
  token_bam   text        NOT NULL UNIQUE,       -- SHA-256 bản rõ — chặn thêm trùng
  bat         boolean     NOT NULL DEFAULT true, -- tắt để ngừng dùng mà không mất dấu vết
  them_boi    bigint      REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  tao_luc     timestamptz NOT NULL DEFAULT now(),
  sua_luc     timestamptz NOT NULL DEFAULT now()
);
-- Bộ gửi hỏi bảng này mỗi vòng làm mới: lấy token còn bật, còn hạn, cũ trước (thứ tự
-- thêm CHÍNH LÀ thứ tự dự phòng, giống hệt quy ước của kho cũ).
CREATE INDEX token_pancake_dung_duoc ON token_pancake (bat, het_han, id);

-- ─── 020_dien_tap ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 020_dien_tap — TRẠNG THÁI «DIỄN TẬP» CHO SỔ GỬI
--
-- Mục đích: chạy bot trên hội thoại THẬT để đo (hiểu đúng không · tư vấn có được không ·
-- trả lời nhanh không) mà KHÔNG gửi cho khách một chữ nào.
--
-- Vì sao chỉ cần một trạng thái mới, không cần bảng mới: `src/queue/lan-gui.js#bocCuaGuiBen`
-- vốn đã ghi NỘI DUNG ĐỊNH GỬI vào `lan_gui` TRƯỚC khi gọi mạng (để chống gửi trùng sau sự
-- cố). Tức «tin bot định gửi» đã nằm sẵn trong sổ — diễn tập chỉ là: ghi xong thì DỪNG, đừng
-- gọi mạng, và đánh dấu để không ai nhầm nó với một lượt gửi thật hay một lượt chưa rõ.
--
-- ⚠️ `dien_tap` KHÁC `dang_gui`: `dang_gui` nghĩa là ĐÃ bắt đầu gửi và chưa biết kết quả —
--    dòng đó bắt người đi đối chiếu kênh. `dien_tap` nghĩa là CHẮC CHẮN không có gì bay ra.
--    Gộp hai cái làm một là đẻ việc đối chiếu giả cho mỗi lượt đo.
--
-- Phụ thuộc: bảng `lan_gui` do 016 tạo.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE lan_gui DROP CONSTRAINT IF EXISTS lan_gui_trang_thai_check;
ALTER TABLE lan_gui ADD CONSTRAINT lan_gui_trang_thai_check
  CHECK (trang_thai IN ('dang_gui', 'da_gui', 'khong_ro', 'dien_tap'));

-- ─── 021_kien_thuc_sp_va_uu_dai ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 021_kien_thuc_sp_va_uu_dai — KIẾN THỨC SẢN PHẨM RA KHỎI PROMPT · ƯU ĐÃI RA KHỎI CHỮ
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- Đo 17/09 trên page thật (Minty Fresh Smile KSA): `kich_ban.noi_dung_may` dài 3.540 ký
-- tự, và trong đó lẫn lộn bốn thứ khác loại — công dụng sản phẩm, bảng giá, luật bán, và
-- câu mẫu FAQ. Ba hậu quả đo được:
--   ① tốn ~1.070 token MỖI LƯỢT cho phần chữ không đổi;
--   ② khuyến mãi và phí ship chỉ tồn tại trong chữ, nên bot hứa freeship mà cửa tiền của
--      server không biết — hai bên nói hai giá, và không lớp nào bắt được;
--   ③ sửa một công dụng phải sửa giữa một khối văn xuôi, không ai soát được cái gì đã đổi.
--
-- ─── HAI BẢNG, HAI CHỦ SỞ HỮU KHÁC NHAU ──────────────────────────────────────────────
-- `san_pham_goc.kien_thuc` — thứ NGƯỜI viết: công dụng, thành phần, hợp với ai, cách dùng,
--   cảnh báo. Đặt ở bảng GỐC chứ không ở `san_pham` (biến thể POS) vì kiến thức thuộc về
--   SẢN PHẨM, không thuộc về shop: mở thị trường mới thì biến thể mới tự thừa hưởng.
--   Dùng jsonb một cột thay vì sáu cột text: các trường này đều dài, đều tuỳ ngành, và
--   thêm một mục mới không nên phải chạy migration.
--
-- `goi_gia` + năm cột — thứ BACKEND tính: giá gốc để nói «giảm bao nhiêu», khuyến mãi,
--   phí ship, cờ freeship, và cờ bật/tắt. Có chúng thì cửa tiền trả về ĐỦ thứ bot cần nói,
--   và bot thôi phải đọc khuyến mãi từ một câu văn.
--
-- ⛔ `bat` MẶC ĐỊNH `true`: mọi bậc giá đang chạy giữ nguyên hành vi sau khi migrate.
-- ⛔ `mien_ship` NULL ≠ false: NULL là «chưa khai», false là «KHÔNG miễn». Cửa tiền phải
--    phân biệt hai cái đó — nói «không freeship» khi chưa ai khai là bịa.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE san_pham_goc ADD COLUMN kien_thuc jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN san_pham_goc.kien_thuc IS
  'Kiến thức sản phẩm do NGƯỜI viết, khoá gợi ý: cong_dung · thanh_phan · hop_voi · cach_dung · canh_bao · them. Prompt Builder ghép có chọn lọc, KHÔNG dán cả khối.';

ALTER TABLE goi_gia ADD COLUMN gia_goc    numeric(14,2);
ALTER TABLE goi_gia ADD COLUMN khuyen_mai text NOT NULL DEFAULT '';
ALTER TABLE goi_gia ADD COLUMN phi_ship   numeric(14,2);
ALTER TABLE goi_gia ADD COLUMN mien_ship  boolean;
ALTER TABLE goi_gia ADD COLUMN bat        boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN goi_gia.gia_goc   IS 'Giá trước giảm, CÙNG đơn vị nhỏ với `gia`. NULL = không có giá gốc để so.';
COMMENT ON COLUMN goi_gia.phi_ship  IS 'Phí ship của bậc này, đơn vị nhỏ. NULL = chưa khai (KHÁC 0 = ship miễn phí).';
COMMENT ON COLUMN goi_gia.mien_ship IS 'NULL = chưa khai · true = miễn ship · false = KHÔNG miễn. Cấm coi NULL là false.';
COMMENT ON COLUMN goi_gia.bat       IS 'Tắt một bậc giá mà không xoá — giữ được dấu vết đơn cũ đã bán theo bậc ấy.';

-- Cửa tiền chỉ đọc bậc ĐANG BẬT; đánh chỉ mục theo đúng lối đọc đó.
CREATE INDEX goi_gia_dang_bat ON goi_gia (team_id, san_pham_id, so_luong) WHERE bat;

-- ─── 022_don_hang_chup_gia ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 022_don_hang_chup_gia — ĐƠN PHẢI GIỮ GIÁ CỦA CHÍNH LÚC NÓ ĐƯỢC TẠO
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- `don_hang` hiện chỉ giữ `tong_tien` + `san_pham_ma[]`. Không có số lượng, không có đơn
-- giá, không có phí ship. Muốn biết «đơn này bán gì, giá bao nhiêu» phải lần ngược
-- `hang_cho_tao_don.du_lieu_don` — mà hàng chờ là bảng THAO TÁC, dọn được và sẽ dọn.
--
-- Nguy hơn: đọc lại `goi_gia` để suy ra đơn giá là đọc giá CỦA HÔM NAY cho một đơn của
-- tháng trước. Đổi một bậc giá là mọi con số lịch sử đổi theo, im lặng — báo cáo doanh
-- thu, tỉ lệ hoàn, biên lãi đều lệch mà không ai thấy lúc nó lệch.
--
-- ─── VÌ SAO KHÔNG ĐẺ BẢNG `don_hang_dong` ─────────────────────────────────────────────
-- Luật của dự án là MỖI PAGE BÁN MỘT SẢN PHẨM (`src/prompts.js:44`), và `san_pham_ma`
-- vốn đã là MẢNG cho đơn POS nhiều dòng. Thêm một bảng dòng hàng lúc này là đẻ nguồn sự
-- thật thứ hai cho cùng một thứ, trong khi chưa có lượt bán nào cần tới nó. Khi nào bán
-- thật nhiều sản phẩm một đơn thì tách — và lúc ấy tách có dữ liệu để mà tách đúng.
--
-- ⛔ `gia_goi`/`phi_ship` ở ĐƠN VỊ NHỎ, cùng quy ước với `goi_gia.gia` (migration 007).
-- ⛔ Cột NULL với đơn cũ: chúng được tạo trước khi có cột này, và bịa số cho chúng còn
--    tệ hơn để trống — báo cáo phải phân biệt «không biết» với «bằng 0».
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE don_hang ADD COLUMN so_luong        int;
ALTER TABLE don_hang ADD COLUMN gia_goi         numeric(14,2);
ALTER TABLE don_hang ADD COLUMN phi_ship        numeric(14,2);
ALTER TABLE don_hang ADD COLUMN khuyen_mai      text NOT NULL DEFAULT '';
ALTER TABLE don_hang ADD COLUMN san_pham_goc_ma text;

COMMENT ON COLUMN don_hang.so_luong        IS 'Số lượng CHỐT lúc tạo đơn. NULL = đơn cũ, tạo trước 022.';
COMMENT ON COLUMN don_hang.gia_goi         IS 'Giá CẢ GÓI của bậc đã khớp (goi_gia.gia), ĐƠN VỊ NHỎ, chụp lúc tạo. Cố ý KHÔNG lưu đơn giá: `Buy 1 Get 1 = 99` không chia được cho số món.';
COMMENT ON COLUMN don_hang.phi_ship        IS 'Phí ship chụp lúc tạo, đơn vị nhỏ. NULL = chưa khai ở bậc giá (KHÁC 0 = miễn phí).';
COMMENT ON COLUMN don_hang.khuyen_mai      IS 'Câu khuyến mãi của bậc giá lúc chốt — để sau này biết đơn ấy bán theo chương trình nào.';
COMMENT ON COLUMN don_hang.san_pham_goc_ma IS 'Mã sản phẩm GỐC — sống lâu hơn mã biến thể POS, nên báo cáo theo sản phẩm vẫn đúng khi shop đổi mã.';

-- ─── 023_nap_bo_qua ───────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 023_nap_bo_qua — TIN BỊ LỌC PHẢI ĐỂ LẠI DẤU VẾT
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- Bộ nạp có NĂM cửa lọc. Một vòng thật trên page 1220547807799752 (21/09):
--
--     nạp: 0 mới · 1 page · lọc: 11 thẻ-chặn · 46 page-nói-cuối
--
-- 57/57 hội thoại bị loại, 0 tin vào hàng đợi. Con số đó CHỈ có trong stdout của worker.
-- Bảng `tin_cho_xu_ly` chỉ chứa tin ĐÃ LỌT — tin bị lọc không để lại một dòng nào.
--
-- Hệ quả: một cửa bắt oan (thẻ "Đã gửi" gắn nhầm, `last_sent_by` sai, mốc kẹt) thì khách
-- im lặng không được trả lời, và KHÔNG MÀN NÀO nói cho ai biết. Muốn kiểm phải SSH đọc
-- log — tức là không ai kiểm. Đó đúng là họ lỗi im lặng mà sổ điều hành gọi tên nhiều lần.
--
-- ─── VÌ SAO MỘT DÒNG MỖI HỘI THOẠI, KHÔNG PHẢI MỖI VÒNG ───────────────────────────────
-- Ghi mỗi vòng một dòng thì 57 hội thoại × 10 vòng/phút = 34.000 dòng/giờ cho MỘT page,
-- và 99,9% trong đó lặp lại y nguyên. Bảng này là ẢNH CHỤP HIỆN TẠI: mỗi hội thoại đúng
-- một dòng, `so_lan` cộng dồn, `lan_dau`/`lan_cuoi` cho biết nó bị bỏ từ bao giờ tới bao
-- giờ. Số dòng vì thế bị chặn bởi SỐ HỘI THOẠI, không phải số vòng quay.
--
-- ─── DÒNG BỊ XOÁ KHI NÀO ──────────────────────────────────────────────────────────────
-- Khi chính hội thoại đó được nạp vào hàng đợi. Còn dòng ở đây = "đang bị bỏ qua", hết
-- dòng = "đã được xử lý". Bảng luôn trả lời đúng một câu hỏi: **ngay bây giờ, những
-- hội thoại nào đang không được trả lời, và vì sao.**
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE nap_bo_qua (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id   bigint      NOT NULL REFERENCES team(id),
  page_id   text        NOT NULL,
  conv_id   text        NOT NULL,
  psid      text        NOT NULL DEFAULT '',
  -- MÃ cửa đã chặn. Mã chứ không phải câu chữ: màn dịch sang tiếng người, và đổi câu chữ
  -- không được làm hỏng phép đếm theo nhóm.
  ly_do     text        NOT NULL
            CHECK (ly_do IN ('the_chan','page_noi_cuoi','da_doc','moc_cu','cho_go_xong','khong_co_psid')),
  chu_thich text        NOT NULL DEFAULT '',
  so_lan    int         NOT NULL DEFAULT 1 CHECK (so_lan > 0),
  lan_dau   timestamptz NOT NULL DEFAULT now(),
  lan_cuoi  timestamptz NOT NULL DEFAULT now(),
  -- Một hội thoại một dòng — đó là điều làm bảng này không phình theo vòng quay.
  UNIQUE (team_id, page_id, conv_id)
);

-- Màn hỏi "page này đang bỏ qua những gì", sắp theo lần bỏ gần nhất.
CREATE INDEX nap_bo_qua_page_luc ON nap_bo_qua (team_id, page_id, lan_cuoi DESC);
