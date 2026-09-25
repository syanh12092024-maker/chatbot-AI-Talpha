import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import express from 'express';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { config } from '../src/config.js';
import { taoWebhookHandler } from '../src/queue/webhook.js';
import { chayMotVong } from '../src/queue/worker.js';
import { layModel } from '../src/chat/model.js';
import { goiMotLan } from '../v3/src/model/goi-mot-lan.js';

// Real HTTP ingress, PostgreSQL migrations, KB, model routing/provider adapter,
// closer, classifier, guard, worker and send ledger. External services are local
// HTTP fixtures: this verifies wiring, NOT real model quality or Meta delivery.
test('E2E: configuration → signed webhook → two advice turns → handoff → AI stops', async t => {
  const savedEnv = { ...process.env };
  const oldSecret = config.appSecret;
  Object.assign(process.env, {
    V3_RAP_PROMPT_BAT: '1', V3_PAGE_XU_LY: 'e2e-journey',
    V3_KHOA_MA_HOA: 'a'.repeat(64), PK_MARK_UNREAD: '0',
    PANCAKE_READONLY: '1', V3_DIEN_TAP: '0',
  });
  config.appSecret = 'e2e-only-webhook-secret';
  let sb, server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await sb?.don();
    config.appSecret = oldSecret;
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  });
  sb = await dungSandbox('journey_chat');
  const { pool } = sb;
  const one = async (sql, args = []) => (await pool.query(sql, args)).rows[0];
  const team = (await one("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  const page = (await one(`INSERT INTO page(team_id,page_id,ten,nguon_tin,v3_ai_bat)
    VALUES($1,'e2e-journey','E2E only','webhook',true) RETURNING id`, [team])).id;
  const product = (await one(`INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta)
    VALUES($1,$2,'TEST:WATCH','Adjustable watch','Fits wrists from 14 to 20 cm. COD available.') RETURNING id`, [team, page])).id;
  await pool.query(`INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te)
    VALUES($1,$2,1,10900,'SAR')`, [team, product]);
  await pool.query(`INSERT INTO kich_ban(team_id,page_id,phien_ban,trang_thai,noi_dung_nguoi,noi_dung_may)
    VALUES($1,$2,1,'LIVE',$3,'E2E approved script')`, [team, page,
    JSON.stringify({ persona: 'Friendly watch seller. Answer all customer questions using known facts.' })]);
  await pool.query(`INSERT INTO cau_hinh_model(team_id,vai_tro,nha_cung_cap,ma_model,do_ngau_nhien)
    VALUES($1,'chinh','deepseek','deepseek-v4-flash',0.2)`, [team]);
  await pool.query(`INSERT INTO khoa_nha(team_id,nha_cung_cap,khoa_api_ma)
    VALUES($1,'deepseek',$2)`, [team, maHoa('e2e-fake-provider-key')]);

  const history = [], modelRequests = [], deliveries = [], notes = [];
  const replies = [
    'One watch is 109 SAR and fits wrists from 14 to 20 cm. What is your wrist measurement?',
    'Yes, a 15 cm wrist is within the supported range. Would you like one watch with payment on delivery?',
  ];
  const app = express();
  app.use(express.json({ verify(req, _res, buffer) { req.rawBody = buffer; } }));
  app.post('/webhook', taoWebhookHandler({ layPool: () => pool }));
  app.post('/v1/chat/completions', (req, res) => {
    modelRequests.push(req.body);
    const reply = replies[modelRequests.length - 1];
    if (!reply) return res.status(500).json({ error: { message: 'Unexpected extra model call' } });
    res.json({ id: `model-${modelRequests.length}`, choices: [{ index: 0,
      message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 25 } });
  });
  app.get('/conversations', (_req, res) => res.json([
    { id: 'e2e-conversation', from_psid: 'e2e-customer', customers: [{ id: 'e2e-customer-id' }] },
  ]));
  app.get('/history', (_req, res) => res.json(history));
  app.post('/send', (req, res) => {
    deliveries.push(req.body);
    const id = `reply-${deliveries.length}`;
    history.push({ id, from: { id: 'e2e-journey' }, message: req.body.text,
      inserted_at: new Date().toISOString() });
    res.json({ ok: true, id });
  });
  app.post('/note', (req, res) => { notes.push(req.body); res.json({ ok: true, id: 'note-1' }); });
  app.post('/tag', (_req, res) => res.json({ ok: true, id: 'tag-1' }));
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const localFetch = (url, opts) => {
    assert.equal(new URL(url).origin, base, 'All fixture requests must stay on loopback');
    return fetch(url, opts);
  };
  const post = async (path, body) => (await localFetch(base + path, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
  const deps = {
    docHoiThoai: async () => (await localFetch(base + '/conversations')).json(),
    docTin: async () => (await localFetch(base + '/history')).json(),
    layModel: (db, ctx) => layModel(db, ctx, {
      goi: args => goiMotLan({ ...args, baseUrl: base, fetchFn: localFetch }),
    }),
    cua: {
      guiTin: (_db, _ctx, data) => post('/send', data),
      ghiNote: (_db, _ctx, data) => post('/note', data),
      gatThe: (_db, _ctx, data) => post('/tag', data),
      guiAnh: () => assert.fail('This text-only scenario should not send images'),
    },
  };
  async function webhook(id, text, valid = true) {
    const body = JSON.stringify({ object: 'page', entry: [{ id: 'e2e-journey', messaging: [
      { sender: { id: 'e2e-customer' }, message: { mid: id, text } },
    ] }] });
    const signature = 'sha256=' + createHmac('sha256', config.appSecret).update(body).digest('hex');
    return localFetch(base + '/webhook', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'x-hub-signature-256': valid ? signature : 'sha256=invalid',
    }, body });
  }
  async function turn(id, text) {
    history.push({ id, from: { id: 'e2e-customer' }, message: text, inserted_at: new Date().toISOString() });
    assert.equal((await webhook(id, text)).status, 200);
    const result = await chayMotVong(pool, deps);
    assert.equal(result?.ketQua, 'xong', JSON.stringify(result));
    assert.equal((await one('SELECT trang_thai FROM tin_cho_xu_ly WHERE id=$1', [result.tinId])).trang_thai, 'xong');
    return result;
  }

  assert.equal((await webhook('invalid', 'hello', false)).status, 403);
  assert.equal((await one('SELECT count(*)::int n FROM tin_cho_xu_ly')).n, 0);
  t.diagnostic('1. Migrated isolated DB; configured Page, product, SAR price, LIVE script and encrypted team model key.');
  await turn('customer-1', 'How much is the watch and does it fit small wrists?');
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].text, replies[0]);
  assert.equal(deliveries[0].convId, 'e2e-conversation');
  assert.equal(modelRequests[0].model, 'deepseek-v4-flash');
  assert.match(JSON.stringify(modelRequests[0].messages), /109/);
  assert.match(JSON.stringify(modelRequests[0].messages), /14 to 20/);
  t.diagnostic('2. Valid signed HTTP webhook → durable queue → real KB/closer/provider adapter/guard → mock channel received price + size advice.');
  assert.equal((await webhook('customer-1', 'How much is the watch and does it fit small wrists?')).status, 200);
  assert.equal(await chayMotVong(pool, deps), null);
  assert.equal(deliveries.length, 1, 'Repeated webhook must not send twice');
  await turn('customer-2', 'My wrist is 15 cm and my phone is 0551234567. Will it fit?');
  assert.equal(deliveries[1].text, replies[1]);
  assert.match(JSON.stringify(modelRequests[1].messages), /109 SAR/);
  const conversation = await one('SELECT * FROM hoi_thoai WHERE page_id=$1', [page]);
  assert.equal(conversation.ho_so.phone, '0551234567');
  assert.equal(conversation.ai_noi_gi, replies[1]);
  assert.equal((await one("SELECT count(*)::int n FROM lan_gui WHERE loai='guiTin' AND trang_thai='da_gui'")).n, 2);
  assert.equal((await one("SELECT count(*)::int n FROM so_ai WHERE ma_model='deepseek-v4-flash'")).n, 2);
  t.diagnostic('3. Second turn remembers earlier advice, saves phone/profile and confirms two replies in the durable send ledger.');
  await turn('customer-3', 'My previous order was damaged. I want a refund.');
  const handed = await one('SELECT chu_so_huu,trang_thai FROM hoi_thoai WHERE page_id=$1', [page]);
  assert.equal(handed.chu_so_huu, 'SALE');
  assert.equal(handed.trang_thai, 'HANDOFF');
  assert.equal(notes.length, 1);
  assert.equal(deliveries.length, 2, 'Silent handoff must not pretend a human has answered');
  assert.equal(modelRequests.length, 2);
  assert.equal((await webhook('customer-4', 'Please help with that order.')).status, 200);
  const stopped = await chayMotVong(pool, deps);
  assert.equal(stopped.ketQua, 'chan_guard');
  assert.equal(deliveries.length, 2);
  assert.equal(modelRequests.length, 2);
  t.diagnostic('4. Complaint → handoff note + SALE/HANDOFF; next message does not call AI or send another reply.');
});
