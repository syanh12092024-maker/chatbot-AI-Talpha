import { ctxHeThong, layNhieu } from "../db/index.js";
const CTX_DOC = ctxHeThong({ ghiNhatKy: false });

/** Sản phẩm/gói giá theo Page và mapping sản phẩm gốc × shop. */
export async function docSanPhamGoiGia(pool, teamId, pageRowId, trang = {}) {
  // Page mới dùng cùng sản phẩm gốc, nhưng giá phải thuộc đúng shop/thị trường.
  const maGoc = trang.san_pham_goc_ma;
  if (maGoc && !trang.pos_shop_id) return [];
  const tatCa = await layNhieu(pool, CTX_DOC, "san_pham", {
    dieuKien: maGoc ? { team_id: teamId, ma_goc: maGoc } : { team_id: teamId, page_id: pageRowId },
    thuTu: "ma",
  });
  const sp = maGoc ? tatCa.filter(s => String(s.ma).startsWith(`${trang.pos_shop_id}:`)) : tatCa;

  // KIẾN THỨC SẢN PHẨM đi kèm từ bảng GỐC (021). Nó thuộc về sản phẩm, không thuộc shop —
  // nên biến thể của thị trường mới thừa hưởng ngay, không phải chép lại.
  const goc = new Map();
  for (const ma of new Set(sp.map((s) => s.ma_goc).filter(Boolean))) {
    const g = await layNhieu(pool, CTX_DOC, "san_pham_goc", { dieuKien: { team_id: teamId, ma_goc: ma } });
    if (g[0]) goc.set(ma, g[0]);
  }

  const ra = [];
  for (const s of sp) {
    const goiGia = await layNhieu(pool, CTX_DOC, "goi_gia", {
      dieuKien: { team_id: teamId, san_pham_id: s.id },
      thuTu: "so_luong",
    });
    const g = s.ma_goc ? goc.get(s.ma_goc) : null;
    ra.push({
      ...s,
      // Bậc TẮT không ra khỏi cửa này: nơi gọi (cửa tiền, prompt) không phải nhớ lọc, và
      // quên lọc một chỗ là bot chào một giá đã ngừng bán.
      goiGia: goiGia.filter((x) => x.bat !== false),
      goiGiaTat: goiGia.filter((x) => x.bat === false).length,
      kienThuc: g?.kien_thuc && typeof g.kien_thuc === "object" ? g.kien_thuc : {},
      tenGoc: g?.ten || "",
    });
  }
  return ra;
}

