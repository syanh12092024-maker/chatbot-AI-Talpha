// TẦNG ĐỌC CỦA MÀN «CHI PHÍ AI» (G2-G2, sóng 3 — làm ở sóng 4).
//
// Yêu cầu nguyên văn: *«127 đ/tin · 6.696 đ/đơn · bảng theo page tìm chỗ đốt tiền mà không
// ra đơn»*.
//
// ═══ HAI CUỐN SỔ CÙNG ĐO MỘT CHUYỆN, VÀ CHÚNG LỆCH NHAU ═══════════════════════════════
//   · `so_ai` (CSDL v3)  — sổ cái DÀI HẠN, người A dựng. Đo 25/08: **0 dòng**.
//   · `/token-cost` (v1) — tiến trình bot tự đo. Đo 25/08: **1.145.472 đ**, 13.972 lượt.
//
// `so_ai` rỗng KHÔNG có nghĩa là không ai tiêu đồng nào — nó có nghĩa luồng sống của v3
// chưa đẩy dữ liệu vào đó. Hiện số 0 của v3 lên màn chi phí là nói với chủ dự án rằng bot
// không tốn tiền, trong khi tháng vừa rồi hết hơn một triệu.
//
// ⇒ Màn lấy TIỀN từ v1 (nơi đo thật), và hiện trạng thái của `so_ai` như một **việc còn
//   dở**, không như một con số. Đây là lần thứ tư cùng một bài học: `bot_ai_bat` (B-Y7),
//   `san_pham`, `viec_can_xu_ly`, và giờ là `so_ai`.
//
// ═══ ĐO THẬT vs ƯỚC — KHÔNG GỘP ═══════════════════════════════════════════════════════
// v1 trả `measured` = số lượt có token thật từ nhà cung cấp. Phần còn lại là ước từ độ dài
// chữ. Đo 25/08: 9.051/13.972 lượt là đo thật (65%). Màn nói tỉ lệ đó ra — một con số tiền
// mà không kèm «bao nhiêu phần trăm là đo thật» thì người ta tin nó chính xác hơn thực tế.
//
// ═══ CẢNH BÁO «ĐỐT TIỀN KHÔNG RA ĐƠN» ═════════════════════════════════════════════════
// Chỉ cảnh báo page CÓ TIÊU mà KHÔNG ra đơn. Page 0 lượt gọi thì không đốt gì cả — gộp
// chúng vào là biến một cảnh báo thật thành một danh sách 400 dòng không ai đọc.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_PAGE = 'page';
export const BANG_SO_AI = 'so_ai';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

/** Nguồn của con số tiền. Màn PHẢI hiện mã này cạnh con số. */
export const NGUON = Object.freeze({
  BOT_V1: 'tien-trinh-bot-v1',
  SO_AI_V3: 'so_ai-cua-csdl-v3',
  KHONG_DOC_DUOC: 'khong-doc-duoc',
});

export class LoiChiPhi extends Error {
  constructor(thongDiep, ma = 'chi_phi', status = 400) {
    super(thongDiep);
    this.name = 'LoiChiPhi';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docChiPhiBot = null;
let _docSoAiV3 = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiChiPhi('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
/** Cầu sang tiến trình bot — nơi đo tiền THẬT. */
export function datDocChiPhiBot(fn) { _docChiPhiBot = fn || null; return _docChiPhiBot; }
/** `chiPhiAiTheoPage` của người A — sổ cái v3. Dùng để ĐỐI CHIẾU, không phải nguồn chính. */
export function datDocSoAi(fn) { _docSoAiV3 = fn || null; return _docSoAiV3; }
export const daNoiChiPhi = () => typeof _taoTruyVan === 'function' && typeof _docChiPhiBot === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiChiPhi('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

export async function manChiPhi(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);

  const cuaTeam = new Map(
    (await truyVan(bc).chon(BANG_PAGE, {}, { sapXep: 'ten' })).map((p) => [String(p.page_id), p]),
  );

  if (!_docChiPhiBot) {
    return {
      teamId: bc.teamId, nguon: NGUON.KHONG_DOC_DUOC, tong: null, page: [], soAi: null,
      trong: {
        rong: true, vi: 'chua-nap',
        noi: 'Chưa nối cầu sang tiến trình bot nên chưa đọc được chi phí.',
        diTiep: 'Đặt `V3_BOT_V1_GOC`, `ADMIN_USER`, `ADMIN_PASS` rồi khởi động lại v3. '
          + 'Sổ `so_ai` của v3 KHÔNG dùng thay được — nó chưa có dòng nào.',
      },
    };
  }

  let bot;
  try {
    bot = await _docChiPhiBot();
  } catch (e) {
    // 0 đồng là một con số, và nó SAI. Ném.
    throw new LoiChiPhi(
      `Không đọc được chi phí từ tiến trình bot: ${e?.message || e}. Màn TỪ CHỐI hiện 0 — `
      + '«0 đồng» ở màn chi phí là câu dễ tin nhất và sai nhất.', 'cau_hong', 502,
    );
  }

  // ── phần của TEAM ──
  const cua = (bot.page || []).filter((p) => cuaTeam.has(p.pageId));
  const page = cua
    .map((p) => ({
      ...p,
      ten: p.ten || cuaTeam.get(p.pageId).ten || p.pageId,
      marketer: (cuaTeam.get(p.pageId).marketer || '').trim(),
      // CHỈ page CÓ TIÊU mà KHÔNG ra đơn. Page 0 lượt không đốt gì cả.
      dotTienKhongRaDon: p.soLuot > 0 && p.soDon === 0,
      // Bao nhiêu phần trăm con số của page này là đo thật.
      tiLeDoThat: p.soLuot > 0 ? Math.round((p.soLuotDoThat / p.soLuot) * 100) : null,
    }))
    .sort((a, b) => b.tienVnd - a.tienVnd || b.soLuot - a.soLuot);

  const tongLuot = page.reduce((s, p) => s + p.soLuot, 0);
  const tongDoThat = page.reduce((s, p) => s + p.soLuotDoThat, 0);
  const tongTien = page.reduce((s, p) => s + p.tienVnd, 0);
  const tongDon = page.reduce((s, p) => s + p.soDon, 0);
  const dot = page.filter((p) => p.dotTienKhongRaDon);

  // ── đối chiếu với sổ cái v3 ──
  let soAi = null;
  if (_docSoAiV3) {
    try {
      const v3 = await _docSoAiV3(bc);
      const luotV3 = (v3.dsPage || []).reduce((s, x) => s + (x.soLuot || 0), 0);
      soAi = {
        soLuot: luotV3,
        tienVnd: Number(v3.tongTienVnd || 0),
        canhBao: v3.canhBao || null,
        viSaoRong: v3.boiCanh && !v3.boiCanh.coDuLieu ? v3.boiCanh.viSaoRong : null,
      };
    } catch (e) {
      soAi = { loi: String(e?.message || e) };
    }
  }

  return {
    teamId: bc.teamId,
    nguon: NGUON.BOT_V1,
    nhaCungCap: bot.nhaCungCap,
    tong: {
      soLuot: tongLuot,
      soLuotDoThat: tongDoThat,
      tiLeDoThat: tongLuot > 0 ? Math.round((tongDoThat / tongLuot) * 100) : null,
      tienVnd: tongTien,
      soDon: tongDon,
      // ⚠️ CHIA CHO SỐ LƯỢT **ĐO THẬT**, KHÔNG CHIA CHO TỔNG LƯỢT.
      //
      // Bản đầu của tôi chia cho tổng lượt và ra 82 đ/tin, trong khi v1 nói 127 đ/tin trên
      // gần như cùng một lượng. `src/economics.js` đã ghi sẵn lý do — và ghi trước khi tôi
      // mắc: *«token chỉ ghi từ 06/08/2026, chia trên tổng tin sẽ ra ĐƠN GIÁ RẺ GIẢ TẠO»*.
      // Tiền đo được là tiền của phần CÓ SỐ ĐO; đem nó chia cho cả những lượt chưa từng
      // được đo là pha loãng bằng một mẫu số không sinh ra đồng nào trong tử số.
      //
      // Dùng ĐÚNG công thức của v1, không tự tính lại: hai công thức cho một chỉ số thì
      // nghiệm thu «sai lệch dưới 1%» chỉ là so hai cách tính khác nhau rồi tự khen nhau.
      vndMoiTin: tongDoThat > 0 ? Math.round(tongTien / tongDoThat) : null,
      vndMoiDon: (tongDoThat > 0 && tongDon > 0)
        ? Math.round((tongTien / tongDoThat) * (tongLuot / tongDon)) : null,
      tinMoiDon: tongDon > 0 ? +(tongLuot / tongDon).toFixed(1) : null,
    },
    // Con số toàn hệ của v1 — giữ lại để đối chiếu khi nghi ngờ phần team.
    toanHe: {
      tienVnd: bot.tienVnd, soLuot: bot.soLuotTraLoi, soDon: bot.soDon,
      vndMoiTin: bot.vndMoiTin, vndMoiDon: bot.vndMoiDon, tinMoiDon: bot.tinMoiDon,
    },
    page,
    dotTien: {
      so: dot.length,
      tien: dot.reduce((s, p) => s + p.tienVnd, 0),
      ds: dot.slice(0, 10).map((p) => ({ pageId: p.pageId, ten: p.ten, tienVnd: p.tienVnd, soLuot: p.soLuot })),
    },
    soAi: lechSoAi(soAi, tongLuot, tongTien),
    trong: page.length ? null : {
      rong: true, vi: tongLuot === 0 ? 'xong' : 'chua-nap',
      noi: 'Không page nào của team có lượt gọi model nào trong sổ của tiến trình bot.',
      diTiep: 'Bot chưa chạy trên page nào của team này — xem Cửa kiểm sẵn sàng.',
    },
  };
}

/**
 * Hai sổ nói khác nhau thì nói ra, kèm con số. Không im, và cũng không âm thầm chọn một bên
 * rồi để người ta tưởng cả hai đều nói thế.
 */
function lechSoAi(soAi, luotBot, tienBot) {
  if (!soAi) return null;
  if (soAi.loi) {
    return { docDuoc: false, noi: `Không đọc được sổ \`so_ai\` của v3: ${soAi.loi}` };
  }
  const lech = soAi.soLuot !== luotBot;
  return {
    docDuoc: true,
    soLuot: soAi.soLuot,
    tienVnd: soAi.tienVnd,
    coLech: lech,
    canhBao: soAi.canhBao || null,
    noi: !lech
      ? 'Sổ `so_ai` của v3 khớp với số đo của tiến trình bot.'
      : `Sổ \`so_ai\` của CSDL v3 ghi **${soAi.soLuot} lượt / ${soAi.tienVnd.toLocaleString('vi-VN')} đ**, `
        + `còn tiến trình bot đo được **${luotBot} lượt / ${tienBot.toLocaleString('vi-VN')} đ**. `
        + 'Con số trên màn lấy theo TIẾN TRÌNH BOT — đó là nơi tiền thật sự bị tiêu.',
    viSao: soAi.viSaoRong
      || (lech ? 'Luồng sống của v3 chưa ghi vào `so_ai`. Sổ cái dài hạn còn trống, không '
        + 'phải vì không ai tiêu tiền.' : null),
  };
}
