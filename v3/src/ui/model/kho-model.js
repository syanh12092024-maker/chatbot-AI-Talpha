// TẦNG ĐỌC CỦA MÀN «MODEL AI & KHOÁ» (G2-B3, màn cuối của sóng 0).
//
// Gỡ chặn H6: hôm nay nhập khoá bốn nhà phải sửa `.env` rồi khởi động lại.
//
// ─── HAI TIÊU CHÍ CỦA MÀN NÀY, VÀ CẢ HAI ĐỀU TRẢ GIÁ BẰNG SỰ CỐ THẬT ───────────────────
//
//   ① «Đổi model của một team → lượt chat kế tiếp đi đúng model mới, KHÔNG khởi động lại.»
//      Lớp model đã lo (`cau-hinh.js#xoaDem` xoá đệm ngay sau khi ghi, hạn đệm 5 giây), nên
//      màn này chỉ cần gọi `ghiCauHinh`. Không tự chế đường nạp lại nào khác.
//
//   ② «Phải thấy SẮP hết tiền TRƯỚC khi bot chết.»
//      06/08/2026 tài khoản nhà chính hết tiền, bot đứng im **ba tiếng** mà không ai biết.
//      23/08 lặp lại — **731 phút**. Nên màn này không được chỉ là một cái biểu mẫu chọn
//      model; nó phải trả lời được «cấu hình hiện tại có chỗ nào sắp gãy không». Phần đó
//      nằm ở `canhBaoCauHinh()` trong lớp model, và màn hiện thẳng ra đầu trang.
//
// ─── QUY GIÁ RA TIỀN THẬT ──────────────────────────────────────────────────────────────
// `01-QUYET-DINH.md` §7 chốt: **đo bằng tiền MỖI ĐƠN, không phải tiền mỗi tin.** Model thông
// minh hơn chốt bằng ít tin hơn, nên có thể đắt mỗi tin mà rẻ mỗi đơn. Màn này hiện cả hai,
// và nói rõ cột đ/đơn là **phóng chiếu** từ số tin/đơn đo được — không phải số đo mới.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';
import {
  tomTatCauHinh, ghiCauHinh, MAC_DINH, LoiCauHinh,
} from '../../model/cau-hinh.js';
import {
  danhSachModel, dTinThamChieu, tiGiaHienTai, HO_SO_TOKEN_DO_THAT, MA_MODEL,
} from '../../model/bang-model.js';
import { MA_NHA } from '../../model/nha/index.js';
import { docCauHinh, ghiNhatKyModel, HANH_DONG as HD_MODEL } from '../../model/cau-hinh.js';
import { goiMotLan } from '../../model/goi-mot-lan.js';
import { pageThuocBotMoi } from '../../../../src/queue/page-routing.js';

/** Nhãn người đọc cho bốn nhà. Sổ nhà (`model/nha/index.js`) chỉ giữ bản cài, không giữ nhãn. */
export const TEN_NHA = Object.freeze({
  claude: 'Anthropic Claude',
  kimi: 'Moonshot Kimi',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
});

export { LoiCauHinh };

/**
 * SỐ TIN TRÊN MỘT ĐƠN — đo thật, `01-QUYET-DINH.md` §7: 127,7 đ/tin ↔ 6.729 đ/đơn.
 * Khai hằng ở đây thay vì gõ 52,7 vào công thức, để chỗ nào cần sửa thì sửa một chỗ.
 */
export const TIN_MOI_DON = +(6729 / 127.7).toFixed(2);

export const TEN_VAI_TRO = Object.freeze({
  chinh: 'Model chính',
  du_phong: 'Model dự phòng',
  nen: 'Model việc nền',
});

export const GIAI_THICH_VAI_TRO = Object.freeze({
  chinh: 'Model trả lời khách. Đây là chỗ tiền chảy.',
  // LL6 · 29/09: bản cũ viết «Chạy khi nhà chính hỏng…» ở thì hiện tại — máy chưa làm điều đó (xem dưới).
  du_phong: 'Dành cho lúc nhà chính hỏng hoặc hết tiền. BẮT BUỘC khác nhà với model chính.',
  nen: 'Dành cho phân loại, tóm tắt — không nói với khách, chọn model rẻ được.',
});

/**
 * ĐƯỜNG DÙNG THẬT của từng vai — màn nói ĐIỀU MÁY LÀM, không hứa theo tên vai (LL6 · CR-28-09c §7).
 *
 * Đo mã 29/09: đường trả lời khách v3 gọi `src/chat/model.js#layModel` với `vaiTro: 'chinh'` DUY NHẤT
 * (`handler-v3.js`); `admin-v3/operations.js` gọi mặc định (chính). Không nơi nào đọc `du_phong`/`nen`;
 * lớp chuyển dự phòng `v3/src/model/du-phong.js#goiCoDuPhong` không nằm trên đường chat (nợ §9
 * N-DUPHONGCHATTHAT). Ca `ll6-cai-dat.test.mjs` K2 đo lại các câu này trên MÃ — nối dự phòng (LL14) mà
 * không sửa bảng này là đỏ.
 */
export const DUONG_DUNG_VAI_TRO = Object.freeze({
  chinh: { dung: true, chu: 'Đang dùng', noi: 'Bot v3 đọc ô này mỗi lượt trả lời. Bot cũ lấy model từ tệp cấu hình của máy chủ.' },
  du_phong: { dung: false, chu: 'Chưa nối', noi: 'Đã lưu, nhưng đường trả lời khách CHƯA tự chuyển sang khi model chính hỏng.' },
  nen: { dung: false, chu: 'Chưa việc nào dùng', noi: 'Đang lưu, nhưng chưa việc nào đọc ô này.' },
});

/* ─────────────────────────── đọc ─────────────────────────── */

/**
 * Toàn bộ dữ liệu màn cần.
 * Khoá chỉ ở dạng `{ daCo, tuEnv }` — không một ký tự khoá thật nào đi qua đây.
 */
export async function manModel(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const tt = await tomTatCauHinh(bc);
  const usdVnd = tiGiaHienTai();

  return {
    teamId: tt.teamId,
    macDinh: tt.macDinh,
    soDong: tt.soDong,
    suaLuc: tt.suaLuc,
    dangDung: {
      chinh: { ...tt.chinh, tenNha: TEN_NHA[tt.chinh.nha] || tt.chinh.nha },
      duPhong: { ...tt.duPhong, tenNha: TEN_NHA[tt.duPhong.nha] || tt.duPhong.nha },
      nen: { ...tt.nen, tenNha: TEN_NHA[tt.nen.nha] || tt.nen.nha },
    },
    doNgauNhien: tt.doNgauNhien,
    doNgauNhienNen: tt.doNgauNhienNen,
    khoa: tt.khoa,
    nha: MA_NHA.map((n) => ({ ma: n, ten: TEN_NHA[n] || n, coKhoa: !!(tt.khoa[n] && tt.khoa[n].daCo) })),
    bangGia: bangGia({ usdVnd, dangChinh: tt.chinh.ma }),
    usdVnd,
    hoSoToken: HO_SO_TOKEN_DO_THAT,
    tinMoiDon: TIN_MOI_DON,
    macDinhHeThong: MAC_DINH,
    canhBao: tt.canhBao,
    tenVaiTro: TEN_VAI_TRO,
    giaiThichVaiTro: GIAI_THICH_VAI_TRO,
    duongDung: DUONG_DUNG_VAI_TRO,
    // VE7c: hai sự thật đo được đi cùng màn — lượt thử gần nhất của từng vai + số page bot mới đang xử.
    thuGanNhat: { chinh: _thuGanNhat.get(`${tt.teamId}|chinh`) || null, duPhong: _thuGanNhat.get(`${tt.teamId}|duPhong`) || null },
    botMoi: await botMoiXuLy(bc),
    // Vai «trả lời khách» theo ĐƯỜNG CHỌN CỦA BOT (không theo lớp v3) — model · nguồn khoá · độ ngẫu nhiên THẬT; và nguồn
    // khoá bot sẽ dùng cho từng nhà (ô chọn model của thẻ đó). `null` = chưa nối đường bot ⇒ màn nói «chưa đo».
    botDung: await botDungChinh(bc),
    khoaBot: await khoaBotTheoNha(bc),
  };
}

/* ═══ VE7c · 30/09 (bản vẽ 4 › Model AI) — «Màn chỉ hiện thứ bot THẬT SỰ dùng» ═══════════════════════════════════
 * ① Vai «trả lời khách» hiện + thử bằng ĐƯỜNG CHỌN CỦA BOT (`src/chat/model.js#chonModel` — chính hàm `layModel` gọi),
 *   KHÔNG bằng lớp v3 (`docCauHinh`). Hai đường lệch nhau thật — đo 30/09 trên prod: 3/4 team chưa có dòng `cau_hinh_model`
 *   ⇒ bot của họ gọi `MODEL_CLOSER` bằng `KIMI_API_KEY` qua client cũ, KHÔNG gửi độ ngẫu nhiên; còn lớp v3 trả «bộ mặc
 *   định» và đọc khoá env tên khác (`V3_KHOA_<NHÀ>`, prod không đặt) ⇒ màn cũ báo «chưa có khoá» cho một bot đang chạy.
 * ② Vai «dự phòng» chưa nối vào đường trả lời nào (`DUONG_DUNG_VAI_TRO`); lớp sẽ dùng nó khi nối là lớp v3 ⇒ thử theo
 *   `docCauHinh` (khoá team → `V3_KHOA_<NHÀ>`).
 * ③ Số page bot mới đang xử: đếm bằng CÙNG luật worker (`src/queue/page-routing.js#pageThuocBotMoi`).
 * «Thử một lượt» gọi `goiMotLan` MỘT lần (không qua lớp dự phòng, không qua client có đếm sức khoẻ): thử khoá nào đo khoá
 * đó, và một lượt thử hỏng không làm đèn sức khoẻ của bot đỏ theo. Kết quả gần nhất giữ trong bộ nhớ tiến trình theo team
 * + vai: khởi động lại là «chưa thử», nói thẳng.
 */
let _taoTruyVanMan = null;
export function datTaoTruyVanMan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datTaoTruyVanMan cần một hàm');
  _taoTruyVanMan = fn || null;
  return _taoTruyVanMan;
}

async function botMoiXuLy(bc) {
  if (!_taoTruyVanMan) return { soPage: null, viSao: 'chưa nối cổng truy vấn — không đếm được page bot mới xử' };
  try {
    const ds = (await _taoTruyVanMan(bc).chon('page', {})) || [];
    return { soPage: ds.filter((p) => pageThuocBotMoi(p)).length, tong: ds.length, viSao: null };
  } catch (e) {
    return { soPage: null, viSao: `không đọc được bảng page (${String(e?.message || e).slice(0, 120)})` };
  }
}

/** Đường chọn model của bot — `{ chon(bc) → chonModel(...,{vaiTro:'chinh'}), khoa(bc, nha) → khoaCuaBot(...) }`, tiêm từ
 *  `chay-that.js` (cần pool). KHÔNG có thì màn nói «chưa đo» và KHÔNG thử vai chính bằng luật khác — thử sai thứ còn tệ hơn
 *  không thử. */
let _duongBot = null;
export function datDuongBot(d) {
  if (d != null && (typeof d.chon !== 'function' || typeof d.khoa !== 'function')) throw new LoiCauHinh('datDuongBot cần { chon, khoa } là hàm');
  _duongBot = d || null;
  return _duongBot;
}
const nhaChuan = (n) => (n === 'anthropic' ? 'claude' : n);

async function botDungChinh(bc) {
  if (!_duongBot) return null;
  try {
    const c = await _duongBot.chon(bc);
    const nha = nhaChuan(c.nhaCungCap);
    return { nguon: c.nguon, maModel: c.maModel, nha, tenNha: TEN_NHA[nha] || nha, nguonKhoa: c.nguonKhoa || null,
      bienMayChu: c.bienMayChu || null, doNgauNhien: c.doNgauNhien ?? null, loi: null, lyDo: null, chuaDo: null };
  } catch (e) {
    // Lỗi CHỌN của bot (model lạ / lệch nhà / thiếu khoá) là sự thật về bot: nó sẽ KHÔNG gọi được. Lỗi khác (CSDL…) là
    // màn không đo được — nói «chưa đo», đừng đổ cho bot.
    if (e?.name === 'LoiChuaCoLopModel') return { loi: String(e.message), lyDo: e.lyDo || null, chuaDo: null };
    return { loi: null, lyDo: null, chuaDo: String(e?.message || e).slice(0, 160) };
  }
}

async function khoaBotTheoNha(bc) {
  if (!_duongBot) return null;
  const ra = {};
  for (const nha of MA_NHA) {
    try {
      const k = await _duongBot.khoa(bc, nha);
      ra[nha] = { nguonKhoa: k.nguonKhoa || null, bienMayChu: k.bienMayChu || null };   // KHÔNG trả khoá
    } catch (e) {
      ra[nha] = { nguonKhoa: null, bienMayChu: null, chuaDo: String(e?.message || e).slice(0, 120) };
    }
  }
  return ra;
}

export const THU = Object.freeze({ maxTokens: 16, timeoutMs: 20000, msGiua: 10000 });
const VAI_THU = Object.freeze({ chinh: 'chinh', duPhong: 'duPhong' });
const TEN_VAI_THU = Object.freeze({ chinh: 'trả lời khách', duPhong: 'dự phòng' });
const _thuGanNhat = new Map();   // `${teamId}|${vai}` → kết quả lượt thử gần nhất
const _lanThuCuoi = new Map();   // teamId → mốc ms — chặn bấm dồn (mỗi lượt là một lời gọi tốn tiền)
let _goiThu = (o) => goiMotLan(o);
/** Tiêm lời gọi thử (ca kiểm KHÔNG gọi nhà model thật). `null` ⇒ trở về `goiMotLan`. */
export function datGoiThu(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datGoiThu cần một hàm');
  _goiThu = fn || ((o) => goiMotLan(o));
  return _goiThu;
}
export function xoaThu() { _thuGanNhat.clear(); _lanThuCuoi.clear(); }

/** Câu người đọc được cho một lượt thử hỏng. `status` của `LoiNhaCungCap` là mã HTTP NHÀ MODEL trả về. */
function chuLoiThu(e, nha, ma) {
  if (e?.ma === 'thieu_khoa') return `Chưa có khoá của ${TEN_NHA[nha] || nha}`;
  if (e?.ma === 'het_gio') return `Quá ${THU.timeoutMs / 1000} giây không trả lời`;
  if (e?.name === 'LoiModelLa') return `Model "${ma}" không có trong bảng model v3 — màn này chưa thử được model đó`;
  const st = e?.ma === 'loi_nha_cung_cap' ? Number(e.status) || 0 : 0;
  if (st === 401 || st === 403) return `Khoá bị từ chối (${st})`;
  if (st === 402) return 'Tài khoản hết tiền (402)';
  if (st === 429) return 'Nhà model đang giới hạn lượt gọi (429) — thử lại sau';
  return `Lỗi nhà model${st ? ` (${st})` : ''}: ${String(e?.message || e).slice(0, 160)}`;
}
const chuNguonKhoa = (nguon, bien) => (nguon === 'team' ? 'khoá riêng của team'
  : nguon === 'may_chu' ? `khoá chung của máy chủ${bien ? ` · ${bien}` : ''}` : null);

/** Model + khoá SẼ được thử cho một vai — cùng đường với thứ dùng nó (xem đầu khối). */
async function dichThu(bc, v) {
  const c = await docCauHinh(bc, { boQuaDem: true });
  if (v === 'duPhong') {
    const m = c.duPhong;
    const khoa = (c.khoa || {})[m.nha];
    return { ma: m.ma, nha: m.nha, khoa, nguonKhoa: c.khoaRieng?.[m.nha] ? 'team' : (khoa ? 'may_chu' : null),
      bien: `V3_KHOA_${m.nha.toUpperCase()}`, doNgauNhien: c.doNgauNhien, duong: 'lop_v3' };
  }
  if (!_duongBot) return { hong: { ma: 'chua_noi_duong_bot', chu: 'Chưa nối đường chọn model của bot — không thử được (thử bằng luật khác là thử sai thứ)' }, ma: c.chinh.ma, nha: c.chinh.nha };
  try {
    const b = await _duongBot.chon(bc);
    const nha = nhaChuan(b.nhaCungCap);
    return { ma: b.maModel, nha, khoa: b.khoa, nguonKhoa: b.nguonKhoa || null, bien: b.bienMayChu || null,
      doNgauNhien: b.doNgauNhien, duong: b.nguon };
  } catch (e) {
    if (e?.name !== 'LoiChuaCoLopModel') throw e;
    const chu = e.lyDo === 'thieu_khoa' ? `Chưa có khoá của ${TEN_NHA[c.chinh.nha] || c.chinh.nha} — bot KHÔNG gọi được model này`
      : `Bot KHÔNG gọi được: ${e.message}`;
    return { hong: { ma: e.lyDo || 'bot_khong_chon_duoc', chu }, ma: c.chinh.ma, nha: c.chinh.nha };
  }
}

/**
 * THỬ MỘT LƯỢT model + khoá của vai `chinh` | `duPhong`. Quản trị. KHÔNG ném lỗi của nhà model — trả `{ ok:false, chu }`
 * với HTTP 200: một 401 của nhà model mà thành 401 của màn là đá người dùng ra trang đăng nhập.
 */
export async function thuModel(boiCanh, { vai } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, VAI.QUAN_TRI);
  const v = VAI_THU[vai];
  if (!v) throw new LoiCauHinh('chỉ thử được vai «chinh» (trả lời khách) hoặc «duPhong» (dự phòng).');
  const truoc = _lanThuCuoi.get(bc.teamId) || 0;
  const cho = THU.msGiua - (Date.now() - truoc);
  if (cho > 0) throw Object.assign(new Error(`vừa thử xong — chờ ${Math.ceil(cho / 1000)} giây rồi thử lại.`), { ma: 'thu_qua_nhanh', status: 429 });
  _lanThuCuoi.set(bc.teamId, Date.now());

  const d = await dichThu(bc, v);
  const chuNguon = chuNguonKhoa(d.nguonKhoa, d.bien);
  let kq;
  if (d.hong) {
    kq = { ok: false, vai: v, maModel: d.ma, nha: d.nha, nguonKhoa: null, duong: null, luc: Date.now(), ma: d.hong.ma, status: null, chu: d.hong.chu };
  } else {
    try {
      const r = await _goiThu({
        ma: d.ma, khoa: d.khoa,
        // Bot đi đường máy chủ không gửi độ ngẫu nhiên ⇒ không đặt (goiMotLan tự dùng mặc định) — lượt thử đo KHOÁ + MODEL.
        yeuCau: { max_tokens: THU.maxTokens, messages: [{ role: 'user', content: 'Trả lời đúng một chữ: OK' }],
          ...(d.doNgauNhien != null ? { temperature: d.doNgauNhien } : {}) },
        timeoutMs: THU.timeoutMs,
      });
      const giay = (Number(r?.msChay || 0) / 1000).toFixed(1).replace('.', ',');
      kq = { ok: true, vai: v, maModel: r?.maModel || d.ma, nha: r?.nhaCungCap || d.nha, nguonKhoa: d.nguonKhoa, duong: d.duong,
        msChay: r?.msChay ?? null, tienVnd: r?.tienVnd ?? null, luc: Date.now(), chu: `Khoá dùng được (${chuNguon}) · trả lời sau ${giay} giây` };
    } catch (e) {
      const chu = chuLoiThu(e, d.nha, d.ma);
      kq = { ok: false, vai: v, maModel: d.ma, nha: d.nha, nguonKhoa: d.nguonKhoa, duong: d.duong, luc: Date.now(), ma: e?.ma || e?.name || 'loi_model',
        status: e?.ma === 'loi_nha_cung_cap' ? Number(e.status) || null : null, chu: chuNguon ? `${chu} — ${chuNguon}` : chu };
    }
  }
  _thuGanNhat.set(`${bc.teamId}|${v}`, kq);
  await ghiNhatKyModel(bc, {
    hanhDong: HD_MODEL.THU_MODEL, doiTuongLoai: 'cau_hinh_model', doiTuongId: v,
    // `nguon` chứ không `nguonKhoa`: nhật ký che mọi trường tên có «khoa» (`audit/index.js#KHOA_NHAY_CAM`).
    sau: { maModel: kq.maModel, nha: kq.nha, ok: kq.ok, status: kq.status ?? null, nguon: kq.nguonKhoa, duong: kq.duong },
    ghiChu: `thử model ${kq.maModel} (${TEN_VAI_THU[v]}): ${kq.chu}`,
  });
  return kq;
}

/**
 * Bảng bảy model quy ra tiền Việt, sắp theo đ/đơn TĂNG DẦN (rẻ nhất lên đầu).
 *
 * `soVoiDangDung` là bội số so với model chính ĐANG chạy — con số duy nhất trả lời được câu
 * người ta thật sự hỏi: «đổi sang cái này thì hoá đơn nhân mấy lần?».
 */
export function bangGia({ usdVnd, dangChinh } = {}) {
  const ti = usdVnd || tiGiaHienTai();
  const dTinCua = (ma) => dTinThamChieu(ma, { usdVnd: ti });
  const goc = dangChinh && MA_MODEL.includes(dangChinh) ? dTinCua(dangChinh) : null;

  return danhSachModel()
    .map((m) => {
      const dTin = dTinCua(m.ma);
      return {
        ma: m.ma,
        nha: m.nha,
        tenNha: TEN_NHA[m.nha] || m.nha,
        dTin: +dTin.toFixed(1),
        // ⚠️ PHÓNG CHIẾU, không phải số đo mới: đ/tin × số tin trên một đơn đo được.
        dDon: Math.round(dTin * TIN_MOI_DON),
        soVoiDangDung: goc ? +(dTin / goc).toFixed(2) : null,
        nguonGia: m.nguonGia,
        // «suy-nguoc» = CHƯA AI MỞ TÀI KHOẢN nhà đó, đơn giá giải ngược từ bảng đ/tin của
        // tài liệu. Không hiện cờ này thì người ta chọn model dựa trên một con số bịa mà
        // tưởng là giá công bố.
        giaChacChan: m.nguonGia === 'cong-bo',
        laDangDung: m.ma === dangChinh,
      };
    })
    .sort((a, b) => a.dDon - b.dDon);
}

/* ─────────────────────────── ghi ─────────────────────────── */

/**
 * Lưu cấu hình. Mỏng có chủ ý — mọi luật (dự phòng khác nhà, độ ngẫu nhien trong [0,1], mã
 * model có thật, ghi nhật ký, xoá đệm để nạp nóng) đã nằm trong `ghiCauHinh` của lớp model
 * và có bài test riêng. Thêm một lớp kiểm nữa ở đây là đẻ bản thứ hai của cùng một luật.
 */
export async function luuCauHinh(boiCanh, thayDoi = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  await ghiCauHinh(bc, thayDoi);
  return manModel(bc);
}
