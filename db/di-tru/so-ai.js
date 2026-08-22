// Bộ nạp SỔ AI (`ai-messages.jsonl`) → bảng `so_ai`.
//
// ⚠️ Tệp này KHÔNG có ở máy local — nó chỉ sống trên VPS `/opt/aicloser/`. Vì vậy bộ nạp
//    NHẬN ĐƯỜNG DẪN LÀM THAM SỐ và lượt nạp thật + phép đối chiếu số dòng chạy trên VPS
//    ở đợt cutover (đã mở nợ §9 sổ điều hành; KHÔNG tính là đạt ở GATE R0).
//
// Khuôn một dòng (đọc từ `src/ai-log.js:logAi` của bản đang chạy):
//   { t: <epoch ms>, page: '<pageId>', cust: '<psid>', type: '<loại>', ...meta }
//   reply: tin/tout/cread/cwrite/calls · lane · state · scriptVersion · text · name
//   handoff: reason · kind        order: name/phone/city/qty        image: cat/n
//
// MÃ MODEL: `logAi` của bản đang chạy KHÔNG ghi trường model (đo 22/08 — grep 10/10 chỗ
// gọi `logAi(` đều không truyền). 02 §"Nền dữ liệu" bắt `so_ai` phải có mã model «ngay từ
// đầu». Nên bộ nạp:
//   · dòng CÓ `model`/`ma_model` → lấy đúng giá trị đó;
//   · dòng KHÔNG có             → phải được người chạy KHAI bằng `maModelCu`.
// Thiếu khai thì NÉM LỖI kèm số dòng thiếu — cấm đoán 'kimi-k2.6' cho cả sổ, vì sổ có cả
// giai đoạn chạy Claude và một giá trị bịa sẽ làm mọi phép so tiền/model sai vĩnh viễn.
import fs from "node:fs";
import path from "node:path";

export const LOAI_HOP_LE = new Set([
  "reply",
  "order",
  "handoff",
  "image",
  "other_bot",
  "yielded",
  "spent_no_send",
]);

const so = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export function docSoAi(duong, { maModelCu = null } = {}) {
  const ten = path.basename(duong);
  const raw = fs.readFileSync(duong, "utf8").split("\n");
  const dong = [];
  const hong = [];
  const thieuModel = [];
  raw.forEach((s, i) => {
    const stt = i + 1;
    if (!s.trim()) return;
    let r;
    try {
      r = JSON.parse(s);
    } catch {
      hong.push(stt);
      return;
    }
    const loai = String(r.type || "");
    if (!LOAI_HOP_LE.has(loai)) {
      hong.push(stt);
      return;
    }
    const maModel = r.model || r.ma_model || maModelCu;
    if (!maModel) {
      thieuModel.push(stt);
      return;
    }
    const { t, page, cust, type, ...meta } = r;
    dong.push({
      nguonTep: ten,
      nguonDong: stt,
      xayRaLuc: new Date(Number(t) || 0),
      pageId: String(page || ""),
      psid: String(cust || ""),
      loai,
      maModel: String(maModel),
      lane: r.lane == null ? null : String(r.lane),
      trangThai: r.state == null ? null : String(r.state),
      banKichBan: r.scriptVersion == null ? null : String(r.scriptVersion),
      lyDo: r.reason == null ? null : String(r.reason),
      tokenVao: so(r.tin),
      tokenRa: so(r.tout),
      cacheDoc: so(r.cread),
      cacheGhi: so(r.cwrite),
      soLanGoi: so(r.calls),
      duLieu: meta,
    });
  });
  return {
    dong,
    hong,
    thieuModel,
    soDongTep: raw.filter((s) => s.trim()).length,
  };
}

export async function napSoAi(
  pool,
  duong,
  { maModelCu = null, teamSlug = "chua-phan" } = {},
) {
  const r = await pool.query("SELECT id FROM team WHERE slug = $1", [teamSlug]);
  if (!r.rowCount) throw new Error(`chưa có team slug='${teamSlug}'`);
  const teamId = r.rows[0].id;

  const { dong, hong, thieuModel, soDongTep } = docSoAi(duong, { maModelCu });
  if (thieuModel.length) {
    throw new Error(
      `${thieuModel.length}/${soDongTep} dòng của ${path.basename(duong)} không khai mã model ` +
        `(dòng đầu: ${thieuModel.slice(0, 5).join(", ")}). Chạy lại với maModelCu = mã model ` +
        "đã chạy ở giai đoạn đó — cấm đoán hộ.",
    );
  }

  let them = 0;
  for (const d of dong) {
    const q = await pool.query(
      `INSERT INTO so_ai (team_id, xay_ra_luc, page_id, psid, loai, ma_model, lane, trang_thai,
                          ban_kich_ban, ly_do, token_vao, token_ra, cache_doc, cache_ghi,
                          so_lan_goi, du_lieu, nguon_tep, nguon_dong)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (nguon_tep, nguon_dong) DO NOTHING`,
      [
        teamId,
        d.xayRaLuc,
        d.pageId,
        d.psid,
        d.loai,
        d.maModel,
        d.lane,
        d.trangThai,
        d.banKichBan,
        d.lyDo,
        d.tokenVao,
        d.tokenRa,
        d.cacheDoc,
        d.cacheGhi,
        d.soLanGoi,
        JSON.stringify(d.duLieu),
        d.nguonTep,
        d.nguonDong,
      ],
    );
    them += q.rowCount;
  }
  return { soDongTep, doc: dong.length, them, hong };
}
