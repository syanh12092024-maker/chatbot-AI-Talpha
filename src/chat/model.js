// Runtime dùng adapter provider đã có ở v3/model, không sao chép tool/business logic.
import { anthropic, aiExtras } from '../llm.js';
import { config } from '../config.js';
import { docKhoaNha } from '../../db/khoa.js';
import { layModel as modelTrongBang } from '../../v3/src/model/bang-model.js';
import { goiMotLan } from '../../v3/src/model/goi-mot-lan.js';
import { noteLlmOk, noteLlmError } from '../llm-health.js';

export const VAI_TRO = Object.freeze(['chinh', 'du_phong', 'nen']);
export class LoiChuaCoLopModel extends Error {
  constructor(message) { super(message); this.name = 'LoiChuaCoLopModel'; this.khongThuLai = true; }
}

export async function layModel(pool, ctx, { vaiTro = 'chinh', env = process.env, goi = goiMotLan } = {}) {
  if (!VAI_TRO.includes(vaiTro) || ctx?.teamId == null) throw new Error('layModel: thiếu team hoặc vai trò không hợp lệ');
  const row = (await pool.query(`SELECT nha_cung_cap, ma_model, do_ngau_nhien
    FROM cau_hinh_model WHERE team_id=$1 AND vai_tro=$2 AND bat LIMIT 1`, [ctx.teamId, vaiTro])).rows[0];
  if (!row) return { client: anthropic, maModel: config.modelCloser, nguon: 'config', extras: aiExtras,
    nhaCungCap: config.aiProvider };
  const provider = row.nha_cung_cap === 'anthropic' ? 'claude' : row.nha_cung_cap;
  let model;
  try { model = modelTrongBang(row.ma_model); }
  catch { throw new LoiChuaCoLopModel('Model chưa có adapter trong danh sách được hỗ trợ'); }
  if (model.nha !== provider) throw new LoiChuaCoLopModel('Model không thuộc provider đã cấu hình');
  // Khóa team có ưu tiên; chỉ được dùng env của đúng provider khi chưa có khóa riêng.
  const ownKey = await docKhoaNha(pool, { teamId: ctx.teamId, nhaCungCap: row.nha_cung_cap }, env);
  const defaultProvider = config.aiProvider === 'anthropic' ? 'claude' : config.aiProvider;
  const key = ownKey || (provider === defaultProvider
    ? (provider === 'kimi' ? config.kimi.apiKey : config.anthropicApiKey) : null);
  if (!key) throw new LoiChuaCoLopModel('Provider đã chọn chưa có API key của team');
  return {
    maModel: row.ma_model, nhaCungCap: provider, nguon: 'cau_hinh_model', extras: {},
    client: { messages: { create: async request => {
      try {
        const result = await goi({ ma: row.ma_model, khoa: key,
          yeuCau: { ...request, temperature: Number(row.do_ngau_nhien ?? 0.3) }, timeoutMs: 30000 });
        noteLlmOk();
        return result.traLoi;
      } catch (error) { noteLlmError(error); throw error; }
    } } },
  };
}
