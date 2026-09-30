// Runtime dùng adapter provider đã có ở v3/model, không sao chép tool/business logic.
import { anthropic, aiExtras } from '../llm.js';
import { config } from '../config.js';
import { docKhoaNha } from '../../db/khoa.js';
import { layModel as modelTrongBang } from '../../v3/src/model/bang-model.js';
import { goiMotLan } from '../../v3/src/model/goi-mot-lan.js';
import { noteLlmOk, noteLlmError } from '../llm-health.js';

export const VAI_TRO = Object.freeze(['chinh', 'du_phong', 'nen']);
export class LoiChuaCoLopModel extends Error {
  // `lyDo` (VE7c): 'model_la' | 'lech_nha' | 'thieu_khoa' — để màn «Model AI» nói đúng vì sao; nơi khác chỉ đọc name/khongThuLai.
  constructor(message, lyDo = null) { super(message); this.name = 'LoiChuaCoLopModel'; this.khongThuLai = true; this.lyDo = lyDo; }
}

/**
 * KHOÁ bot dùng cho một nhà — MỘT luật cho cả bot lẫn màn «Model AI» (VE7c): khoá riêng của team (`khoa_nha`) thắng; chưa
 * có thì CHỈ nhà trùng `AI_PROVIDER` mới mượn khoá của máy chủ (`KIMI_API_KEY` / `ANTHROPIC_API_KEY` — đúng khoá client cũ
 * của `llm.js` dựng bằng). Nhà khác mà không khoá riêng ⇒ `khoa: null` (bot sẽ KHÔNG gọi được).
 * `nhaCungCap` là giá trị THÔ của cột (có thể là 'anthropic'); tra `khoa_nha` bằng đúng giá trị đó như bản cũ.
 */
export async function khoaCuaBot(pool, { teamId, nhaCungCap }, env = process.env) {
  const provider = nhaCungCap === 'anthropic' ? 'claude' : nhaCungCap;
  const ownKey = await docKhoaNha(pool, { teamId, nhaCungCap }, env);
  const defaultProvider = config.aiProvider === 'anthropic' ? 'claude' : config.aiProvider;
  const bienMayChu = provider === 'kimi' ? 'KIMI_API_KEY' : 'ANTHROPIC_API_KEY';
  const envKey = provider === defaultProvider ? (provider === 'kimi' ? config.kimi.apiKey : config.anthropicApiKey) : null;
  if (ownKey) return { khoa: ownKey, nguonKhoa: 'team', bienMayChu: null };
  if (envKey) return { khoa: envKey, nguonKhoa: 'may_chu', bienMayChu };
  return { khoa: null, nguonKhoa: null, bienMayChu: provider === defaultProvider ? bienMayChu : null };
}

/**
 * PHẦN QUYẾT ĐỊNH của `layModel` — model nào, nhà nào, khoá nào, độ ngẫu nhiên nào — KHÔNG dựng client, KHÔNG gọi nhà
 * model, KHÔNG chạm bộ đếm sức khoẻ (`llm-health`). Tách ra (VE7c · 30/09) để màn «Model AI» hiện và thử ĐÚNG thứ bot
 * dùng thay vì một luật song song; `layModel` gọi chính hàm này nên hai bên không thể lệch nhau.
 * · team chưa có dòng `cau_hinh_model` (vai, `bat`) ⇒ `nguon:'config'`: model máy chủ (`MODEL_CLOSER`), khoá máy chủ, client
 *   cũ của `llm.js` — KHÔNG gửi độ ngẫu nhiên (`doNgauNhien: null`);
 * · có dòng ⇒ `nguon:'cau_hinh_model'`: model + độ ngẫu nhiên của dòng, khoá theo `khoaCuaBot`.
 * @throws {LoiChuaCoLopModel} model lạ / lệch nhà / chưa có khoá — y như `layModel`.
 */
export async function chonModel(pool, ctx, { vaiTro = 'chinh', env = process.env } = {}) {
  if (!VAI_TRO.includes(vaiTro) || ctx?.teamId == null) throw new Error('layModel: thiếu team hoặc vai trò không hợp lệ');
  const row = (await pool.query(`SELECT nha_cung_cap, ma_model, do_ngau_nhien
    FROM cau_hinh_model WHERE team_id=$1 AND vai_tro=$2 AND bat LIMIT 1`, [ctx.teamId, vaiTro])).rows[0];
  if (!row) {
    const k = (config.aiProvider === 'kimi' ? config.kimi.apiKey : config.anthropicApiKey) || null;   // đúng khoá `llm.js` dựng client
    return { nguon: 'config', maModel: config.modelCloser, nhaCungCap: config.aiProvider, khoa: k,
      nguonKhoa: k ? 'may_chu' : null, bienMayChu: config.aiProvider === 'kimi' ? 'KIMI_API_KEY' : 'ANTHROPIC_API_KEY', doNgauNhien: null };
  }
  const provider = row.nha_cung_cap === 'anthropic' ? 'claude' : row.nha_cung_cap;
  let model;
  try { model = modelTrongBang(row.ma_model); }
  catch { throw new LoiChuaCoLopModel('Model chưa có adapter trong danh sách được hỗ trợ', 'model_la'); }
  if (model.nha !== provider) throw new LoiChuaCoLopModel('Model không thuộc provider đã cấu hình', 'lech_nha');
  // Khóa team có ưu tiên; chỉ được dùng env của đúng provider khi chưa có khóa riêng.
  const k = await khoaCuaBot(pool, { teamId: ctx.teamId, nhaCungCap: row.nha_cung_cap }, env);
  if (!k.khoa) throw new LoiChuaCoLopModel('Provider đã chọn chưa có API key của team', 'thieu_khoa');
  return { nguon: 'cau_hinh_model', maModel: row.ma_model, nhaCungCap: provider, khoa: k.khoa, nguonKhoa: k.nguonKhoa,
    bienMayChu: k.bienMayChu, doNgauNhien: Number(row.do_ngau_nhien ?? 0.3) };
}

export async function layModel(pool, ctx, { vaiTro = 'chinh', env = process.env, goi = goiMotLan } = {}) {
  const c = await chonModel(pool, ctx, { vaiTro, env });
  if (c.nguon === 'config') return { client: anthropic, maModel: c.maModel, nguon: 'config', extras: aiExtras,
    nhaCungCap: c.nhaCungCap };
  return {
    maModel: c.maModel, nhaCungCap: c.nhaCungCap, nguon: 'cau_hinh_model', extras: {},
    client: { messages: { create: async request => {
      try {
        const result = await goi({ ma: c.maModel, khoa: c.khoa,
          yeuCau: { ...request, temperature: c.doNgauNhien }, timeoutMs: 30000 });
        noteLlmOk();
        return result.traLoi;
      } catch (error) { noteLlmError(error); throw error; }
    } } },
  };
}
