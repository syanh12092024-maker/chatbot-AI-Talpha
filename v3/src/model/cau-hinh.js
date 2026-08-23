// CẤU HÌNH MODEL THEO TEAM + NẠP NÓNG — L1-M4b
//
// Mỗi team đúng MỘT dòng `cau_hinh_model`: ba ô model (chính · dự phòng · nền), hai độ
// ngẫu nhiên, và bộ khoá bốn nhà đã mã hoá.
//
// NẠP NÓNG — tiêu chí nghiệm thu là *đổi model xong thì lượt chat KẾ TIẾP đã đi model mới,
// không khởi động lại*. Cách làm (hợp đồng B–A mục 7):
//   · bộ đệm theo team, hạn 5 giây
//   · `ghiCauHinh` XOÁ ĐỆM của đúng team đó ngay sau khi ghi
//   → cùng một tiến trình: đổi xong là lượt kế tiếp đúng ngay (0 giây)
//   → nhiều tiến trình: chậm nhất 5 giây, vẫn không phải khởi động lại
// Không dùng đệm thì mỗi lượt chat tốn một vòng đọc cơ sở dữ liệu; đệm vô hạn thì phải
// khởi động lại mới đổi được model — 5 giây là chỗ đứng giữa.
//
// KHÔNG `import '../audit/…'`. Nhật ký ghi qua phễu tiêm từ ngoài (spec "File CẤM đụng").
// Ba chỗ tiêm của cả lớp model gom hết vào file này cho dễ tìm — spec chỉ cho phép năm
// file, nên không tách ra file "cổng ra ngoài" riêng.

import {
  batBuocBoiCanh, doiChieuTeam, LoiXuyenTeam, LoiThieuBoiCanh,
} from '../auth/boi-canh.js';
import { layModel, MA_MODEL } from './bang-model.js';
import { MA_NHA } from './nha/index.js';
import { LoiModel, LoiThamSo } from './loi.js';
import { machHoaKho, giaiMaKho, tomTatKho, duoiKhoa } from './kho-khoa.js';

export { LoiThieuBoiCanh, LoiXuyenTeam };

/** Tên bảng. Một chỗ duy nhất. */
export const BANG = 'cau_hinh_model';

/** Hạn bộ đệm cấu hình. Xem ghi chú "NẠP NÓNG" đầu file trước khi đổi số này. */
export const HAN_DEM_MS = 5000;

/**
 * Mã hành động nhật ký của lớp model — CHÉP chuỗi, không import `audit/hanh-dong.js`.
 * Chuỗi phải khớp đúng danh mục bên đó (`doi_model` `doi_khoa` `chuyen_du_phong`
 * `lop_model_hong` `chan_xuyen_team`), nếu không thì màn "Nhật ký thao tác" lọc ra trống.
 */
export const HANH_DONG = Object.freeze({
  DOI_MODEL: 'doi_model',
  DOI_KHOA: 'doi_khoa',
  CHUYEN_DU_PHONG: 'chuyen_du_phong',
  LOP_MODEL_HONG: 'lop_model_hong',
  CHAN_XUYEN_TEAM: 'chan_xuyen_team',
});

/** Mức nặng nhẹ của cảnh báo. */
export const MUC = Object.freeze({ TIN: 'tin', CANH_BAO: 'canh_bao', NANG: 'nang' });

/**
 * MẶC ĐỊNH khi team chưa có dòng cấu hình (spec L1-M4b mục 2).
 * `kimi-k2.6` vì đó là model đang chạy thật ở production.
 * `claude-haiku-4.5` làm dự phòng vì KHÁC NHÀ — hết tiền bên Moonshot không kéo theo bên
 * Anthropic. Dự phòng cùng nhà với chính là dự phòng giả.
 */
export const MAC_DINH = Object.freeze({
  chinh: 'kimi-k2.6',
  duPhong: 'claude-haiku-4.5',
  nen: 'deepseek-v4-flash',
  doNgauNhien: 0.3,
  doNgauNhienNen: 0.1,
});

/** Chưa nối cổng truy vấn, hoặc cấu hình ghi vào không hợp lệ. */
export class LoiCauHinh extends LoiModel {
  constructor(chiTiet) {
    super(`Cấu hình model: ${chiTiet}`);
    this.name = 'LoiCauHinh';
    this.ma = 'cau_hinh_model';
    this.status = 400;
  }
}

// ---- BA CHỖ TIÊM TỪ NGOÀI ----------------------------------------------------------

/** @type {null | ((boiCanh: any) => any)} */
let _taoTruyVan = null;
/** @type {null | ((boiCanh: any, ban: object) => any)} */
let _pheuNhatKy = null;
/** @type {null | ((canhBao: object) => any)} */
let _pheuCanhBao = null;
/** @type {() => number} */
let _dongHo = () => Date.now();

/** Nối cổng truy vấn của người A (hợp đồng mục 3 và mục 8). `fn(boiCanh)` → cổng đã gắn team. */
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

/** Nối `ghiNhatKy` của L0-M4. `fn(boiCanh, ban)` — đúng hình dạng `audit/index.js`. */
export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

/**
 * Nối chỗ báo động (Telegram, màn "Sức khoẻ hệ thống"…).
 * `fn({ muc, thongDiep, teamId, nha, maModel })`
 */
export function datPheuCanhBao(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datPheuCanhBao cần một hàm');
  _pheuCanhBao = fn || null;
  return _pheuCanhBao;
}

/** Đồng hồ của bộ đệm — tiêm để test kiểm được hạn 5 giây mà không phải chờ thật. */
export function datDongHoCauHinh(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datDongHoCauHinh cần một hàm');
  _dongHo = fn || (() => Date.now());
  return _dongHo;
}

/**
 * Ghi nhật ký qua phễu. Chưa tiêm → kêu ở console chứ không ném: mất một dòng nhật ký
 * không được làm chết lượt chat của khách. Phễu ném → nuốt, cũng vì lý do đó.
 */
export async function ghiNhatKyModel(boiCanh, ban) {
  if (!_pheuNhatKy) {
    console.warn(`[model] chưa nối nhật ký — bỏ dòng "${ban && ban.hanhDong}". Gọi datPheuNhatKy() lúc dựng ứng dụng.`);
    return null;
  }
  try {
    return await _pheuNhatKy(boiCanh, ban);
  } catch (e) {
    console.error('[model] ghi nhật ký hỏng:', e && e.message);
    return null;
  }
}

/** Báo động qua phễu. Chưa tiêm → in ra console, vì im lặng là đúng cái sự cố 06/08. */
export async function canhBao(ban) {
  const { muc = MUC.CANH_BAO, thongDiep = '' } = ban || {};
  if (!_pheuCanhBao) {
    const in_ = muc === MUC.TIN ? console.warn : console.error;
    in_(`[model] CẢNH BÁO (${muc}) — chưa nối phễu cảnh báo: ${thongDiep}`);
    return null;
  }
  try {
    return await _pheuCanhBao({ muc, ...ban });
  } catch (e) {
    console.error('[model] phễu cảnh báo hỏng:', e && e.message);
    return null;
  }
}

// ---- BỘ ĐỆM ------------------------------------------------------------------------

/** @type {Map<string, {luc:number, cauHinh:object}>} */
const _dem = new Map();

/**
 * Xoá đệm của một team (bỏ trống = xoá hết).
 * Xuất ra ngoài vì hai chỗ cần: test, và tiến trình khác muốn ép nạp lại ngay thay vì chờ
 * hết 5 giây.
 */
export function xoaDem(teamId) {
  if (teamId == null) { _dem.clear(); return; }
  _dem.delete(String(teamId));
}

/** Số team đang nằm trong đệm — cho màn "Sức khoẻ hệ thống" và cho test. */
export function coTrongDem(teamId) {
  const o = _dem.get(String(teamId));
  return !!o && _dongHo() - o.luc < HAN_DEM_MS;
}

// ---- ĐỌC ---------------------------------------------------------------------------

const tenBienKhoaNha = (nha) => `V3_KHOA_${String(nha).toUpperCase()}`;

/**
 * Khoá lấy từ biến môi trường khi team chưa dán khoá riêng: `V3_KHOA_KIMI`,
 * `V3_KHOA_CLAUDE`, `V3_KHOA_OPENAI`, `V3_KHOA_DEEPSEEK`.
 *
 * Vì sao có: giai đoạn 1 cả nhà dùng chung một tài khoản Moonshot, chưa ai dán khoá vào
 * màn hình. Không có đường này thì cấu hình mặc định không gọi được lời nào.
 * Khoá riêng của team LUÔN thắng khoá env.
 */
function khoaTuEnv() {
  const ra = {};
  for (const nha of MA_NHA) {
    const v = process.env[tenBienKhoaNha(nha)];
    if (v != null && String(v).trim() !== '') ra[nha] = String(v).trim();
  }
  return ra;
}

function oModel(ma) {
  const dong = layModel(ma);            // mã lạ → LoiModelLa
  return Object.freeze({ ma: dong.ma, nha: dong.nha });
}

/** Dựng cấu hình mặc định — dùng khi team chưa có dòng nào trong bảng. */
export function cauHinhMacDinh(teamId) {
  return {
    teamId: String(teamId),
    macDinh: true,
    chinh: oModel(MAC_DINH.chinh),
    duPhong: oModel(MAC_DINH.duPhong),
    nen: oModel(MAC_DINH.nen),
    doNgauNhien: MAC_DINH.doNgauNhien,
    doNgauNhienNen: MAC_DINH.doNgauNhienNen,
    khoa: khoaTuEnv(),
    khoaGoc: {},
    suaLuc: null,
  };
}

/** Bản ghi trong bảng → cấu hình đã giải mã khoá. */
function tuBanGhi(teamId, r) {
  const khoaGoc = r.khoa_ma_hoa && typeof r.khoa_ma_hoa === 'object' ? r.khoa_ma_hoa : {};
  const so = (x, mac) => (Number.isFinite(Number(x)) ? Number(x) : mac);
  return {
    teamId: String(teamId),
    macDinh: false,
    id: r.id ?? null,
    chinh: oModel(r.chinh_ma_model || MAC_DINH.chinh),
    duPhong: oModel(r.du_phong_ma_model || MAC_DINH.duPhong),
    nen: oModel(r.nen_ma_model || MAC_DINH.nen),
    doNgauNhien: so(r.do_ngau_nhien, MAC_DINH.doNgauNhien),
    doNgauNhienNen: so(r.do_ngau_nhien_nen, MAC_DINH.doNgauNhienNen),
    // Khoá của team đè lên khoá env, không phải ngược lại.
    khoa: { ...khoaTuEnv(), ...giaiMaKho(khoaGoc) },
    khoaGoc,
    suaLuc: r.sua_luc ?? null,
  };
}

function congTruyVan(bc) {
  if (!_taoTruyVan) return null;
  return _taoTruyVan(bc);
}

const _daKeuChuaNoi = new Set();

/**
 * Đối chiếu team mà nơi gọi TỰ TRUYỀN TAY với team trên vé. Lệch → ghi nhật ký rồi ném.
 * Đây là lớp chặn thứ hai (hợp đồng mục 3 điều 2); lớp thứ nhất là cổng truy vấn của A.
 * Một lớp thì chỉ cần một chỗ quên là thủng.
 */
async function chanXuyenTeam(bc, teamXin) {
  if (teamXin == null || teamXin === '') return;
  try {
    doiChieuTeam(bc, teamXin);
  } catch (e) {
    if (e instanceof LoiXuyenTeam) {
      await ghiNhatKyModel(bc, {
        hanhDong: HANH_DONG.CHAN_XUYEN_TEAM,
        doiTuongLoai: BANG,
        sau: { team_xin: String(teamXin), team_cua: bc.teamId },
        ghiChu: e.message,
      });
    }
    throw e;
  }
}

/**
 * Đọc cấu hình model của team đang đăng nhập. Khoá ĐÃ GIẢI MÃ — đây là cấu hình để GỌI,
 * không phải cấu hình để hiện lên màn hình (màn hình dùng `tomTatCauHinh`).
 *
 * @param {object} boiCanh BẮT BUỘC — thiếu là ném `LoiThieuBoiCanh`, không trả rỗng
 * @param {{team_id?:string, boQuaDem?:boolean}} [bo]
 */
export async function docCauHinh(boiCanh, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  await chanXuyenTeam(bc, bo.team_id ?? bo.teamId);

  const khoaDem = bc.teamId;
  if (!bo.boQuaDem) {
    const o = _dem.get(khoaDem);
    if (o && _dongHo() - o.luc < HAN_DEM_MS) return o.cauHinh;
  }

  const db = congTruyVan(bc);
  let cauHinh;
  if (!db) {
    // Hợp đồng mục 8: chưa nối thì vẫn chạy được, nhưng phải KÊU LÊN, không im lặng chạy sai.
    if (!_daKeuChuaNoi.has(bc.teamId)) {
      _daKeuChuaNoi.add(bc.teamId);
      console.warn(
        `[model] chưa nối cổng truy vấn — team ${bc.teamId} chạy bằng cấu hình MẶC ĐỊNH `
        + `(${MAC_DINH.chinh} → ${MAC_DINH.duPhong}). Gọi datTaoTruyVan() lúc dựng ứng dụng.`,
      );
    }
    cauHinh = cauHinhMacDinh(bc.teamId);
  } else {
    const dieuKien = {};
    // Đẩy tiếp xuống cổng để cổng của người A đối chiếu lần thứ hai.
    const teamXin = bo.team_id ?? bo.teamId;
    if (teamXin != null && teamXin !== '') dieuKien.team_id = teamXin;
    // Đọc hỏng thì PHẢI ném. Lặng lẽ lùi về mặc định là đổi model của cả team mà không ai
    // biết — đúng kiểu hỏng mà cả spec này sinh ra để bịt.
    const r = await db.mot(BANG, dieuKien);
    cauHinh = r ? tuBanGhi(bc.teamId, r) : cauHinhMacDinh(bc.teamId);
  }

  _dem.set(khoaDem, { luc: _dongHo(), cauHinh });
  return cauHinh;
}

/**
 * Cấu hình CHO MÀN HÌNH: khoá chỉ còn `{ daCo, duoi }`, không có một ký tự khoá thật nào.
 */
export async function tomTatCauHinh(boiCanh, bo = {}) {
  const c = await docCauHinh(boiCanh, bo);
  const khoa = tomTatKho(c.khoaGoc);
  // Khoá đến từ biến môi trường cũng phải hiện, nếu không màn hình báo "chưa có khoá"
  // trong khi bot vẫn đang gọi được — hai thứ ngược nhau là chỗ mất cả buổi để hiểu.
  const env = khoaTuEnv();
  for (const nha of MA_NHA) {
    if (!khoa[nha].daCo && env[nha]) {
      khoa[nha] = { daCo: true, duoi: duoiKhoa(env[nha]) || null, tuEnv: true };
    }
  }
  return {
    teamId: c.teamId,
    macDinh: c.macDinh,
    chinh: c.chinh,
    duPhong: c.duPhong,
    nen: c.nen,
    doNgauNhien: c.doNgauNhien,
    doNgauNhienNen: c.doNgauNhienNen,
    khoa,
    suaLuc: c.suaLuc,
    danhSachModel: MA_MODEL,
  };
}

// ---- GHI ---------------------------------------------------------------------------

function batBuocDoNgauNhien(ten, gia) {
  const n = Number(gia);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new LoiThamSo(`${ten} phải nằm trong [0,1] — nhận "${gia}".`);
  }
  return n;
}

const layMa = (x) => (x && typeof x === 'object' ? x.ma : x);

/**
 * TÊN TRƯỜNG `thayDoi` NHẬN ĐƯỢC → tên nội bộ.
 *
 * Nhận CẢ HAI lối gọi tên: kiểu nội bộ (`duPhong`) và kiểu CỘT trong hợp đồng mục 4
 * (`du_phong_ma_model`). Màn hình và người A đọc tên cột từ hợp đồng rồi gửi thẳng bản ghi
 * xuống — chỉ nhận một lối là mọi lời gọi kiểu kia rơi vào im lặng.
 */
const TEN_TRUONG = new Map([
  ['chinh', 'chinh'], ['chinh_ma_model', 'chinh'],
  ['duPhong', 'duPhong'], ['du_phong', 'duPhong'], ['du_phong_ma_model', 'duPhong'],
  ['nen', 'nen'], ['nen_ma_model', 'nen'],
  ['doNgauNhien', 'doNgauNhien'], ['do_ngau_nhien', 'doNgauNhien'],
  ['doNgauNhienNen', 'doNgauNhienNen'], ['do_ngau_nhien_nen', 'doNgauNhienNen'],
  ['khoa', 'khoa'],
]);

/** Năm trường quyết định "cấu hình chạy model" — đụng vào cái nào cũng là `doi_model`. */
const TRUONG_MODEL = Object.freeze(['chinh', 'duPhong', 'nen', 'doNgauNhien', 'doNgauNhienNen']);

/** Cột `nha` do BẢNG MODEL quyết định. Nơi gọi gửi kèm thì đối chiếu, lệch là chặn. */
const TEN_NHA = new Map([
  ['chinh_nha', 'chinh'], ['du_phong_nha', 'duPhong'], ['nen_nha', 'nen'],
]);

/** Máy chủ tự đặt. Nhận để màn hình gửi nguyên bản ghi về được, nhưng không lấy giá trị. */
const TEN_MAY_CHU_DAT = new Set(['id', 'team_id', 'teamId', 'sua_luc', 'macDinh', 'khoaGoc']);

/**
 * Bóc `thayDoi` ra tên nội bộ.
 *
 * TRƯỜNG LẠ THÌ NÉM, KHÔNG BỎ QUA LẶNG LẼ. Đây là bài học trả giá thật: gõ
 * `chinh_ma_model` trong khi hàm chỉ nhận `chinh` thì lời gọi vẫn "thành công", bản ghi
 * không đổi một chữ, và nhật ký không có dòng nào — màn hình báo đã lưu, tới tháng sau
 * nhìn hoá đơn mới biết là chưa lưu.
 */
function docThayDoi(thayDoi) {
  const xin = {};
  const nhaXin = {};
  for (const [k, v] of Object.entries(thayDoi || {})) {
    if (TEN_MAY_CHU_DAT.has(k)) continue;
    if (TEN_NHA.has(k)) { if (v != null) nhaXin[TEN_NHA.get(k)] = String(v); continue; }
    const ten = TEN_TRUONG.get(k);
    if (!ten) {
      throw new LoiCauHinh(
        `trường lạ "${k}" — không ghi gì cả để khỏi báo thành công một việc chưa làm. `
        + `Nhận: ${[...TEN_TRUONG.keys()].join(', ')}.`,
      );
    }
    if (v !== undefined) xin[ten] = v;
  }
  return { xin, nhaXin };
}

/**
 * Ghi cấu hình model của team.
 *
 * @param {object} boiCanh BẮT BUỘC
 * @param {{chinh?:string|{ma:string}, duPhong?:string|{ma:string}, nen?:string|{ma:string},
 *          doNgauNhien?:number, doNgauNhienNen?:number,
 *          khoa?:Record<string,string|null>, team_id?:string}} thayDoi
 *   Nhận CẢ tên cột của hợp đồng mục 4: `chinh_ma_model` `du_phong_ma_model`
 *   `nen_ma_model` `do_ngau_nhien` `do_ngau_nhien_nen`. Trường lạ → NÉM, không bỏ qua.
 * @returns {Promise<object>} cấu hình mới (đã giải mã khoá), đệm đã xoá
 *
 * @throws {LoiThieuBoiCanh} thiếu bối cảnh
 * @throws {LoiXuyenTeam}    truyền tay `team_id` của team khác
 * @throws {LoiModelLa}      mã model không có trong `bang-model.js`
 * @throws {LoiCauHinh}      dự phòng CÙNG NHÀ với model chính, trường lạ, cột `nha` gửi
 *                             kèm mà lệch, hoặc chưa nối cổng truy vấn
 */
export async function ghiCauHinh(boiCanh, thayDoi = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  await chanXuyenTeam(bc, thayDoi.team_id ?? thayDoi.teamId);

  const db = congTruyVan(bc);
  if (!db) throw new LoiCauHinh('chưa nối cổng truy vấn — gọi datTaoTruyVan() lúc dựng ứng dụng (hợp đồng mục 8)');

  // Đọc thẳng từ bảng, KHÔNG qua đệm: ghi đè lên một bản đệm cũ 4 giây là ghi đè mất thay
  // đổi mà tiến trình khác vừa lưu.
  const truoc = await docCauHinh(bc, { boQuaDem: true });

  const { xin, nhaXin } = docThayDoi(thayDoi);
  // Nơi gọi CÓ NÊU ô model nào không — khác hẳn "giá trị có đổi không". Tạo mới dòng cấu
  // hình mà đặt đúng bằng mặc định vẫn là một lần đặt cấu hình, vẫn phải để lại dấu vết.
  const coNeuModel = TRUONG_MODEL.some((k) => k in xin);

  const chinh = xin.chinh != null ? oModel(layMa(xin.chinh)) : truoc.chinh;
  const duPhong = xin.duPhong != null ? oModel(layMa(xin.duPhong)) : truoc.duPhong;
  const nen = xin.nen != null ? oModel(layMa(xin.nen)) : truoc.nen;

  // Cột `nha` suy từ bảng model. Gửi kèm mà lệch thì chặn, đừng lặng lẽ ghi đè:
  // gửi `chinh_ma_model:'kimi-k2.6'` kèm `chinh_nha:'claude'` là nơi gọi đang hiểu sai.
  for (const [ten, o] of [['chinh', chinh], ['duPhong', duPhong], ['nen', nen]]) {
    if (nhaXin[ten] != null && nhaXin[ten] !== o.nha) {
      throw new LoiCauHinh(
        `model "${o.ma}" là của nhà "${o.nha}", không phải "${nhaXin[ten]}". `
        + 'Cột `nha` suy từ bảng model, nơi gọi không đặt được.',
      );
    }
  }

  // QUY TẮC NGHIỆP VỤ, không phải sở thích: dự phòng cùng nhà với chính là dự phòng GIẢ.
  // Ngày 06/08/2026 tài khoản nhà chính hết tiền — đổi sang một model khác CÙNG NHÀ thì
  // vẫn hết tiền, bot vẫn đứng im, chỉ khác là hoá đơn có thêm một dòng.
  if (chinh.nha === duPhong.nha) {
    throw new LoiCauHinh(
      `dự phòng "${duPhong.ma}" cùng nhà "${duPhong.nha}" với model chính "${chinh.ma}". `
      + 'Hết tiền hoặc khoá hỏng là hỏng cả hai — chọn model của nhà khác.',
    );
  }

  const doNgauNhien = xin.doNgauNhien != null
    ? batBuocDoNgauNhien('do_ngau_nhien', xin.doNgauNhien) : truoc.doNgauNhien;
  const doNgauNhienNen = xin.doNgauNhienNen != null
    ? batBuocDoNgauNhien('do_ngau_nhien_nen', xin.doNgauNhienNen) : truoc.doNgauNhienNen;

  // Khoá: chỉ đụng nhà nào có trong `thayDoi.khoa`. Không truyền = giữ nguyên.
  let khoaGoc = truoc.khoaGoc;
  let doiKhoa = [];
  if (xin.khoa && typeof xin.khoa === 'object') {
    const moi = machHoaKho(xin.khoa);              // mã hoá TRƯỚC khi chạm cơ sở dữ liệu
    khoaGoc = { ...truoc.khoaGoc };
    for (const [nha, goi] of Object.entries(moi)) {
      if (goi == null) delete khoaGoc[nha]; else khoaGoc[nha] = goi;
      doiKhoa.push(nha);
    }
  }

  const suaLuc = new Date(_dongHo()).toISOString();
  const banGhi = {
    // KHÔNG đặt team_id — cổng truy vấn tự chèn (hợp đồng mục 3 điều 1).
    chinh_ma_model: chinh.ma, chinh_nha: chinh.nha,
    du_phong_ma_model: duPhong.ma, du_phong_nha: duPhong.nha,
    nen_ma_model: nen.ma, nen_nha: nen.nha,
    do_ngau_nhien: doNgauNhien,
    do_ngau_nhien_nen: doNgauNhienNen,
    khoa_ma_hoa: khoaGoc,
    sua_luc: suaLuc,
  };

  const dangCo = await db.mot(BANG, {});
  if (dangCo) await db.sua(BANG, {}, banGhi);
  else await db.them(BANG, banGhi);

  // NẠP NÓNG — xoá đệm NGAY sau khi ghi. Đây là cả bí quyết của tiêu chí "không khởi
  // động lại": lượt chat kế tiếp không thấy đệm nên đọc lại bảng và thấy model mới.
  xoaDem(bc.teamId);

  // GHI `doi_model` KHI NÀO — đổi model là ĐỔI TIỀN: từ `kimi-k2.6` sang `claude-opus-5`
  // là 4,81 lần chi phí mỗi đơn (01-QUYET-DINH.md mục 7). Không có dấu vết thì tháng sau
  // hoá đơn nhảy vọt mà không ai trả lời được ai đổi, lúc nào, từ gì sang gì.
  //   · đổi bất kỳ ô nào trong ba ô model               → ghi
  //   · đổi độ ngẫu nhiên (cùng nhóm "cấu hình chạy")   → ghi
  //   · TẠO MỚI dòng cấu hình mà có nêu ô model         → ghi, kể cả khi đặt đúng bằng mặc định
  //   · không có gì đổi thật                            → KHÔNG ghi, đừng đẻ nhật ký rác
  const doiModel = (!dangCo && coNeuModel)
    || chinh.ma !== truoc.chinh.ma
    || duPhong.ma !== truoc.duPhong.ma
    || nen.ma !== truoc.nen.ma
    || doNgauNhien !== truoc.doNgauNhien
    || doNgauNhienNen !== truoc.doNgauNhienNen;

  // Hai dòng nhật ký khi đổi cả hai thứ: đổi model và đổi khoá là hai sự việc khác nhau,
  // và màn "Nhật ký thao tác" lọc theo `hanh_dong` — gộp một dòng là mất một trong hai.
  if (doiModel) {
    await ghiNhatKyModel(bc, {
      hanhDong: HANH_DONG.DOI_MODEL,
      doiTuongLoai: BANG,
      doiTuongId: dangCo ? dangCo.id : null,
      truoc: tomTatDeGhi(truoc),
      sau: tomTatDeGhi({ ...truoc, chinh, duPhong, nen, doNgauNhien, doNgauNhienNen }),
    });
  }
  if (doiKhoa.length) {
    await ghiNhatKyModel(bc, {
      hanhDong: HANH_DONG.DOI_KHOA,
      doiTuongLoai: BANG,
      doiTuongId: dangCo ? dangCo.id : null,
      // CHỈ đuôi bốn ký tự. `nhat_ky` là bảng KHÔNG SỬA ĐƯỢC: lỡ ghi khoá thật vào là nằm
      // đó vĩnh viễn.
      truoc: { khoa: tomTatKho(truoc.khoaGoc) },
      sau: { khoa: tomTatKho(khoaGoc) },
      ghiChu: `đổi khoá nhà: ${doiKhoa.join(', ')}`,
    });
  }

  return docCauHinh(bc);
}

/** Phần model của cấu hình, dạng gọn để ghi vào `truoc`/`sau`. Không kèm khoá. */
function tomTatDeGhi(c) {
  return {
    chinh: c.chinh.ma, chinh_nha: c.chinh.nha,
    du_phong: c.duPhong.ma, du_phong_nha: c.duPhong.nha,
    nen: c.nen.ma, nen_nha: c.nen.nha,
    do_ngau_nhien: c.doNgauNhien, do_ngau_nhien_nen: c.doNgauNhienNen,
  };
}

/** Chỉ dùng cho test: quên hết chỗ tiêm và bộ đệm để mỗi bài chạy trên nền sạch. */
export function xoaSachCauHinh() {
  _dem.clear();
  _daKeuChuaNoi.clear();
  _taoTruyVan = null;
  _pheuNhatKy = null;
  _pheuCanhBao = null;
  _dongHo = () => Date.now();
}
