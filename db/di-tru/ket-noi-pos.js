// DI TRÚ kết nối POS: `pancake-shops.json` (gốc repo) → bảng `ket_noi_pos` (mig 002).
//
// Nguồn khoá POS THẬT là tệp này, KHÔNG phải `pages.json.posApiKey` — sổ §9 đã đo:
// 112/112 giá trị `posApiKey` trong pages.json đã bị CHE (dạng `***xxxx`, chỉ 6 ký tự),
// đọc nhầm cột đó là nạp 112 khoá chết vào CSDL mà không ai biết.
//
// Team = `chua-phan` (team KỸ THUẬT), giống hệt pattern của page/hội thoại ở L0-M1:
// mapping thị trường ↔ team là việc NGƯỜI H7 (§8 sổ), ⛔ CẤM đoán team theo thị trường.
//
// CHẠY LẠI ĐƯỢC và ỔN ĐỊNH: mỗi lượt chạy giải mã khoá đang có ra so với khoá nguồn,
// CHỈ ghi đè khi khác. (Bao thư AES-GCM có IV ngẫu nhiên nên nếu cứ UPDATE mù thì lượt
// nào cột cũng đổi giá trị — nhìn như có thay đổi trong khi không có gì đổi cả.)
import fs from "node:fs";
import path from "node:path";
import { GOC } from "../ket-noi.js";
import { maHoa, giaiMa } from "../khoa.js";
import { moiTruongKhoa } from "../../src/pos/moi-truong.js";

export const TEP_NGUON = "pancake-shops.json";

export function docNguon(goc = GOC) {
  const tep = path.join(goc, TEP_NGUON);
  if (!fs.existsSync(tep)) return { tep, shop: [] };
  const raw = JSON.parse(fs.readFileSync(tep, "utf8"));
  const shop = (Array.isArray(raw) ? raw : []).filter(
    (s) => s && s.market && s.shop_id && s.api_key,
  );
  return { tep, shop, soDongTho: Array.isArray(raw) ? raw.length : 0 };
}

export async function diTruKetNoiPos(
  pool,
  goc = GOC,
  { env = process.env } = {},
) {
  const moi = moiTruongKhoa(env, goc);
  const { shop, soDongTho } = docNguon(goc);
  // LƯỚI MIGRATION (án lệ #7 skill tho-thi-cong): bộ nạp này ra đời SAU 001_nen, nên nó
  // phải sống được trên CSDL chưa áp 002 — «mù CÓ NÓI RA», không chết giữa lượt di trú
  // rồi kéo đổ cả phần page/hội thoại của L0-M1.
  const coBang = await pool.query(
    "SELECT to_regclass('public.ket_noi_pos') AS t",
  );
  if (!coBang.rows[0].t) {
    return {
      nguon: shop.length,
      soDongTho,
      them: 0,
      capNhat: 0,
      giuNguyen: 0,
      thiTruong: [],
      dich: null,
      chuaCoBang: true,
    };
  }
  const t = await pool.query("SELECT id FROM team WHERE slug = 'chua-phan'");
  if (!t.rowCount)
    throw new Error("không có team kỹ thuật 'chua-phan' — chạy migrate trước.");
  const teamId = t.rows[0].id;

  const kq = {
    nguon: shop.length,
    soDongTho,
    them: 0,
    capNhat: 0,
    giuNguyen: 0,
    thiTruong: [],
    boQua: [],
  };
  for (const s of shop) {
    const co = await pool.query(
      "SELECT id, shop_id, api_key_ma FROM ket_noi_pos WHERE team_id = $1 AND market = $2",
      [teamId, s.market],
    );
    if (!co.rowCount) {
      await pool.query(
        `INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)`,
        [teamId, s.market, String(s.shop_id), maHoa(s.api_key, moi)],
      );
      kq.them++;
    } else {
      const cu = co.rows[0];
      let khoaCu = null;
      try {
        khoaCu = giaiMa(cu.api_key_ma, moi);
      } catch {
        khoaCu = null; // bao thư hỏng / đổi khoá gốc ⇒ coi như khác, ghi lại
      }
      if (khoaCu === s.api_key && cu.shop_id === String(s.shop_id)) {
        kq.giuNguyen++;
      } else {
        await pool.query(
          "UPDATE ket_noi_pos SET shop_id = $1, api_key_ma = $2, sua_luc = now() WHERE id = $3",
          [String(s.shop_id), maHoa(s.api_key, moi), cu.id],
        );
        kq.capNhat++;
      }
    }
    kq.thiTruong.push(s.market);
  }
  const d = await pool.query(
    "SELECT count(*)::int c FROM ket_noi_pos WHERE team_id = $1",
    [teamId],
  );
  kq.dich = d.rows[0].c;
  return kq;
}
