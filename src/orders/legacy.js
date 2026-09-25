import { taoPool } from '../../db/ket-noi.js';
import { ctxHeThong } from '../db/index.js';
import { baoDamHoiThoai } from '../chat/kho.js';
import { pkGetConversations } from '../pancake.js';
import { docSanPhamGoiGia } from '../products/catalog.js';
import { doiSangDonViNho } from '../pos/tao-don.js';
import { vaoHangCho, duyet } from './hang-cho.js';

/** Compatibility entrypoint: legacy cũng phải qua hàng chờ, validation và duyệt V3. */
export async function taoDonTuLegacy(pageId, input, convId, deps = {}) {
  if (!convId) return { ok: false, error: 'Thiếu id hội thoại để chống đơn trùng' };
  if (input?.cod_confirmed !== true) return { ok: false, error: 'Chưa xác nhận COD' };
  let pool;
  try {
    pool = deps.pool || taoPool();
    const page = (await pool.query('SELECT * FROM page WHERE page_id=$1', [String(pageId)])).rows[0];
    if (!page) throw new Error('Page chưa có trong database V3');
    const known = (await pool.query(
      'SELECT DISTINCT psid FROM tin_cho_xu_ly WHERE team_id=$1 AND page_id=$2 AND conv_id=$3',
      [page.team_id, String(pageId), String(convId)])).rows;
    let psid = known.length === 1 ? known[0].psid : null;
    if (!psid) {
      const conversations = await (deps.docHoiThoai || pkGetConversations)(String(pageId));
      const matches = conversations.filter(c => String(c.id) === String(convId) && c.from_psid);
      if (matches.length !== 1) throw new Error('Chưa đối chiếu được hội thoại Pancake; không đoán PSID');
      psid = String(matches[0].from_psid);
    }
    const ht = await baoDamHoiThoai(pool, { teamId: page.team_id, pageRowId: page.id, psid });
    const client = await pool.connect();
    let draftId;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',
        ['legacy-capture', `${page.team_id}:${page.id}:${convId}`]);
      const existing = (await client.query(
        `SELECT h.*,d.ma_pos FROM hang_cho_tao_don h LEFT JOIN don_hang d ON d.id=h.don_hang_id AND d.team_id=h.team_id
         WHERE h.team_id=$1 AND h.hoi_thoai_id=$2 AND h.du_lieu_don->>'conv_id'=$3 ORDER BY h.id LIMIT 1`,
        [page.team_id, ht.id, String(convId)])).rows[0];
      if (existing?.trang_thai === 'da_duyet' && existing.ma_pos) {
        await client.query('COMMIT');
        return { ok: true, id: existing.ma_pos, dedup: true };
      }
      if (existing && existing.trang_thai !== 'cho_duyet') throw new Error('Hàng chờ đã xử lý; nhân viên cần kiểm tra trước khi đặt lại');
      if (existing) draftId = existing.id;
      else {
        const currency = String(input.currency || '').toUpperCase();
        const total = doiSangDonViNho(input.total_price, currency);
        if (!(total > 0) || !Number.isSafeInteger(input.qty) || input.qty < 1) throw new Error('Tổng tiền/tiền tệ/số lượng không hợp lệ');
        const products = await docSanPhamGoiGia(client, page.team_id, page.id, page);
        const matches = products.filter(p => !p.het_hang && (!String(input.product_id || '').includes(':') || p.ma === input.product_id)).flatMap(p => p.goiGia
          .filter(g => Number(g.so_luong) === input.qty && Number(g.gia) === total && String(g.tien_te).toUpperCase() === currency)
          .map(() => p));
        if (matches.length !== 1) throw new Error('Không có đúng một gói giá DB khớp đơn; nhân viên cần xác nhận cấu hình');
        const result = await (deps.vaoHangCho || vaoHangCho)(client, ctxHeThong(), {
          teamId: page.team_id, hoiThoaiId: ht.id, convId: String(convId),
          hoSo: { name: input.name, phone: input.phone, address: input.address, city: input.city,
            qty: input.qty, total_price: Number(input.total_price), currency,
            san_pham_ma: matches[0].ma, kho_hang: input.kho_hang || '' },
        }, deps.hangCho || {});
        if (!result?.id) throw new Error('Chưa lưu được hàng chờ');
        draftId = result.id;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
    const result = await (deps.duyet || duyet)(pool, ctxHeThong(), {
      teamId: page.team_id, hangChoId: draftId,
    }, deps.hangCho || {});
    if (!result.tao) return { ok: false, draftId: String(draftId),
      error: `Đơn đang chờ xử lý tại V3: ${(result.chan_vi || []).join('; ')}` };
    return { ok: true, id: result.maPos, draftId: String(draftId) };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally { if (!deps.pool && pool) await pool.end(); }
}
