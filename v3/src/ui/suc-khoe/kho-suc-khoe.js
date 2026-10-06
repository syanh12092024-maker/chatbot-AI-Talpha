// TẦNG ĐỌC CỦA MÀN «SỨC KHOẺ HỆ THỐNG» (G2-E4, sóng 3).
//
// ═══ MÀN NÀY SINH RA TỪ HAI SỰ CỐ THẬT ══════════════════════════════════════════════════
//   06/08/2026 — tài khoản nhà chính hết tiền, bot đứng im **ba tiếng** mà không ai biết.
//   23/08/2026 — lặp lại, **731 phút**.
// Tiêu chí nghiệm thu sóng 3 ghi thẳng: *«Sức khỏe hệ thống phải bắt được ĐÚNG sự cố 23/08:
// tài khoản AI hết tiền → đèn đỏ `llm_account` + số phút đang dừng.»*
//
// ═══ LUẬT CỦA MỘT CÁI ĐÈN ═══════════════════════════════════════════════════════════════
// Một cái đèn chỉ đáng có nếu nó trả lời được ba câu:
//   ① đang ĐỎ hay XANH — và ĐỎ nghĩa là gì (hỏng rồi, hay sắp hỏng?)
//   ② VÌ SAO — bằng số, không bằng tính từ
//   ③ ĐI ĐÂU để sửa
// Đèn thiếu ③ là đèn báo động rồi bỏ mặc người ta. Đèn thiếu ② là đèn không ai tin.
//
// ⛔ VÀ MỘT CÁI ĐÈN KHÔNG ĐO ĐƯỢC THÌ PHẢI MÀU XÁM, KHÔNG PHẢI XANH.
//    Đây là chỗ dễ sai nhất của mọi bảng sức khoẻ: không đo được mà tô xanh thì người ta
//    yên tâm về đúng thứ mình đang mù. Xám = «chưa đo được», và nói rõ vì sao chưa đo được.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
// Luật xét «máy chạy bot còn sống không» — CHUNG với dải trạng thái. Viết lại ở đây là hẹn
// ngày hai chỗ nói hai điều khác nhau về cùng một máy.
import { docNhipMayBot } from '../chung/nhip-may-bot.js';
// GL2: trần số page bật bot TOÀN HỆ — luật (`vuotTran`) + câu số đo (`cauSoTran`) dùng CHUNG với worker và cổng bật.
import { tranPageBat, vuotTran, cauSoTran } from '../../../../src/queue/page-routing.js';
// Cầu dao «giao page bằng giao diện» (024) — đèn ⑪ chỉ có nghĩa khi biết nguồn nào đang dùng.

export const MUC = Object.freeze({
  XANH: 'xanh',   // đo được, và đang ổn
  VANG: 'vang',   // đo được, sắp hỏng
  DO: 'do',       // đo được, đang hỏng
  XAM: 'xam',     // KHÔNG đo được — khác hẳn «đang ổn»
});

export const CHU_MUC = Object.freeze({
  xanh: 'Ổn', vang: 'Cần để ý', do: 'Đang hỏng', xam: 'Chưa đo được',
});

export class LoiSucKhoe extends Error {
  constructor(thongDiep, ma = 'suc_khoe', status = 400) {
    super(thongDiep);
    this.name = 'LoiSucKhoe';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _taoTruyVan = null;
let _docKhoToken = null;
/**
 * Bộ đọc CỬA KIỂM (TOÀN HỆ, không theo team). Lịch sử: trước CR-02-10 · MB2 nó là «nguồn thật của công tắc AI» (cột
 * `bot_ai_bat` khi ấy chỉ là bản sao của `ai-enabled.json`); từ MB2 cột LÀ sự thật và đèn ⑤ ⑥ đếm cột của team.
 * GL2 (07/10): dùng lại bộ đọc này cho MỘT việc — đếm số page bật TOÀN HỆ so với trần (`docTranToanHe` ở dưới), vì
 * cổng truy vấn của màn kẹp team. Máy thật tiêm `noiVanHanhV3(pool)` (`v3/chay-that.js:299`).
 */
let _docSanSang = null;
let _trangThaiCauBot = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSucKhoe('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

/** Kho token Pancake — tiêm để không import chéo sang module `ket-noi`. */
export function datDocSanSang(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSucKhoe('datDocSanSang cần một hàm');
  _docSanSang = fn || null;
  return _docSanSang;
}
export function datDocKhoToken(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSucKhoe('datDocKhoToken cần một hàm');
  _docKhoToken = fn || null;
  return _docKhoToken;
}

/** Trạng thái cầu sang tiến trình bot. */
export function datTrangThaiCauBot(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSucKhoe('datTrangThaiCauBot cần một hàm');
  _trangThaiCauBot = fn || null;
  return _trangThaiCauBot;
}

function congTruyVan(bc) {
  if (!_taoTruyVan) throw new LoiSucKhoe('chưa nối cổng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/* ─────────────────────────── dựng một đèn ─────────────────────────── */

/**
 * Dựng một đèn, và BẮT BUỘC đủ ba câu trả lời. Thiếu là ném ngay tại chỗ dựng — một cái đèn
 * thiếu lý do hoặc thiếu đường đi tiếp thì thà đừng có, vì nó dạy người ta bỏ qua đèn.
 */
export function den({ ma, ten, muc, vi, diTiep = null, so = null }) {
  if (!ma || !ten) throw new LoiSucKhoe('đèn phải có mã và tên');
  if (!Object.values(MUC).includes(muc)) throw new LoiSucKhoe(`mức đèn lạ: ${muc}`);
  if (!vi) throw new LoiSucKhoe(`đèn "${ma}" thiếu câu VÌ SAO — đèn không nói lý do là đèn không ai tin`);
  if ((muc === MUC.DO || muc === MUC.VANG) && !diTiep) {
    throw new LoiSucKhoe(
      `đèn "${ma}" đang ${muc} mà không chỉ đường đi tiếp — báo động rồi bỏ mặc người ta.`,
    );
  }
  return { ma, ten, muc, vi, diTiep, so };
}

/* ─────────────────────────── chín đèn ─────────────────────────── */

/** Ngưỡng đo được, khai một chỗ. */
export const NGUONG = Object.freeze({
  tokenSapHetNgay: 7,
  hoiThoaiIm: 24 * 3600 * 1000,   // 24 giờ không có hội thoại mới = đáng ngờ
});

export async function bangDen(boiCanh, { bay = Date.now(), env = process.env } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);

  const [pages, cauHinh, kichBan, soAi, viec] = await Promise.all([
    db.chon('page', {}),
    db.chon('cau_hinh_model', {}),
    db.chon('kich_ban', { trang_thai: 'LIVE' }),
    db.dem('so_ai', {}),
    db.chon('viec_can_xu_ly', {}),
  ]);

  // ── CÔNG TẮC BOT (CR-02-10 · MB2): cột `page.bot_ai_bat` LÀ sự thật — worker đọc thẳng nó. Trước
  //    02/10 màn hỏi RAM tiến trình bot v1 trước vì cột chỉ là bản sao; nay không còn bản sao nào.
  const botBat = pages.filter((p) => p.bot_ai_bat === true);
  const nguonBotBat = {
    nguon: 'cot_csdl',
    noi: 'Đếm từ cột `page.bot_ai_bat` — công tắc duy nhất, chính cột worker đọc.',
    lech: null,
  };
  const coKichBan = new Set(kichBan.map((k) => String(k.page_id)));
  // GL2: trần là TOÀN HỆ còn cổng truy vấn ở trên KẸP TEAM ⇒ đếm riêng, không dùng `botBat.length` (review (a) C2).
  const tran = await docTranToanHe(botBat, env);
  const ds = [];

  /* ① MODEL AI — đèn của sự cố 06/08 và 23/08 */
  if (!cauHinh.length) {
    ds.push(den({
      ma: 'llm_cau_hinh', ten: 'Model AI', muc: MUC.DO,
      vi: 'Team chưa cấu hình model nào. Bot đang chạy bằng bộ '
        + 'mặc định của hệ, và không ai chọn được model rẻ hơn hay đặt dự phòng.',
      diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
      so: '0 dòng cấu hình',
    }));
  } else {
    const vaiTro = new Set(cauHinh.map((c) => c.vai_tro));
    const thieu = ['chinh', 'du_phong', 'nen'].filter((v) => !vaiTro.has(v));
    ds.push(thieu.length
      ? den({
        ma: 'llm_cau_hinh', ten: 'Model AI', muc: MUC.VANG,
        vi: `Thiếu cấu hình cho vai trò: ${thieu.join(', ')}. Thiếu \`du_phong\` là nhà chính `
          + 'hết tiền thì bot đứng im — đúng cảnh 06/08 (3 tiếng) và 23/08 (731 phút).',
        diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
        so: `${cauHinh.length}/3 vai trò`,
      })
      : den({
        ma: 'llm_cau_hinh', ten: 'Model AI', muc: MUC.XANH,
        vi: 'Đủ ba vai trò: chính, dự phòng, nền.', so: '3/3 vai trò',
      }));
  }

  /* ② KHOÁ MODEL — đo được hay không tuỳ kho khoá có nối chưa */
  ds.push(await denKhoaModel(bc, cauHinh));

  /* ③ LÕI BOT — cửa ghi vào kho kiến thức / công tắc (khoá tay) */
  ds.push(denCauBot());

  /* ③b MÁY CHẠY BOT — thứ thật sự trả lời khách (worker v3).
     Đèn ③ nói về CỬA GHI vào lõi bot; đèn này nói về máy xử tin. Hai thứ khác nhau, và trước
     25/09 không đèn nào canh cái thứ hai. */
  ds.push(denMayChayBot(await docNhipMayBot({ boiCanh: bc }), tran));

  /* ④ TOKEN PANCAKE */
  ds.push(await denToken(bay));

  /* ⑤ CÔNG TẮC BOT — và TRẦN TOÀN HỆ (GL2): vượt ⇒ worker DỪNG hẳn ⇒ đèn ĐỎ ở MỌI team */
  const veTran = ` Toàn hệ ${tran.doDuoc ? '' : `(ít nhất — ${tran.viSaoMu}) `}${cauSoTran(tran.soBat, env)}.`;
  ds.push(tran.vuot
    ? den({
      ma: 'bot_bat', ten: 'Page đang bật bot', muc: MUC.DO,
      vi: `Worker đang DỪNG vì vượt trần: ${cauSoTran(tran.soBat, env)} — bot KHÔNG trả lời page NÀO, kể cả page `
        + 'trong trần, cho tới khi số page bật ≤ trần. '
        + (botBat.length ? `Team này đang bật ${botBat.length}: ${botBat.map((p) => p.ten || p.page_id).join(', ')}.` : 'Team này không bật page nào.')
        + (tran.soBat > botBat.length ? ` Còn ${tran.soBat - botBat.length} page bật ở team khác.` : ''),
      diTiep: { chu: 'Tắt bớt page ở màn Page & Bot (hoặc nhờ quản trị hệ thống nâng trần)', duong: '/page-bot' },
      so: `${tran.soBat}/${tran.tran} page — vượt trần`,
    })
    : botBat.length
      ? den({
        ma: 'bot_bat', ten: 'Page đang bật bot', muc: MUC.XANH,
        vi: `${botBat.length}/${pages.length} page đang để bot tự trả lời khách.${veTran}`,
        so: `${botBat.length} page`,
      })
      : den({
        ma: 'bot_bat', ten: 'Page đang bật bot', muc: MUC.VANG,
        vi: `Không page nào đang bật bot — hệ thống có ${pages.length} page nhưng không page nào `
          + `để bot trả lời. Nếu đó là chủ ý thì bỏ qua; nếu không thì đây là lý do không có lượt chat nào.${veTran}`,
        diTiep: { chu: 'Sang màn Page & Bot', duong: '/page-bot' },
        so: `0/${pages.length} page`,
      }));

  /* ⑥ KỊCH BẢN CHO PAGE ĐANG BẬT BOT — chỗ nguy nhất, và dễ bị bỏ qua nhất */
  const batMaKhongKichBan = botBat.filter((p) => !coKichBan.has(String(p.id)));
  ds.push(batMaKhongKichBan.length
    ? den({
      ma: 'kich_ban_thieu', ten: 'Kịch bản của page bật bot', muc: MUC.DO,
      vi: `${batMaKhongKichBan.length}/${botBat.length} page ĐANG BẬT BOT mà không có kịch bản `
        + 'riêng — bot nói chuyện với khách thật mà không có hướng dẫn nào về giọng điệu, câu '
        + 'chào hay cách bán.',
      diTiep: { chu: 'Sang màn Kịch bản', duong: '/kich-ban' },
      so: `${batMaKhongKichBan.length} page`,
    })
    : den({
      ma: 'kich_ban_thieu', ten: 'Kịch bản của page bật bot', muc: MUC.XANH,
      vi: 'Mọi page đang bật bot đều có kịch bản riêng.', so: `${botBat.length}/${botBat.length}`,
    }));

  /* ⑦ MARKETER */
  const thieuMkt = pages.filter((p) => !String(p.marketer || '').trim());
  ds.push(thieuMkt.length
    ? den({
      ma: 'marketer', ten: 'Marketer phụ trách', muc: thieuMkt.length === pages.length ? MUC.DO : MUC.VANG,
      vi: `${thieuMkt.length}/${pages.length} page chưa có marketer — mọi báo cáo cắt theo `
        + 'marketer sẽ trống với những page đó.',
      diTiep: { chu: 'Sang màn Page & Bot', duong: '/page-bot' },
      so: `${thieuMkt.length} page`,
    })
    : den({
      ma: 'marketer', ten: 'Marketer phụ trách', muc: MUC.XANH,
      vi: 'Mọi page đều có marketer.', so: `${pages.length}/${pages.length}` }));

  /* ⑧ SỔ AI — nguồn của MỌI con số báo cáo */
  ds.push(soAi
    ? den({ ma: 'so_ai', ten: 'Sổ AI', muc: MUC.XANH, vi: `${soAi} dòng.`, so: `${soAi} dòng` })
    : den({
      ma: 'so_ai', ten: 'Sổ AI', muc: MUC.DO,
      vi: 'Sổ AI đang TRỐNG. Đây là nguồn của MỌI con số ở màn Báo cáo, Chi phí AI và Hiệu '
        + 'quả kịch bản — trống thì cả ba màn đó không có gì để tính, và cũng không tra ngược '
        + 'được con số nào.',
      diTiep: { chu: 'Nhờ người quản trị hệ thống chạy bộ nạp Sổ AI', duong: null },
      so: '0 dòng',
    }));

  /* ⑨ VIỆC ĐANG CHỜ SALE — «page bị chặn thì đếm số khách đang chờ» */
  const dangMo = viec.filter((v) => v.dong_luc == null);
  const quaHan = dangMo.filter((v) => v.han_luc && Number(new Date(v.han_luc)) < bay);
  ds.push(quaHan.length
    ? den({
      ma: 'viec_qua_han', ten: 'Khách đang chờ', muc: MUC.DO,
      vi: `${quaHan.length}/${dangMo.length} việc đã QUÁ HẠN 10 phút mà chưa ai nhận — đó là `
        + 'khách thật đang chờ người trả lời.',
      diTiep: { chu: 'Sang bảng điều phối', duong: '/dieu-phoi' },
      so: `${quaHan.length} quá hạn`,
    })
    : den({
      ma: 'viec_qua_han', ten: 'Khách đang chờ', muc: dangMo.length ? MUC.VANG : MUC.XANH,
      vi: dangMo.length
        ? `${dangMo.length} việc đang chờ sale, chưa việc nào quá hạn.`
        : 'Không việc nào đang chờ.',
      diTiep: dangMo.length ? { chu: 'Sang bảng điều phối', duong: '/dieu-phoi' } : null,
      so: `${dangMo.length} đang chờ`,
    }));

  /* ⑪ HAI BOT CÙNG MỘT PAGE — CR-02-10: phía mình chỉ còn một bot; cảnh này chỉ còn với bot
     ai_sale của team khác, mà hệ không đọc được nó phủ page nào ⇒ đèn xám khi đã có page bật. */
  ds.push(denHaiBot(pages, nguonBotBat, botBat));

  const dem = { xanh: 0, vang: 0, do: 0, xam: 0 };
  for (const d of ds) dem[d.muc]++;
  return {
    teamId: bc.teamId,
    den: ds,
    dem,
    chuMuc: CHU_MUC,
    // Hai đèn công tắc bot đếm bằng nguồn nào — nói ra, kể cả khi không lệch.
    nguonBotBat,
    // Mức xấu nhất của cả bảng — để đầu trang nói một câu, không bắt người đọc tự quét.
    tongThe: dem.do ? MUC.DO : dem.vang ? MUC.VANG : dem.xam ? MUC.XAM : MUC.XANH,
  };
}

/**
 * «Hai bot cùng một page» — CR-02-10 · MB2: phía mình chỉ còn MỘT bot, nên cảnh ấy chỉ còn xảy ra
 * với bot `ai_sale` của pancake-tool (team khác), mà hệ này KHÔNG đọc được nó phủ page nào. Đèn
 * nói thật: chưa bật page nào thì không thể va; đã bật thì CHƯA ĐO ĐƯỢC — người bật phải xác
 * nhận với bên ai_sale. Xanh ở đây là hứa một điều không đo.
 */
function denHaiBot(_pages, _nguonBotBat, botBat) {
  if (!botBat.length) {
    return den({
      ma: 'hai_bot_mot_page', ten: 'Hai bot cùng một page', muc: MUC.XANH,
      vi: 'Chưa page nào bật bot của mình, nên không page nào có thể bị hai bot cùng trả lời.',
      so: '0 page bật',
    });
  }
  return den({
    ma: 'hai_bot_mot_page', ten: 'Hai bot cùng một page', muc: MUC.XAM,
    vi: `${botBat.length} page đang bật bot của mình. Hệ này không đọc được bot ai_sale của team khác `
      + 'đang phủ page nào — mỗi page bật phải được bên đó xác nhận đã tắt, không thì khách nhận hai câu trả lời.',
    so: `${botBat.length} page bật`,
  });
}

/**
 * Số page bật bot TOÀN HỆ so với trần (GL2 · review (a) C2).
 *
 * Cổng truy vấn của màn KẸP TEAM, nên không đếm được toàn hệ. Đếm qua bộ đọc cửa kiểm `_docSanSang`: tiến trình giao diện
 * tiêm `noiVanHanhV3(pool)` (`v3/chay-that.js:170,299` → `vai-b.js#datDocSanSangSucKhoe`), mà bộ đọc ấy dựng danh sách page
 * bật từ `src/queue/page-routing.js#dsPageBotTraLoi(pool)` — CÙNG hàm, cùng phạm vi toàn hệ worker đếm trần
 * (`van-hanh-v3.js:72`). Ca `v3/test/b/gl2-den-suc-khoe.test.mjs` D5a đo trên chuỗi thật đó, hai page ở hai team.
 * Số bật của team là CHẶN DƯỚI chắc chắn ⇒ lấy max. Bộ đọc vắng/ném ⇒ chỉ còn chặn dưới, và câu đèn NÓI RA điều đó.
 */
async function docTranToanHe(botBat, env) {
  let toanHe = null;
  let viSaoMu = null;
  if (!_docSanSang) viSaoMu = 'chưa nối bộ đọc toàn hệ, chỉ đếm được team này';
  else {
    try {
      const kq = await _docSanSang();
      toanHe = (kq?.pages || []).filter((p) => p?.aiEnabled === true).length;
    } catch (e) {
      viSaoMu = `đọc toàn hệ lỗi (${e?.message || e}), chỉ đếm được team này`;
    }
  }
  const tran = tranPageBat(env);
  // Chặn dưới đếm ĐÚNG như worker: page không có id Facebook (`page_id = ''`) worker không đếm, đèn cũng không.
  const cuaTeam = botBat.filter((p) => String(p.page_id ?? '') !== '').length;
  const soBat = Math.max(toanHe ?? 0, cuaTeam);
  return { tran, soBat, vuot: vuotTran(soBat, tran), doDuoc: toanHe != null, viSaoMu };
}

/**
 * Máy chạy bot của bot mới, đo bằng hàng đợi tin. Luật xét nằm ở `chung/nhip-may-bot.js` —
 * ở đây chỉ dịch kết quả sang hình dạng một cái đèn.
 *
 * `diTiep` không có đường dẫn: chưa màn nào khởi động lại được máy chạy bot, và bịa một
 * đường dẫn tới màn không làm được việc ấy còn tệ hơn là nói thẳng «nhờ người quản trị».
 *
 * GL2: đang VƯỢT TRẦN thì worker cố ý không rút tin ⇒ tin chờ dồn ⇒ luật nhịp sẽ nói «máy đứng» và dẫn người đi khởi động
 * lại — vô ích. Khi đó đèn nói «dừng vì vượt trần» (VÀNG — máy không hỏng; đèn ĐỎ là đèn «Page đang bật bot»).
 */
function denMayChayBot(x, tran = null) {
  if (tran?.vuot) {
    return den({
      ma: 'may_chay_bot',
      ten: 'Máy chạy bot',
      muc: MUC.VANG,
      vi: `Máy chạy bot đang dừng vì vượt trần page bật bot (${tran.soBat}/${tran.tran}) — cố ý không trả lời page nào, `
        + 'máy KHÔNG hỏng: khởi động lại không giúp gì. Tắt bớt page cho số page bật ≤ trần thì máy tự chạy lại. '
        + `Số đo hàng đợi lúc này: ${x.so || 'chưa có'}.`,
      so: `dừng — vượt trần${x.so ? ` · ${x.so}` : ''}`,
      diTiep: { chu: 'Tắt bớt page ở màn Page & Bot', duong: '/page-bot' },
    });
  }
  return den({
    ma: 'may_chay_bot',
    ten: 'Máy chạy bot',
    muc: x.muc,
    vi: x.cau,
    so: x.so,
    diTiep: x.viec ? { chu: x.viec, duong: null } : null,
  });
}

async function denKhoaModel(bc, cauHinh) {
  // Không có cách đọc khoá ở đây (cố ý — khoá là bí mật). Suy từ cấu hình: có dòng cấu hình
  // nhưng chưa ai dán khoá riêng thì màn Model AI mới biết. Nên đèn này CHỈ nói được phần
  // nó thật sự đo được, và khai rõ phần nó không đo được.
  if (!cauHinh.length) {
    return den({
      ma: 'llm_khoa', ten: 'Khoá API model', muc: MUC.XAM,
      vi: 'Chưa đo được: team chưa cấu hình model nào nên chưa biết cần khoá của nhà nào.',
      diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
    });
  }
  const nha = [...new Set(cauHinh.map((c) => c.nha_cung_cap).filter(Boolean))];
  return den({
    ma: 'llm_khoa', ten: 'Khoá API model', muc: MUC.XAM,
    vi: `Khoá được mã hoá nên màn này không đọc. Team dùng ${nha.length} nhà (${nha.join(', ')}).`,
    diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
  });
}

function denCauBot() {
  if (!_trangThaiCauBot) {
    return den({
      ma: 'tien_trinh_bot', ten: 'Lõi bot', muc: MUC.XAM,
      vi: 'Chưa đo được: chưa nối bộ đọc lõi bot.',
      diTiep: { chu: 'Báo người quản trị hệ thống — đây là lỗi dựng ứng dụng', duong: null },
    });
  }
  const t = _trangThaiCauBot();
  return t.mo
    ? den({ ma: 'tien_trinh_bot', ten: 'Lõi bot', muc: MUC.XANH,
      vi: `Cửa ghi vào lõi bot đang MỞ (${t.goc}).`, so: 'mở' })
    : den({
      ma: 'tien_trinh_bot', ten: 'Lõi bot', muc: MUC.VANG,
      vi: `Cửa ghi vào lõi bot đang ĐÓNG: ${t.thieu.join(' · ')}.`,
      diTiep: { chu: 'Nhờ người quản trị hệ thống mở rồi khởi động lại dịch vụ', duong: null },
      so: 'đóng',
    });
}

async function denToken(bay) {
  if (!_docKhoToken) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.XAM,
      vi: 'Chưa đo được: máy chủ chưa nối bộ đọc kho token.',
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
    });
  }
  let kho;
  try {
    kho = await _docKhoToken();
  } catch (e) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.XAM,
      vi: `Chưa đo được: ${e?.message || e}`,
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
    });
  }
  const ds = kho && Array.isArray(kho.token) ? kho.token : [];
  const song = ds.filter((t) => !t.daHet);
  if (!song.length) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.DO,
      vi: ds.length ? `Cả ${ds.length} token đều hết hạn — bot không gọi được Pancake.`
        : 'Không có token Pancake nào — bot không đọc và không gửi được tin nào.',
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
      so: `${song.length}/${ds.length} sống`,
    });
  }
  const NGAY = 86400000;
  const sapHet = song.filter((t) => t.het && (t.het - bay) / NGAY <= NGUONG.tokenSapHetNgay);
  if (sapHet.length || song.length === 1) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.VANG,
      vi: song.length === 1
        ? 'Chỉ còn MỘT token sống — token này chết là mất hẳn, không có gì đỡ.'
        : `${sapHet.length} token sắp hết hạn trong ${NGUONG.tokenSapHetNgay} ngày.`,
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
      so: `${song.length}/${ds.length} sống`,
    });
  }
  return den({
    ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.XANH,
    vi: `${song.length} token còn sống, không token nào sắp hết hạn.`,
    so: `${song.length}/${ds.length} sống`,
  });
}
