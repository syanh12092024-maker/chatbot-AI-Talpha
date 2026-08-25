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
