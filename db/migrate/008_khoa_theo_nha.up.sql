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
