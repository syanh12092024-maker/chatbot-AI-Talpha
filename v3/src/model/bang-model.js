// BẢNG MODEL + ĐƠN GIÁ + QUY TOKEN RA TIỀN — L1-M4a
//
// Đây là NGUỒN SỐ DUY NHẤT về "model nào, của nhà nào, giá bao nhiêu". Sổ AI ghi `ma`
// của bảng này, nên sau này so được model nào rẻ hơn THẬT (đo bằng tiền mỗi ĐƠN, xem
// docs/v3/01-QUYET-DINH.md mục 7) chứ không phải so bằng cảm giác.
//
// Vì sao tách khỏi `src/config.js`: bảng giá ở bản đang chạy chỉ có ĐÚNG MỘT bộ đơn giá
// cho cả hệ thống (`config.aiPrices`), chọn theo AI_PROVIDER lúc nạp module. v3 cho mỗi
// team chọn model riêng, nên đơn giá phải tra được theo TỪNG MÃ MODEL.

import { LoiModelLa, LoiThamSo } from './loi.js';

// ---- HAI HẰNG SỐ NỀN ---------------------------------------------------------------

/**
 * Hồ sơ token ĐO THẬT mỗi lượt AI, lấy từ Sổ AI production ngày 22/08/2026
 * (docs/v3/01-QUYET-DINH.md — "Số đo nền"): vào 3.053 · đọc cache 8.390 · ra 167.
 * Dùng để quy bảng giá công bố ra "đ/tin" mà so ngang được giữa bảy model.
 * `cacheGhi` = 0 vì hồ sơ nền không tách khoản ghi cache; số đ/tin vì thế là CẬN DƯỚI,
 * đúng bằng cách bảng quyết định đã tính.
 */
export const HO_SO_TOKEN_DO_THAT = Object.freeze({ vao: 3053, cacheDoc: 8390, cacheGhi: 0, ra: 167 });

/** Tỉ giá mặc định — giống `src/config.js` (`AI_USD_VND || 26000`). */
export const USD_VND_MAC_DINH = 26000;

/** Đọc tỉ giá lúc GỌI, không phải lúc nạp module — để đổi env là ăn ngay, không phải khởi động lại. */
export function tiGiaHienTai() {
  const n = Number(process.env.AI_USD_VND);
  return Number.isFinite(n) && n > 0 ? n : USD_VND_MAC_DINH;
}

// ---- BẢNG BẢY MODEL ----------------------------------------------------------------
// `giaUsd` là USD trên MỘT TRIỆU token.
// `nguonGia`:
//   'cong-bo'   — lấy từ bảng giá nhà cung cấp công bố.
//   'suy-nguoc' — GIẢI NGƯỢC từ cột "đ/tin" của docs/v3/01-QUYET-DINH.md mục 7, dùng hồ
//                 sơ token đo thật ở trên và tỉ giá 26.000, vì CHƯA AI MỞ TÀI KHOẢN hai
//                 nhà đó để lấy bảng giá công bố.
//                 ⚠️ PHẢI THAY BẰNG GIÁ CÔNG BỐ KHI MỞ TÀI KHOẢN — việc này nằm trong
//                 "việc làm song song" của kế hoạch. Trong lúc chờ, đè tạm bằng biến môi
//                 trường `V3_GIA_<MÃ VIẾT HOA GẠCH DƯỚI>` (xem `tenBienGia`).
const BANG = [
  {
    ma: 'claude-haiku-4.5',
    nha: 'claude',
    maGoiApi: 'claude-haiku-4-5',
    giaUsd: { vao: 1.00, cacheDoc: 0.10, cacheGhi: 1.25, ra: 5.00 },
    nguonGia: 'cong-bo',
    ghiChu: 'Model rẻ nhất họ Claude. Ghi cache = 1,25× giá vào theo bảng giá Anthropic.',
  },
  {
    ma: 'claude-sonnet-5',
    nha: 'claude',
    maGoiApi: 'claude-sonnet-5',
    giaUsd: { vao: 3.00, cacheDoc: 0.30, cacheGhi: 3.75, ra: 15.00 },
    nguonGia: 'cong-bo',
    ghiChu: 'Đắt gấp ~2,9× mức đang chạy. Chỉ dùng khi A/B chứng minh nó chốt bằng ít tin hơn.',
  },
  {
    ma: 'claude-opus-5',
    nha: 'claude',
    maGoiApi: 'claude-opus-5',
    giaUsd: { vao: 5.00, cacheDoc: 0.50, cacheGhi: 6.25, ra: 25.00 },
    nguonGia: 'cong-bo',
    ghiChu: 'Đắt gấp ~4,8× mức đang chạy. Để dành việc nền khó, không để chạy chốt đại trà.',
  },
  {
    ma: 'kimi-k2.6',
    nha: 'kimi',
    maGoiApi: 'kimi-k2.6',
    giaUsd: { vao: 0.95, cacheDoc: 0.16, cacheGhi: 0.95, ra: 4.00 },
    nguonGia: 'cong-bo',
    ghiChu: 'ĐANG CHẠY ở bản production. Ghi cache: Moonshot không nêu rõ nên tạm lấy bằng '
      + 'giá vào (cận dưới) — giống ghi chú ở src/config.js dòng 88–103. '
      + 'BẮT BUỘC gửi kèm thinking:{type:"disabled"}, xem nha/kimi.js.',
  },
  {
    ma: 'kimi-k2.5',
    nha: 'kimi',
    maGoiApi: 'kimi-k2.5',
    giaUsd: { vao: 0.50, cacheDoc: 0.08, cacheGhi: 0.50, ra: 2.00 },
    nguonGia: 'suy-nguoc',
    ghiChu: 'Đơn giá SUY NGƯỢC từ cột đ/tin, chưa đối chiếu bảng giá công bố.',
  },
  {
    ma: 'gpt-5.6-luna',
    nha: 'openai',
    maGoiApi: 'gpt-5.6-luna',
    giaUsd: { vao: 0.215, cacheDoc: 0.0215, cacheGhi: 0.215, ra: 0.86 },
    nguonGia: 'suy-nguoc',
    ghiChu: 'Đơn giá SUY NGƯỢC từ cột đ/tin — CHƯA MỞ TÀI KHOẢN OpenAI. Thay bằng giá công bố khi mở.',
  },
  {
    ma: 'deepseek-v4-flash',
    nha: 'deepseek',
    maGoiApi: 'deepseek-v4-flash',
    giaUsd: { vao: 0.185, cacheDoc: 0.0185, cacheGhi: 0.185, ra: 0.74 },
    nguonGia: 'suy-nguoc',
    ghiChu: 'Đơn giá SUY NGƯỢC từ cột đ/tin (mức NGOÀI CAO ĐIỂM) — CHƯA MỞ TÀI KHOẢN DeepSeek. '
      + 'Giá giờ cao điểm cao hơn; thay bằng giá công bố khi mở tài khoản.',
  },
];

const THEO_MA = new Map(BANG.map((d) => [d.ma, d]));

/** Mọi mã model đang có trong bảng. */
export const MA_MODEL = Object.freeze(BANG.map((d) => d.ma));

// ---- ĐÈ ĐƠN GIÁ BẰNG BIẾN MÔI TRƯỜNG -----------------------------------------------

/** `'claude-haiku-4.5'` → `'V3_GIA_CLAUDE_HAIKU_4_5'`. */
export function tenBienGia(ma) {
  return `V3_GIA_${String(ma).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

const THU_TU_GIA = ['vao', 'cacheDoc', 'cacheGhi', 'ra'];

/**
 * Đọc đơn giá đè từ env, dạng `vao,cacheDoc,cacheGhi,ra`.
 * Đặt biến mà viết sai thì NÉM LỖI chứ không im lặng dùng giá cũ: người đặt biến tin là
 * đã đổi giá, mà mọi con số chi phí sau đó lại tính bằng giá cũ — sai lặng lẽ, không ai biết.
 */
function giaDe(ma) {
  const ten = tenBienGia(ma);
  const tho = process.env[ten];
  if (tho == null || String(tho).trim() === '') return null;
  const phan = String(tho).split(',').map((s) => s.trim());
  if (phan.length !== 4) {
    throw new LoiThamSo(`${ten} phải có đúng 4 số "vao,cacheDoc,cacheGhi,ra" — đang là "${tho}".`);
  }
  const ra = {};
  for (let i = 0; i < 4; i++) {
    const n = Number(phan[i]);
    if (!Number.isFinite(n) || n < 0) {
      throw new LoiThamSo(`${ten}: giá "${phan[i]}" (${THU_TU_GIA[i]}) không phải số không âm.`);
    }
    ra[THU_TU_GIA[i]] = n;
  }
  return ra;
}

function dungDong(goc) {
  const de = giaDe(goc.ma);
  return Object.freeze({
    ...goc,
    giaUsd: Object.freeze(de ? { ...de } : { ...goc.giaUsd }),
    giaDeBangEnv: !!de,
  });
}

// ---- TRA CỨU -----------------------------------------------------------------------

/**
 * Lấy một dòng bảng theo mã hệ thống.
 * @param {string} ma ví dụ 'kimi-k2.6'
 * @returns {{ma:string,nha:string,maGoiApi:string,giaUsd:{vao:number,cacheDoc:number,cacheGhi:number,ra:number},nguonGia:string,ghiChu:string,giaDeBangEnv:boolean}}
 * @throws {LoiModelLa} mã không có trong bảng
 */
export function layModel(ma) {
  const goc = THEO_MA.get(String(ma));
  if (!goc) throw new LoiModelLa(ma, MA_MODEL);
  return dungDong(goc);
}

/** Bảng model, lọc theo nhà nếu muốn. Đơn giá đã áp phần đè bằng env. */
export function danhSachModel({ nha } = {}) {
  return BANG.filter((d) => (nha ? d.nha === nha : true)).map(dungDong);
}

// ---- QUY TOKEN RA TIỀN -------------------------------------------------------------

/**
 * Nhận CẢ HAI hình dạng đếm token rồi quy về một:
 *   · hình dạng Anthropic — `{input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens}`
 *   · hình dạng nội bộ    — `{vao, ra, cacheDoc, cacheGhi}`
 * Nhận cả hai vì `traLoi.usage` đi thẳng từ nhà cung cấp về, còn `kq.token` là hình dạng
 * nội bộ; bắt nơi gọi phải nhớ chuyển tay là chỗ để quên.
 */
export function chuanHoaDemToken(usage = {}) {
  const u = usage || {};
  const so = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);
  return {
    vao: so(u.vao ?? u.input_tokens),
    ra: so(u.ra ?? u.output_tokens),
    cacheDoc: so(u.cacheDoc ?? u.cache_read_input_tokens),
    cacheGhi: so(u.cacheGhi ?? u.cache_creation_input_tokens),
  };
}

/**
 * Quy số token ra tiền.
 * @param {object} usage hình dạng Anthropic hoặc `{vao,ra,cacheDoc,cacheGhi}`
 * @param {string} ma mã model
 * @param {{usdVnd?:number}} [tuyChon] tỉ giá; bỏ trống thì đọc env `AI_USD_VND`, không có thì 26.000
 * @returns {{usd:number, vnd:number}}
 */
export function quyTien(usage, ma, { usdVnd } = {}) {
  const { giaUsd } = layModel(ma);
  const t = chuanHoaDemToken(usage);
  const ti = Number.isFinite(Number(usdVnd)) && Number(usdVnd) > 0 ? Number(usdVnd) : tiGiaHienTai();
  const usd = (t.vao * giaUsd.vao
    + t.cacheDoc * giaUsd.cacheDoc
    + t.cacheGhi * giaUsd.cacheGhi
    + t.ra * giaUsd.ra) / 1e6;
  return {
    // Làm tròn 10 chữ số để cắt rác dấu phẩy động, vẫn thừa chính xác cho một lượt chat
    // (rẻ nhất khoảng $0,0008).
    usd: +usd.toFixed(10),
    // Quy VND GIỐNG HỆT `src/economics.js`: Math.round(usd * usdVnd). Phải giống thì số
    // của v3 mới đối chiếu được với sổ của bản đang chạy.
    vnd: Math.round(usd * ti),
  };
}

/**
 * "đ/tin" tham chiếu: quy hồ sơ token ĐO THẬT ra tiền theo đơn giá của model này.
 * Đây là con số so ngang được với cột "đ/tin" của docs/v3/01-QUYET-DINH.md mục 7.
 * KHÔNG làm tròn về số nguyên — bảng tài liệu ghi tới một chữ số thập phân (127,7đ), làm
 * tròn ở đây thì phép đối chiếu mất luôn chỗ để phát hiện lệch.
 * @returns {number} số tiền Việt cho MỘT tin AI
 */
export function dTinThamChieu(ma, { usdVnd } = {}) {
  const { giaUsd } = layModel(ma);
  const t = HO_SO_TOKEN_DO_THAT;
  const ti = Number.isFinite(Number(usdVnd)) && Number(usdVnd) > 0 ? Number(usdVnd) : tiGiaHienTai();
  const usd = (t.vao * giaUsd.vao
    + t.cacheDoc * giaUsd.cacheDoc
    + t.cacheGhi * giaUsd.cacheGhi
    + t.ra * giaUsd.ra) / 1e6;
  return +(usd * ti).toFixed(3);
}
