// Isolated dev checkout: fresh database + JSON files, never reset an existing database.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const home = path.join(root, '.local-dev');
const stateFile = path.join(home, 'current.json');
const action = process.argv[2] || 'start';
fs.mkdirSync(home, { recursive: true, mode: 0o700 });
const readState = () => JSON.parse(fs.readFileSync(stateFile, 'utf8'));

// Bản dev là bản CHÉP của mã nguồn, không phải liên kết. Nên sửa mã trong repo rồi khởi
// động lại instance là chạy MÃ CŨ — lỗi im lặng, và đã cắn nhiều lần: cổng vẫn mở, log vẫn
// sạch, chỉ hành vi là của hôm qua. `start` vì thế luôn chép lại trước khi chạy.
const chepNguon = (dir) => {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' }).split('\0');
  const allowed = new Set(['src', 'v3', 'db', 'public', 'ops']);
  let n = 0;
  for (const rel of new Set(files)) {
    if (!rel || !(allowed.has(rel.split('/')[0]) || ['package.json', 'package-lock.json'].includes(rel))) continue;
    const from = path.join(root, rel), to = path.join(dir, rel);
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    n += 1;
  }
  return n;
};

if (action === 'new') {
  const source = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
  const url = new URL(source.DATABASE_URL_V3);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('Chỉ tạo database trên PostgreSQL local.');
  const name = 'aicloser_dev_' + Date.now();
  const dir = path.join(home, name);
  fs.mkdirSync(dir, { mode: 0o700 });
  chepNguon(dir);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
  const admin = new pg.Pool({ connectionString: adminUrl.toString(), connectionTimeoutMillis:5000 });
  try { await admin.query('CREATE DATABASE ' + name); } finally { await admin.end(); }
  url.pathname = '/' + name;
  const password = crypto.randomBytes(12).toString('base64url');
  const env = {
    NODE_ENV:'development', HOST:'127.0.0.1', PORT:'3200', CHAYTHAT_CONG:'3202',
    DATABASE_URL_V3:url.toString(), V3_KHOA_VE:crypto.randomBytes(32).toString('hex'),
    V3_KHOA_MA_HOA:crypto.randomBytes(32).toString('hex'),
    ADMIN_USER:'local-admin', ADMIN_PASS:crypto.randomBytes(24).toString('hex'),
    DEV_CONFIG_ONLY:'1', META_WEBHOOK_OFF:'1', PANCAKE_READONLY:'1', V3_PANCAKE_GUI:'0',
    V3_POS_GHI:'0', V3_WA_GUI:'0', V3_LEGACY_POLL_OFF:'1', V3_PAGE_XU_LY:'',
    V3_RAP_PROMPT_BAT:'1', V3_BOT_V1_GOC:'http://127.0.0.1:3200',
    KB_PATH:path.join(dir,'empty-knowledge.xlsx'),
  };
  fs.writeFileSync(path.join(dir,'.env'),Object.entries(env).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
  const pool = new pg.Pool({connectionString:url.toString()});
  try {
    const {len} = await import('../../db/migrate.js'); await len(pool,{im:true});
    const {bam} = await import('../../v3/src/auth/index.js');
    const user = (await pool.query('INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$2,$3) RETURNING id',['admin@local.test','Local Admin',await bam(password)])).rows[0];
    await pool.query("UPDATE team SET ten='Local Dev' WHERE slug='tieu-alpha'");
    await pool.query("INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT t.id,$1,v.id FROM team t CROSS JOIN vai v WHERE t.slug='tieu-alpha' AND v.ma='quan-tri'",[user.id]);
  } finally { await pool.end(); }
  fs.writeFileSync(path.join(dir,'login.json'),JSON.stringify({email:'admin@local.test',password}),{mode:0o600});
  fs.writeFileSync(stateFile,JSON.stringify({dir,name}),{mode:0o600});
  console.log('Đã tạo dev sạch:',name,'; tài khoản trong .local-dev/<database>/login.json');
} else if (action === 'stop') {
  // DỪNG THEO CỔNG, KHÔNG THEO TÊN TIẾN TRÌNH.
  //
  // `pkill -f "local-dev.mjs start"` chỉ giết tiến trình CHA; hai tiến trình con có dòng
  // lệnh `node --env-file=.env src/server.js` và `v3/chay-that.js` — không mang tên bản dev
  // nào cả, nên chúng sống sót và giữ cổng. Lượt khởi động kế tiếp chết vì EADDRINUSE, rồi
  // cổng vẫn trả 200 từ mã CŨ: nhìn như «đã restart» mà bản vá không vào. Đã vấp ba lần
  // trong một buổi chiều (17/09) nên cửa dừng phải nhắm đúng thứ giữ cổng.
  const congs = [3200, Number(process.env.CHAYTHAT_CONG) || 3202];
  const dangGiu = (cong) => {
    try {
      return execFileSync('lsof', ['-ti', `tcp:${cong}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
        .split('\n').map((x) => x.trim()).filter(Boolean).map(Number);
    } catch { return []; }
  };
  const nghi = (ms) => new Promise((r) => setTimeout(r, ms));
  let da = 0;
  for (const cong of congs) {
    for (const pid of dangGiu(cong)) { try { process.kill(pid, 'SIGTERM'); da++; } catch { /* đã chết */ } }
  }
  // ESCALATE. `src/server.js` không có bộ bắt SIGTERM nào đóng `app.listen`, nên nó SỐNG
  // SÓT qua SIGTERM và tiếp tục giữ cổng 3200 — đo 17/09: lệnh dừng in «đã dừng» mà tiến
  // trình cũ vẫn chạy, lượt start kế tiếp chết vì EADDRINUSE rồi cổng vẫn trả 200 từ mã CŨ.
  // Một lệnh dừng mà không dừng thật thì tệ hơn không có lệnh dừng.
  await nghi(1500);
  for (const cong of congs) {
    const con = dangGiu(cong);
    for (const pid of con) { try { process.kill(pid, 'SIGKILL'); console.log(`pid ${pid} không chịu SIGTERM → SIGKILL (cổng ${cong})`); } catch { /* đã chết */ } }
  }
  await nghi(300);
  const conLai = congs.flatMap((c) => dangGiu(c));
  if (conLai.length) throw Error(`Vẫn còn tiến trình giữ cổng: ${conLai.join(', ')}`);
  console.log(da ? `Đã dừng ${da} tiến trình. Cổng 3200/3202 trống.` : 'Không có tiến trình nào đang giữ cổng 3200/3202.');
} else if (action === 'token') {
  // NẠP TOKEN PANCAKE VÀO BẢN DEV MÀ KHÔNG ĐỤNG VAN.
  //
  // Nút «Thêm token» trên màn Kết nối đi qua cửa ghi của v3, mà cửa đó đóng khi
  // `PANCAKE_READONLY=1` (xem `trangThaiCau()` trong `v3/src/noi-day/cau-bot-v1.js`). Đóng là
  // ĐÚNG: máy này chạy song song VPS, mở van ra là khách nhận tin đúp. Nhưng ĐỌC thì không
  // cần cửa — nên token vào bằng `.env`, và mọi đường gửi vẫn bị chặn nguyên.
  //
  // Cũng đừng đặt `PANCAKE_READONLY=0` cho tiện: `assertConfig` (src/config.js) chỉ miễn
  // khoá AI khi cờ này bằng '1', bỏ đi là backend dev không boot nổi vì thiếu ANTHROPIC_API_KEY.
  const token = (process.argv[3] || '').trim();
  if (token.split('.').length !== 3) throw Error('Cần JWT Pancake ba phần a.b.c — dùng: npm run local:token <JWT>');
  let than = {};
  try { than = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { /* token lỗi định dạng — để lượt thử sống bên dưới nói */ }
  const han = (than.exp || 0) * 1000;
  if (han && han <= Date.now()) throw Error(`Token hết hạn ${new Date(han).toLocaleString('vi-VN')} — lấy token mới từ Pancake.`);
  // Thử SỐNG bằng một lượt GET. Nhận token chết vào .env là để dành một lần debug vô nghĩa.
  const res = await fetch(`https://pages.fm/api/v1/pages?access_token=${token}`);
  const j = await res.json().catch(() => ({}));
  if (!j.categorized) throw Error('Pancake từ chối token (HTTP ' + res.status + ') — đăng nhập lại lấy token mới?');
  const state = readState();
  const file = path.join(state.dir, '.env');
  const giu = fs.readFileSync(file, 'utf8').split('\n').filter((d) => d.trim() && !/^PANCAKE_TOKEN=/.test(d));
  fs.writeFileSync(file, [...giu, 'PANCAKE_TOKEN=' + JSON.stringify(token)].join('\n') + '\n', { mode: 0o600 });
  console.log(`Đã ghi PANCAKE_TOKEN vào ${path.relative(root, file)}`);
  console.log(`  tài khoản : ${than.name || than.fb_name || '?'}`);
  console.log(`  page đọc được: ${(j.categorized.activated || []).length}`);
  console.log(`  hết hạn   : ${han ? new Date(han).toLocaleString('vi-VN') : 'không ghi hạn'}`);
  console.log('Khởi động lại (Ctrl-C rồi `npm run local:start`) để bot nạp token. Van gửi VẪN đóng.');
} else if (action === 'sync') {
  const state = readState();
  console.log(`Đã chép lại ${chepNguon(state.dir)} tệp mã nguồn vào ${state.name}.`);
  console.log('Khởi động lại (`npm run local:stop` rồi `npm run local:start`) để nạp.');
} else if (action === 'start') {
  const state = readState();
  console.log(`Đồng bộ mã nguồn: ${chepNguon(state.dir)} tệp.`);
  const clean = { PATH:process.env.PATH, HOME:process.env.HOME, TMPDIR:process.env.TMPDIR };
  // Keep this command running; Ctrl-C stops both processes. No worker in configure mode.
  const children = [];
  for (const [name,entry] of [['backend','src/server.js'],['ui','v3/chay-that.js']]) {
    const fd = fs.openSync(path.join(state.dir,name+'.log'),'a',0o600);
    const child = spawn(process.execPath,['--env-file=.env',entry],{cwd:state.dir,env:clean,stdio:['ignore',fd,fd]});
    children.push(child); fs.closeSync(fd);
    child.on('exit',()=>{for(const other of children) if(other!==child) other.kill();});
  }
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>children.forEach(c=>c.kill(signal)));
  console.log('Local dev: http://127.0.0.1:3202/dang-nhap — Ctrl-C để dừng.');
} else throw Error('Dùng new, start, sync, stop hoặc token');
