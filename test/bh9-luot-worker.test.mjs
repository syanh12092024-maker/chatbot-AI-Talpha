// BH9 ④7 — LƯỢT ĐI WORKER THẬT (`queue/worker.js#chayMotVong` → `nhanDienSale` → `handler-v3#xuLyMotTin` → cổng sau bán 4a / cửa ra
// thật / `captureOrder` → ghi sổ). Postgres HỘP CÁT riêng (`aicloser_v3_test_bh9w_p<pid>`, tự dựng tự dọn) · KHÔNG mạng: cửa gửi TIÊM
// (đếm từng lượt), `chayCloser` TIÊM (đếm lượt gọi model). Khuôn hộp cát `test/rp2-worker-a-phay.test.mjs`.
// ⚠️ KHÔNG tiêm `kiemTinRa` (soát (a)): khuôn RP2 tiêm `() => ({ ok: true })` ⇒ bốn luật mới không bao giờ chạy và ca d/e/g/j xanh giả.
// Tin POS trong lịch sử mang `from.admin_name: 'POS'` (máy — `conv-owner.js:85`) để `nhanDienSale` không nhường trước khi tới handler.
// Nhánh KHÔNG chạm: bộ nạp thật (tin xếp tay `xepTin`) · cửa Messenger thật · bộ não thật (closer) — `create_draft_order` đi `executeTool`
// THẬT của `tools.js` (để «kết quả tool lỗi về model» là lỗi thật của đường tool, không phải lỗi tự dựng).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';

let sb, teamId, chayMotVong, xepTin, O, config, executeTool, isOurFixedMessage, cuHandoff, LoiCuaGuiDong, C_donTuTinPage;
before(async () => {
  ({ chayMotVong } = await import('../src/queue/worker.js'));
  ({ xepTin } = await import('../src/queue/kho.js'));
  O = await import('../src/our-messages.js');
  ({ isOurFixedMessage } = O);
  ({ config } = await import('../src/config.js'));
  ({ executeTool } = await import('../src/tools.js'));
  ({ LoiCuaGuiDong } = await import('../src/channels/messenger/index.js'));
  ({ donTuTinPage: C_donTuTinPage } = await import('../src/context.js'));
  cuHandoff = config.pkTags.handoff;
  config.pkTags.handoff = 'AI CHAT';
  sb = await dungSandbox('bh9w');
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  console.log(`   [bh9w] hộp cát ${sb.ten} · tệp đo ${new URL('../src/chat/handler-v3.js', import.meta.url).pathname} · cwd ${process.cwd()} · TZ=${process.env.TZ || 'máy'}`);
});
after(async () => { config.pkTags.handoff = cuHandoff; if (sb) await sb.don(); });

const BAY_GIO = Date.now();
const naive = (giayTruoc) => new Date(BAY_GIO - giayTruoc * 1000).toISOString().replace('Z', '000');
const K = (id, s, message, name = 'Maria Santos') => ({ id, from: { id: 'KH', name }, message, inserted_at: naive(s) });
const POS = (id, s, message, pg) => ({ id, from: { id: pg, admin_name: 'POS' }, message, inserted_at: naive(s) });
const BOT = (id, s, message, pg) => ({ id, from: { id: pg, admin_name: 'Public API' }, message, inserted_at: naive(s) });
const SALE = (id, s, message, pg) => ({ id, from: { id: pg, admin_name: 'Trang Sale' }, message, inserted_at: naive(s) });
const KB = {
  config: {}, trongDiem: false, nguon_thieu: [],
  text: 'Soothing Cooling Gel — Buy 1 Get 1 FREE 109 SAR · Buy 2 Get 2 FREE 159 SAR. Free delivery, cash on delivery.',
  products: [{ id: 'P1', name: 'Soothing Cooling Gel', currency: 'SAR',
    tiers: [{ label: 'Buy 1 Get 1 FREE', price: 109, qty: 2 }, { label: 'Buy 2 Get 2 FREE', price: 159, qty: 4 }] }],
};
const CAU_MODEL = 'Sige po 😊 Which set po — Buy 1 Get 1 FREE (109 SAR) or Buy 2 Get 2 FREE (159 SAR)?';
const DUNG = { tin: 1234, tout: 56, cread: 0, cwrite: 0, calls: 1 };
const POS_GIAO = 'Hello! Your order is scheduled for delivery today. Please keep your phone open for the courier.';

/** Một hội thoại, `luotDs` lượt — mỗi lượt xếp ĐÚNG MỘT tin rồi chạy một vòng worker; đọc lại sổ thật sau mỗi lượt. */
async function chay(ten, luotDs, { hoSo = {}, kb = KB } = {}) {
  const page = `bh9w-${ten}`;
  const p = (await sb.pool.query("INSERT INTO page (bot_ai_bat, team_id, page_id, ten) VALUES (true,$1,$2,'BH9') RETURNING id", [teamId, page])).rows[0].id;
  const htId = (await sb.pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu,ho_so) VALUES ($1,$2,'KH','QUALIFY','AI',$3) RETURNING id",
    [teamId, p, JSON.stringify(hoSo)])).rows[0].id;
  const ra = [];
  for (const l of luotDs) {
    const dem = { model: 0, gui: [], anh: [], note: [], the: [], tool: [] };
    const ls = l.lichSu(page);
    await xepTin(sb.pool, { teamId, pageId: page, psid: 'KH', convId: `c-${page}`, custId: 'cu', msgId: l.msgId, noiDung: l.noiDung, hoanMs: 0 });
    const kq = await chayMotVong(sb.pool, {
      pageIds: [page], docTin: async () => ls,
      layKb: () => kb,
      layModel: async () => ({ client: {}, maModel: 'stub', nguon: 'config' }),
      phanLoai: async () => ({ intent: 'other', is_spam_conf: 0 }),
      lanNhanh: l.lanNhanh || (() => ({ handled: false, reply: null, lane: '', reason: 'stub' })),
      chayCloser: async (ctx) => {
        dem.model += 1;
        ctx.state.lastUsage = { ...DUNG };
        return l.model ? l.model(ctx, dem) : CAU_MODEL;
      },
      cua: {
        guiTin: async (_p, _c, x) => { dem.gui.push(x.text); return { ok: true, id: `t${dem.gui.length}` }; },
        guiAnh: async (_p, _c, x) => { dem.anh.push(x.url); return { ok: true, id: `a${dem.anh.length}` }; },
        ghiNote: async (_p, _c, x) => { dem.note.push(x.message); return { ok: true }; },
        gatThe: async (_p, _c, x) => { dem.the.push(x.name); return { ok: true, tags: [] }; },
      },
    });
    const ht = (await sb.pool.query('SELECT trang_thai, chu_so_huu, ho_so, ly_do_cuoi FROM hoi_thoai WHERE id=$1', [htId])).rows[0];
    const tinId = (await sb.pool.query('SELECT id FROM tin_cho_xu_ly WHERE team_id=$1 AND page_id=$2 AND msg_id=$3', [teamId, page, l.msgId])).rows[0]?.id;
    const so = (await sb.pool.query('SELECT loai, lane, ly_do, token_vao, du_lieu FROM so_ai WHERE team_id=$1 AND page_id=$2 AND nguon_dong=$3 ORDER BY id',
      [teamId, page, Number(tinId)])).rows;
    const hc = (await sb.pool.query('SELECT id, du_lieu_don FROM hang_cho_tao_don WHERE team_id=$1 AND hoi_thoai_id=$2', [teamId, htId])).rows;
    const r = { kq: kq ? `${kq.ketQua}:${String(kq.lyDo || '').slice(0, 60)}` : 'null', ht: `${ht.trang_thai}/${ht.chu_so_huu}`, hoSo: ht.ho_so,
      so, hc, ...dem };
    console.log(`   [bh9w] ${ten}: ${JSON.stringify({ ...r, hoSo: undefined, so: so.map((x) => `${x.loai}/${x.lane}`), hc: hc.length,
      gui: dem.gui.map((g) => g.slice(0, 40)), note: dem.note.map((n) => n.slice(0, 90)) })}`);
    ra.push(r);
  }
  return ra;
}
const sauBanA = (pg) => [K('k1', 900, 'how much po?'), POS('p1', 600, POS_GIAO, pg), K('k2', 60, 'You delivered today at 10 right sir')];

test('BH9 Wa · lịch sử có tin POS «scheduled for delivery», khách «You delivered today at 10» ⇒ 0 model · đúng 1 tin = CAU_NHAN_BAN_GIAO.en · thẻ AI CHAT · ghi chú SAU BÁN · HANDOFF/SALE · so_ai reply cau_co_dinh + handoff', async () => {
  assert.ok(O.CAU_NHAN_BAN_GIAO, 'our-messages.js chưa export CAU_NHAN_BAN_GIAO');
  const [r] = await chay('a', [{ noiDung: 'You delivered today at 10 right sir', msgId: 'k2', lichSu: sauBanA }]);
  assert.equal(r.model, 0, 'cổng sau bán phải chặn TRƯỚC model');
  assert.deepEqual(r.gui, [O.CAU_NHAN_BAN_GIAO.en]);
  assert.deepEqual(r.the, ['AI CHAT']);
  assert.equal(r.note.length, 1);
  assert.match(r.note[0], /^🙋 AI CHUYỂN NGƯỜI[\s\S]*SAU BÁN · khách: «You delivered today at 10/);
  assert.equal(r.ht, 'HANDOFF/SALE');
  const reply = r.so.filter((x) => x.loai === 'reply');
  assert.equal(reply.length, 1, `so_ai: ${r.so.map((x) => `${x.loai}/${x.lane}`)}`);
  assert.equal(reply[0].lane, 'cau_co_dinh');
  assert.equal(reply[0].token_vao, null);
  assert.equal(r.so.filter((x) => x.loai === 'handoff').length, 1);
  assert.match(r.kq, /^xong:sau_ban/);
});

test('BH9 Wa2 · như a nhưng Fast Lane CÓ câu mẫu khớp ⇒ cổng sau bán vẫn thắng (đứng TRƯỚC lớp 0 đồng): câu cố định, 0 «MẪU CỨNG»', async () => {
  assert.ok(O.CAU_NHAN_BAN_GIAO);
  const [r] = await chay('a2', [{ noiDung: 'You delivered today at 10 right sir', msgId: 'k2', lichSu: sauBanA,
    lanNhanh: () => ({ handled: true, reply: 'MẪU CỨNG giá: Buy 1 Get 1 FREE 109 SAR', lane: 'tpl_price', reason: 'giá' }) }]);
  assert.equal(r.model, 0);
  assert.deepEqual(r.gui, [O.CAU_NHAN_BAN_GIAO.en]);
  assert.equal(r.ht, 'HANDOFF/SALE');
});

// Wa3 gọi HANDLER trực tiếp: qua worker, `queue/lan-gui.js#bocCuaGuiBen` bọc mọi lỗi cửa thành LoiGuiChuaXacNhan và worker `banGiaoLoi`
// lo (đường cũ của mọi lớp 0 đồng) — nhánh `LoiCuaGuiDong` của handler chỉ tới được khi cửa ném thẳng.
test('BH9 Wa3 · /code-review #4: cửa ném LoiCuaGuiDong ở cổng sau bán ⇒ handler KHÔNG ghi HANDOFF câm (chưa câu nào tới khách, chưa thẻ/ghi chú)', async () => {
  const { xuLyMotTin } = await import('../src/chat/handler-v3.js');
  const { docTinTheoId } = await import('../src/queue/kho.js');
  const page = 'bh9w-a3';
  const p = (await sb.pool.query("INSERT INTO page (bot_ai_bat, team_id, page_id, ten) VALUES (true,$1,$2,'BH9') RETURNING id", [teamId, page])).rows[0].id;
  const htId = (await sb.pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,'KH','QUALIFY','AI') RETURNING id", [teamId, p])).rows[0].id;
  const t = await xepTin(sb.pool, { teamId, pageId: page, psid: 'KH', convId: `c-${page}`, custId: 'cu', msgId: 'k2', noiDung: 'You delivered today at 10 right sir', hoanMs: 0 });
  const tin = await docTinTheoId(sb.pool, t.id, teamId);
  const dem = { the: 0, note: 0 };
  const kq = await xuLyMotTin(sb.pool, tin, {
    layKb: () => KB, lichSu: sauBanA(page),
    cua: { guiTin: async () => { throw new LoiCuaGuiDong('van đóng (ca BH9 Wa3)'); }, guiAnh: async () => ({ ok: true, id: 'a' }),
      ghiNote: async () => { dem.note += 1; return { ok: true }; }, gatThe: async () => { dem.the += 1; return { ok: true, tags: [] }; } },
  });
  const ht = (await sb.pool.query('SELECT trang_thai, chu_so_huu FROM hoi_thoai WHERE id=$1', [htId])).rows[0];
  console.log(`   [bh9w] a3: ${JSON.stringify({ kq: kq.ketQua, lyDo: String(kq.lyDo).slice(0, 40), ht, dem })}`);
  assert.equal(kq.ketQua, 'chan_guard');
  assert.equal(`${ht.trang_thai}/${ht.chu_so_huu}`, 'QUALIFY/AI', 'chưa gửi được gì thì không được chuyển hội thoại sang SALE câm');
  assert.deepEqual([dem.the, dem.note], [0, 0]);
});

test('BH9 Wb · như a, khách viết Ả Rập ⇒ chữ = CAU_NHAN_BAN_GIAO.ar', async () => {
  assert.ok(O.CAU_NHAN_BAN_GIAO);
  const cau = 'المندوب اتصل بي اليوم، متى يصل التوصيل؟';
  const [r] = await chay('b', [{ noiDung: cau, msgId: 'k2',
    lichSu: (pg) => [K('k1', 900, 'كم السعر؟'), POS('p1', 600, POS_GIAO, pg), K('k2', 60, cau)] }]);
  assert.equal(r.model, 0);
  assert.deepEqual(r.gui, [O.CAU_NHAN_BAN_GIAO.ar]);
  assert.equal(r.ht, 'HANDOFF/SALE');
});

test('BH9 Wc · ÂM: hồ sơ rỗng, khách «can you deliver tomorrow?» ⇒ model 1 lượt · chữ gửi === câu model (byte)', async () => {
  const [r] = await chay('c', [{ noiDung: 'can you deliver tomorrow?', msgId: 'k1', lichSu: () => [K('k1', 60, 'can you deliver tomorrow?')],
    model: () => 'Yes po 😊 Delivery takes 2-5 working days po, free delivery and cash on delivery.' }]);
  assert.equal(r.model, 1);
  assert.deepEqual(r.gui, ['Yes po 😊 Delivery takes 2-5 working days po, free delivery and cash on delivery.']);
  assert.equal(r.ht, 'QUALIFY/AI');
});

const xepAnh = (caption) => (ctx) => {
  ctx.state.pendingImages = [{ url: 'https://x.test/1.jpg', cat: 'sản phẩm' }, { url: 'https://x.test/2.jpg', cat: 'sản phẩm' }];
  ctx.state.pendingCaption = caption;
  return 'That delivery notice was sent by mistake — sorry for the confusion po.';
};
for (const [id, caption] of [['Wd1', ''], ['Wd2', 'Here is our Soothing Cooling Gel po']]) {
  test(`BH9 ${id} · model bịa «notice sent by mistake» + xếp 2 ảnh (caption ${caption ? 'sạch' : 'rỗng'}) ⇒ đúng 1 tin = câu cố định · 0 ảnh · bàn giao · spent_no_send giữ câu · token tính ĐÚNG MỘT lần`, async () => {
    assert.ok(O.CAU_NHAN_BAN_GIAO);
    const [r] = await chay(id.toLowerCase(), [{ noiDung: 'hello po, any update?', msgId: 'k1',
      lichSu: () => [K('k1', 60, 'hello po, any update?')], model: xepAnh(caption) }]);
    assert.equal(r.model, 1);
    assert.deepEqual(r.gui, [O.CAU_NHAN_BAN_GIAO.en], 'luật mới chặn ⇒ câu cố định, không im');
    assert.equal(r.anh.length, 0, 'ảnh của câu bị chặn KHÔNG được đi');
    assert.equal(r.ht, 'HANDOFF/SALE');
    assert.deepEqual(r.the, ['AI CHAT']);
    assert.match(r.note[0], /cửa ra chặn: BIA_TRANG_THAI_DON/);
    const sns = r.so.filter((x) => x.loai === 'spent_no_send');
    assert.equal(sns.length, 1);
    assert.match(sns[0].du_lieu.text_bi_chan, /sent by mistake/);
    const reply = r.so.filter((x) => x.loai === 'reply');
    assert.equal(reply.length, 1);
    assert.equal(reply[0].lane, 'cau_co_dinh');
    assert.equal(reply[0].du_lieu.cau_co_dinh, 'cua_ra:BIA_TRANG_THAI_DON');
    const tong = r.so.reduce((n, x) => n + Number(x.token_vao || 0), 0);
    assert.equal(tong, DUNG.tin, `tổng token_vao của tin = ${tong} (chờ đúng một lần ${DUNG.tin})`);
    const img = r.so.filter((x) => x.loai === 'image');
    assert.ok(img.every((x) => (x.du_lieu.anh_hong_loai || []).every((k) => k === 'bo_cau_co_dinh')), JSON.stringify(img));
  });
}

test('BH9 Wd3 · khách có đơn, chữ model QUA nhưng CAPTION chào giá (BAN_LAI_SAU_BAN) ⇒ chữ đi · 0 ảnh (ảnh bán hàng cũng là chào hàng) · bàn giao', async () => {
  // vòng 2: tín hiệu đã lưu phải có mốc (`luc`) còn hạn — hồ sơ không mốc bị bỏ và tính lại từ lịch sử (`tinhDonDaCo`)
  const hoSo = { donDaCo: { trangThai: 'đang giao', cau: 'x', nguon: 'page', ai: 'POS', luc: new Date(BAY_GIO - 2 * 86400e3).toISOString() }, hydratedAt: 1 };
  const [r] = await chay('d3', [{ noiDung: 'is it the gel for varicose', msgId: 'k1', lichSu: () => [K('k1', 60, 'is it the gel for varicose')],
    model: (ctx) => {
      ctx.state.pendingImages = [{ url: 'https://x.test/1.jpg', cat: 'sản phẩm' }, { url: 'https://x.test/2.jpg', cat: 'sản phẩm' }];
      ctx.state.pendingCaption = 'Buy 1 Get 1 FREE — 109 SAR po';
      return 'Yes po, it helps soothe the area 😊';
    } }], { hoSo });
  assert.equal(r.model, 1);
  assert.deepEqual(r.gui, ['Yes po, it helps soothe the area 😊']);
  assert.equal(r.anh.length, 0);
  assert.equal(r.ht, 'HANDOFF/SALE');
  assert.match(r.note[0] || '', /cửa ra chặn: BAN_LAI_SAU_BAN · caption/);
});

test('BH9 We · luật CŨ (PII_ECHO) chặn ⇒ đường cũ: 0 tin · ghi chú «cửa ra chặn: PII_ECHO» — giống base', async () => {
  const [r] = await chay('e', [{ noiDung: 'ok po', msgId: 'k1', lichSu: () => [K('k1', 60, 'ok po')],
    model: () => 'Noted po, your number 0501234567 is saved 😊' }]);
  assert.equal(r.model, 1);
  assert.deepEqual(r.gui, []);
  assert.equal(r.note.length, 1);
  assert.match(r.note[0], /Lý do: cửa ra chặn: PII_ECHO$/);
  assert.equal(r.so.filter((x) => x.loai === 'reply').length, 0);
  assert.equal(r.ht, 'HANDOFF/SALE');
});

const DON = { name: 'Maria', phone: '0501234567', address: 'Al Nahda 2, Building 5 flat 12', city: 'Dubai', qty: 2,
  variant: 'Buy 1 Get 1 FREE', cod_confirmed: true };
const goiTaoDon = (input = DON) => async (ctx, dem) => {
  const out = await executeTool('create_draft_order', { ...input }, ctx);
  dem.tool.push(out);
  return out.isError ? 'Sorry po, let me check with our team.' : 'Salamat po! Our staff will contact you to confirm your order.';
};
// Vòng 2: Wf1 dựng đơn nguồn page bằng tin POS THẬT trong lịch sử (2 ngày trước — trong hạn), Wf2 bằng tín hiệu khách đã lưu có mốc.
const POS_2NGAY = (pg) => [K('k0', 3 * 86400, 'ok po'), POS('p1', 2 * 86400, POS_GIAO, pg), K('k1', 60, 'sige po')];
const HS_KHACH = { donDaCo: { trangThai: 'khách nói ĐÃ ĐẶT', cau: 'x', nguon: 'khach', luc: new Date(BAY_GIO - 86400e3).toISOString() }, hydratedAt: 1 };
for (const [id, nguon, hc] of [['Wf1', 'page', 0], ['Wf2', 'khach', 1]]) {
  test(`BH9 ${id} · hồ sơ có donDaCo nguồn ${nguon}, model gọi create_draft_order đủ trường ⇒ ${hc ? '1 dòng hàng chờ (nguồn khách KHÔNG khoá tạo đơn — [S1])' : 'tool LỖI về model · 0 dòng hàng chờ'}`, async () => {
    const [r] = await chay(id.toLowerCase(), [{ noiDung: 'sige po', msgId: 'k1', lichSu: nguon === 'page' ? POS_2NGAY : () => [K('k1', 60, 'sige po')],
      model: goiTaoDon() }], { hoSo: nguon === 'page' ? {} : HS_KHACH });
    assert.equal(r.hoSo.donDaCo?.nguon, nguon, `donDaCo: ${JSON.stringify(r.hoSo.donDaCo)}`);
    assert.equal(r.model, 1);
    assert.equal(r.tool.length, 1);
    assert.equal(r.hc.length, hc, `hang_cho_tao_don: ${r.hc.length}`);
    if (hc) assert.equal(r.tool[0].isError, undefined, r.tool[0].content);
    else {
      assert.equal(r.tool[0].isError, true);
      assert.match(r.tool[0].content, /Khách đang có đơn \(đang giao\) — không tạo đơn mới; gọi handoff_human/);
    }
  });
}

test('BH9 Wg1 · khách «I have bleeding», model chào gói ⇒ 1 tin = CAU_Y_TE.en + bàn giao', async () => {
  assert.ok(O.CAU_Y_TE, 'our-messages.js chưa export CAU_Y_TE');
  const [r] = await chay('g1', [{ noiDung: 'I have bleeding', msgId: 'k1', lichSu: () => [K('k1', 60, 'I have bleeding')],
    model: () => 'This gel helps soothe irritated skin po 😊 Which set po — Buy 1 Get 1 FREE (109 SAR)?' }]);
  assert.equal(r.model, 1);
  assert.deepEqual(r.gui, [O.CAU_Y_TE.en]);
  assert.equal(r.ht, 'HANDOFF/SALE');
  assert.match(r.note[0] || '', /Y_TE/);
});
test('BH9 Wg2 · khách «I have bleeding», model khuyên ngừng dùng + đi khám ⇒ 1 tin = câu model (byte) + VẪN bàn giao', async () => {
  const cau = "I'm so sorry to hear that po 🙏 Please stop using it and see a doctor first.";
  const [r] = await chay('g2', [{ noiDung: 'I have bleeding', msgId: 'k1', lichSu: () => [K('k1', 60, 'I have bleeding')], model: () => cau }]);
  assert.equal(r.model, 1);
  assert.deepEqual(r.gui, [cau]);
  assert.equal(r.ht, 'HANDOFF/SALE', 'lượt y tế LUÔN bàn giao');
  assert.deepEqual(r.the, ['AI CHAT']);
});
test('BH9 Wg4 · /code-review #1: lượt y tế, model khuyên đi khám + «Our team will message you shortly» ⇒ câu model ĐI (lượt đã bàn giao — lời thật)', async () => {
  const cau = 'So sorry po! Please stop using it and consult a doctor. Our team will message you shortly.';
  const [r] = await chay('g4', [{ noiDung: 'I have bleeding after using it', msgId: 'k1', lichSu: () => [K('k1', 60, 'I have bleeding after using it')], model: () => cau }]);
  assert.deepEqual(r.gui, [cau]);
  assert.equal(r.ht, 'HANDOFF/SALE');
});
test('BH9 Wg5 · /code-review #1: lượt y tế, câu model bị luật mới KHÁC Y_TE chặn ⇒ VẪN câu y tế cố định (không «Noted po…»)', async () => {
  assert.ok(O.CAU_Y_TE);
  const [r] = await chay('g5', [{ noiDung: 'I have bleeding', msgId: 'k1', lichSu: () => [K('k1', 60, 'I have bleeding')],
    model: () => 'Please see a doctor po. Your order is on its way.' }]);
  assert.deepEqual(r.gui, [O.CAU_Y_TE.en]);
  assert.equal(r.ht, 'HANDOFF/SALE');
});
test('BH9 Wg3 · [S9] «bleeding po, magkano?» với Fast Lane TRẢ câu mẫu giá ⇒ Fast Lane NHƯỜNG model (1 lượt), 0 chữ «MẪU CỨNG»', async () => {
  const [r] = await chay('g3', [{ noiDung: 'bleeding po, magkano?', msgId: 'k1', lichSu: () => [K('k1', 60, 'bleeding po, magkano?')],
    lanNhanh: () => ({ handled: true, reply: 'MẪU CỨNG giá: Buy 1 Get 1 FREE 109 SAR', lane: 'tpl_price', reason: 'giá' }),
    model: () => "I'm so sorry po 🙏 Please stop using it and see a doctor first." }]);
  assert.equal(r.model, 1, 'y tế phải nhường model');
  assert.equal(r.gui.some((g) => g.includes('MẪU CỨNG')), false);
});

test('BH9 Wk · [S4] isOurFixedMessage(«Noted»/«Noted po»/«Sorry to hear that») false · sale người gõ «Noted po» ⇒ nhanDienSale nhường (HANDOFF/SALE) như base', async () => {
  for (const t of ['Noted', 'Noted po', 'Sorry to hear that']) assert.equal(isOurFixedMessage(t), false, t);
  // «Sorry» TRƠN đã true TỪ BASE (tiền tố hai chiều với «Sorry for the wait…» của LEGACY_POSTSALE_HOLDING) — BH9 không làm tệ hơn;
  // lệch đề bài ghi ở nhật ký + nợ N-BH9-FIXED-TIEN-TO.
  const [r] = await chay('k', [{ noiDung: 'ok', msgId: 'k2',
    lichSu: (pg) => [K('k1', 900, 'hi po'), SALE('s1', 300, 'Noted po', pg), K('k2', 60, 'ok')] }]);
  assert.equal(r.model, 0);
  assert.equal(r.ht, 'HANDOFF/SALE');
  assert.deepEqual(r.gui, []);
});

const DIA_CHI = 'Al Nahda 2, Building 5 flat 12, Dubai 0501234567';
for (const [id, khach, ten, coCo] of [['Wh1', DIA_CHI, 'Maria', true], ['Wh2', `Ana Cruz\n${DIA_CHI}`, 'Ana Cruz', false]]) {
  test(`BH9 ${id} · C30 + COD ngầm: page đã nêu «bayad pagdating», khách gửi địa chỉ + SĐT ⇒ ho_so.cod · đơn nháp tên «${ten}» ⇒ ${coCo ? 'CÓ' : 'KHÔNG'} ten_tu_facebook · cod_ngam`, async () => {
    const [r] = await chay(id.toLowerCase(), [{ noiDung: khach, msgId: 'k2',
      lichSu: (pg) => [K('k1', 900, 'how much po?'), BOT('b1', 800, 'Buy 1 Get 1 FREE po — 109 SAR, bayad pagdating ng order 😊', pg), K('k2', 60, khach)],
      model: goiTaoDon({ ...DON, name: ten }) }]);
    assert.equal(r.hoSo.cod, true, 'COD ngầm phải bật trước model');
    assert.equal(r.hoSo.codNgam, true);
    assert.equal(r.hoSo.tenFb, 'Maria Santos');
    assert.equal(r.hc.length, 1, `hàng chờ: ${r.hc.length} · tool ${JSON.stringify(r.tool)}`);
    const du = r.hc[0].du_lieu_don;
    assert.equal(du.cod_ngam, true);
    if (coCo) assert.equal(du.ten_tu_facebook, true);
    else assert.equal('ten_tu_facebook' in du, false, JSON.stringify(du));
  });
}

test('BH9 Wi · ≤ 1 câu cố định: lượt kế ngay sau ca a (khách nhắn tiếp) ⇒ 0 tin (hội thoại HANDOFF)', async () => {
  const ra = await chay('i', [
    { noiDung: 'You delivered today at 10 right sir', msgId: 'k2', lichSu: sauBanA },
    { noiDung: 'hello? where is the courier', msgId: 'k3', lichSu: (pg) => [...sauBanA(pg), BOT('b9', 50, O.CAU_NHAN_BAN_GIAO?.en || 'x', pg), K('k3', 30, 'hello? where is the courier')] },
  ]);
  assert.equal(ra[0].gui.length, 1);
  assert.equal(ra[1].gui.length, 0, 'câu cố định lặp ở lượt sau');
  assert.equal(ra[1].model, 0);
});

test('BH9 Wj · luật 2: lượt thường ⇒ chữ gửi === câu model · câu mẫu Fast Lane / lớp từ khoá ⇒ y như base (0 model, đúng câu mẫu)', async () => {
  const [a] = await chay('j1', [{ noiDung: 'what is it for?', msgId: 'k1', lichSu: () => [K('k1', 60, 'what is it for?')] }]);
  assert.deepEqual([a.model, a.gui], [1, [CAU_MODEL]]);
  const [b] = await chay('j2', [{ noiDung: 'how much po', msgId: 'k1', lichSu: () => [K('k1', 60, 'how much po')],
    lanNhanh: () => ({ handled: true, reply: 'MẪU giá: Buy 1 Get 1 FREE 109 SAR po', lane: 'tpl_price', reason: '' }) }]);
  assert.deepEqual([b.model, b.gui, b.kq], [0, ['MẪU giá: Buy 1 Get 1 FREE 109 SAR po'], 'xong:fastlane:tpl_price']);
  const [c] = await chay('j3', [{ noiDung: 'paano mag order', msgId: 'k1', lichSu: () => [K('k1', 60, 'paano mag order')] }]);
  assert.equal(c.model, 0);
  assert.equal(c.kq, 'xong:tu_khoa_v3:paano_gap');
  assert.equal(c.gui.length, 1);
});

// ═══ VÒNG 2 (sau đối kháng — tổng chốt 19/10) · ca phá chuyển thể từ `scratchpad/refute-bh9/refute-bh9-luot.test.mjs` ═══════════════════
const DON_KSA = { name: 'Maria Santos', phone: '0551234567', address: 'Al Nahda district, Building 5 flat 12, Riyadh', city: 'Riyadh', qty: 4,
  variant: 'Buy 2 Get 2 FREE', cod_confirmed: true };
const CAU_BOT_GIAO = 'Delivery takes 2-5 working days po 😊 Which set po — Buy 1 Get 1 FREE (109 SAR) or Buy 2 Get 2 FREE (159 SAR)?';
test('BH9 WF1a · [F1·N1] khách CHƯA có đơn đáp «5 days delivery ok po, buy 2 get 2» ⇒ model trả lời · hội thoại còn AI · donDaCo không ghi', async () => {
  const cau = '5 days delivery ok po, buy 2 get 2';
  const [r] = await chay('vf1a', [{ noiDung: cau, msgId: 'k2', model: () => 'Great choice po! May I have your full name, contact number and complete address?',
    lichSu: (pg) => [K('k1', 900, 'How many days delivery'), BOT('b1', 800, CAU_BOT_GIAO, pg), K('k2', 60, cau)] }]);
  assert.equal(r.model, 1, `người đang mua bị chặn trước model — gửi: ${JSON.stringify(r.gui)} · ${r.kq}`);
  assert.equal(r.ht, 'QUALIFY/AI');
  assert.equal(r.hoSo.donDaCo ?? null, null);
});
test('BH9 WF1b · [F1·N1] khách chốt «Ok sir u deliver tomorrow morning. <tên SĐT địa chỉ>» ⇒ tới model + 1 đơn nháp', async () => {
  const cau = 'Ok sir u deliver tomorrow morning. Maria Santos 0551234567 Al Nahda district Building 5 Riyadh';
  const [r] = await chay('vf1b', [{ noiDung: cau, msgId: 'k2', model: goiTaoDon(DON_KSA),
    lichSu: (pg) => [K('k1', 900, 'buy 2 get 2 po'), BOT('b1', 800, 'Noted po 😊 Buy 2 Get 2 FREE — 159 SAR, free delivery, cash on delivery. Please send your full name, contact number and complete address.', pg), K('k2', 60, cau)] }]);
  assert.equal(r.model, 1, `lượt CHỐT bị chặn trước model — ${r.kq}`);
  assert.equal(r.hc.length, 1, 'mất đơn nháp');
});
const CAU_DAU_DOC = 'Sure po 😊 Our team will inform the courier to call you before delivery. Which set po — Buy 1 Get 1 FREE (109 SAR) or Buy 2 Get 2 FREE (159 SAR)?';
const MAU_FL = '👉Your order is 109 SAR. You will receive this gift in the next 2-5 days!';   // câu mẫu có khuôn đơn page ([S2] (iii))
test('BH9 WF2 · [F2] lượt 1 model nói câu hứa trước bán (QUA cửa ra) · lượt 2 khách gửi gói + tên/SĐT/địa chỉ ⇒ donDaCo KHÔNG từ chữ bot · 1 đơn nháp', async () => {
  const c1 = 'pls call me before delivery po, i am working';
  const c2 = 'Buy 2 get 2 po. Maria Santos 0551234567 Al Nahda district Building 5 flat 12 Riyadh';
  const ra = await chay('vf2', [
    { noiDung: c1, msgId: 'k1', model: () => CAU_DAU_DOC, lichSu: () => [K('k1', 900, c1)] },
    { noiDung: c2, msgId: 'k2', model: goiTaoDon(DON_KSA), lichSu: (pg) => [K('k1', 900, c1), BOT('b1', 800, CAU_DAU_DOC, pg), K('k2', 60, c2)] },
  ]);
  assert.deepEqual(ra[0].gui, [CAU_DAU_DOC], 'lượt 1: câu model đi nguyên byte');
  assert.equal(ra[1].hoSo.donDaCo ?? null, null, `lượt 2: chữ của CHÍNH BOT bị đọc thành đơn: ${JSON.stringify(ra[1].hoSo.donDaCo)}`);
  assert.equal(ra[1].hc.length, 1, `lượt 2: mất đơn nháp — tool: ${JSON.stringify(ra[1].tool.map((t) => t.content))}`);
});
test('BH9 WF2b · [F2] câu MẪU v3 tự gửi (Fast Lane, 0 model) CÓ khuôn đơn page («Your order is 109 SAR. You will receive…») ⇒ lượt sau KHÔNG thành đơn page (loại nhờ lan_gui) · 1 đơn nháp', async () => {
  const c2 = 'Buy 1 get 1 po. Maria Santos 0551234567 Al Nahda district Building 5 flat 12 Riyadh';
  const ra = await chay('vf2b', [
    { noiDung: 'how much po?', msgId: 'k1', lichSu: () => [K('k1', 900, 'how much po?')],
      lanNhanh: () => ({ handled: true, reply: MAU_FL, lane: 'tpl_price', reason: 'giá' }) },
    { noiDung: c2, msgId: 'k2', model: goiTaoDon(DON_KSA), lichSu: (pg) => [K('k1', 900, 'how much po?'), BOT('b1', 800, MAU_FL, pg), K('k2', 60, c2)] },
  ]);
  assert.deepEqual([ra[0].model, ra[0].gui], [0, [MAU_FL]], 'lượt 1: câu mẫu Fast Lane đi như base');
  assert.ok(C_donTuTinPage(MAU_FL), 'tiền đề: câu mẫu khớp khuôn đơn page');
  assert.notEqual(ra[1].hoSo.donDaCo?.nguon, 'page', `chữ bot thành đơn page: ${JSON.stringify(ra[1].hoSo.donDaCo)}`);
  assert.equal(ra[1].hc.length, 1, `mất đơn nháp — tool: ${JSON.stringify(ra[1].tool.map((t) => t.content))}`);
});
test("BH9 WF3 · [F3] khách trước bán hỏi «What is Dragon's Blood po? is it safe?» ⇒ câu model đi nguyên byte · KHÔNG câu y tế · KHÔNG bàn giao", async () => {
  const cau = "What is Dragon's Blood po? is it safe?";
  const traLoi = "Dragon's Blood Resin is a natural plant resin that supports skin repair po 😊 Buy 1 Get 1 FREE — 109 SAR.";
  const [r] = await chay('vf3', [{ noiDung: cau, msgId: 'k1', model: () => traLoi, lichSu: () => [K('k1', 60, cau)] }]);
  assert.deepEqual(r.gui, [traLoi]);
  assert.equal(r.ht, 'QUALIFY/AI');
});
const BIA_141 = "Maria, your order is already with the courier po. Since it's in Riyadh, delivery is usually quick.";
test('BH9 WF4 · [F4·A3] «where is my order?» (đơn qua LadiPage — lịch sử KHÔNG có tin POS) ⇒ cổng sau bán: 0 model · câu cố định · HANDOFF · ghi chú «(lời khách …)»', async () => {
  const [r] = await chay('vf4', [{ noiDung: 'where is my order?', msgId: 'k1', model: () => BIA_141, lichSu: () => [K('k1', 60, 'where is my order?')] }]);
  assert.equal(r.model, 0);
  assert.deepEqual(r.gui, [O.CAU_NHAN_BAN_GIAO.en]);
  assert.equal(r.ht, 'HANDOFF/SALE');
  assert.match(r.note[0] || '', /SAU BÁN · khách: «where is my order\?» · đơn: khách hỏi về ĐƠN CỦA MÌNH \(lời khách · \d\d\/\d\d\)/);
});
test('BH9 WF4b · [F4·N2] lịch sử CÓ tin POS «scheduled for delivery», khách «where is my order?» ⇒ cổng 4a (0 model) · ghi chú «(POS · dd/mm)» — không «(page)»', async () => {
  const [r] = await chay('vf4b', [{ noiDung: 'where is my order?', msgId: 'k2', model: () => BIA_141,
    lichSu: (pg) => [K('k1', 90000, 'ok po'), POS('p1', 80000, POS_GIAO, pg), K('k2', 60, 'where is my order?')] }]);
  assert.equal(r.model, 0, `model ${r.model} · ${r.kq}`);
  assert.ok(!r.gui.includes(BIA_141));
  assert.match(r.note[0] || '', /đơn: đang giao \(POS · \d\d\/\d\d\)/);
  assert.doesNotMatch(r.note[0] || '', /\(page\)/);
});
test('BH9 WF4c · [F4 cửa ra] khách hỏi chung «hello po, any news?» (không tự nói về đơn) + model bịa câu #141 ⇒ chặn BIA ⇒ câu cố định + bàn giao', async () => {
  const [r] = await chay('vf4c', [{ noiDung: 'hello po, any news?', msgId: 'k1', model: () => BIA_141, lichSu: () => [K('k1', 60, 'hello po, any news?')] }]);
  assert.equal(r.model, 1);
  assert.deepEqual(r.gui, [O.CAU_NHAN_BAN_GIAO.en]);
  assert.match(r.note[0] || '', /cửa ra chặn: BIA_TRANG_THAI_DON/);
});
test('BH9 WB · [N5·N6] tin POS 15 ngày trước (quá hạn 14 ngày) KHÔNG khoá: «can you deliver tomorrow?» ⇒ model · create_draft_order ⇒ 1 đơn nháp; tin POS 2 ngày ⇒ cổng 4a', async () => {
  const cau = 'can you deliver tomorrow? Maria Santos 0551234567 Al Nahda district Building 5 flat 12 Riyadh';
  const [cu] = await chay('vb1', [{ noiDung: cau, msgId: 'k2', model: goiTaoDon(DON_KSA),
    lichSu: (pg) => [K('k1', 16 * 86400, 'ok po'), POS('p1', 15 * 86400, POS_GIAO, pg), K('k2', 60, cau)] }]);
  assert.equal(cu.model, 1, `tin POS quá hạn vẫn khoá — ${cu.kq}`);
  assert.equal(cu.hc.length, 1);
  assert.equal(cu.hoSo.donDaCo ?? null, null);
  const [moi] = await chay('vb2', [{ noiDung: 'can you deliver tomorrow?', msgId: 'k2',
    lichSu: (pg) => [K('k1', 3 * 86400, 'ok po'), POS('p1', 2 * 86400, POS_GIAO, pg), K('k2', 60, 'can you deliver tomorrow?')] }]);
  assert.equal(moi.model, 0);
  assert.match(moi.note[0] || '', /đơn: đang giao \(POS · /);
  // hồ sơ lưu tín hiệu có mốc 20 ngày trước ⇒ hết hạn ⇒ tạo đơn được
  const hs = { donDaCo: { trangThai: 'đang giao', cau: 'x', nguon: 'page', ai: 'POS', luc: new Date(BAY_GIO - 20 * 86400e3).toISOString() }, hydratedAt: 1 };
  const [het] = await chay('vb3', [{ noiDung: 'sige po', msgId: 'k1', lichSu: () => [K('k1', 60, 'sige po')], model: goiTaoDon() }], { hoSo: hs });
  assert.equal(het.hc.length, 1, `tín hiệu lưu 20 ngày vẫn khoá tạo đơn: ${JSON.stringify(het.tool)}`);
});
test('BH9 WE · [câu 4] ghi chú bàn giao in ĐÚNG nguồn: tin SALE người (40 h trước) ⇒ «(sale · dd/mm)», không «(page)»', async () => {
  // tin sale đặt NGOÀI 24 h: trong 24 h thì `nhanDienSale` nhường trước handler (đúng luật cũ) và không có ghi chú nào để đo.
  // 40 h chứ không 30 h: `chat/history.js#messageTime` đọc giờ Pancake KHÔNG múi theo GIỜ MÁY ⇒ ở TZ=Etc/GMT+12 mốc lệch 12 h và tin 30 h
  // thành «trong 24 h» (đo 19/10 — ca đỏ ở GMT+12, xanh ở UTC/+14). 40 h − 14 h vẫn > 24 h ở mọi múi. Nợ N-BH9-GIO-PANCAKE-MAY.
  const [r] = await chay('ve', [{ noiDung: 'where is the courier now?', msgId: 'k2',
    lichSu: (pg) => [K('k1', 50 * 3600, 'ok'), SALE('s1', 40 * 3600, 'But the order is in transit, could you please receive it for me?', pg), K('k2', 60, 'where is the courier now?')] }]);
  assert.equal(r.model, 0, r.kq);
  assert.equal(r.note.length, 1, `ghi chú: ${JSON.stringify(r.note)}`);
  assert.match(r.note[0], /đơn: đang giao \(sale · \d\d\/\d\d\)/);
  assert.doesNotMatch(r.note[0], /\(page\)/);
});
