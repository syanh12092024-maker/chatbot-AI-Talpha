#!/usr/bin/env bash
# Read-only host inventory; never print .env values, connection strings or chat logs.
set -eu
cd "${APP_DIR:-/opt/aicloser}"
node --version
command -v pg_dump || true
systemctl show aicloser aicloser-v3 aicloser-worker-v3 -p ActiveState -p SubState -p ExecMainStatus -p DropInPaths
printf '\nTracked changes: '
git diff --name-only | wc -l
printf 'Release: '
git rev-parse --short HEAD
node --input-type=module <<'JS'
import fs from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';
const e=dotenv.parse(fs.readFileSync('.env'));
const required=['DATABASE_URL_V3','V3_KHOA_VE','V3_KHOA_MA_HOA','APP_SECRET','VERIFY_TOKEN','ADMIN_USER','ADMIN_PASS','ANTHROPIC_API_KEY','KIMI_API_KEY'];
console.log(JSON.stringify({configured:Object.fromEntries(required.map(k=>[k,Boolean(e[k])])),
 flags:Object.fromEntries(['PANCAKE_READONLY','V3_PANCAKE_GUI','V3_POS_GHI','V3_RAP_PROMPT_BAT','PORT','CHAYTHAT_CONG'].map(k=>[k,e[k]||'(unset)'])),
 allowedPages:(e.V3_PAGE_XU_LY||'').split(/[,\s]+/).filter(Boolean).length,
 nodeOptionsConfigured:!!e.NODE_OPTIONS},null,2));
if(e.DATABASE_URL_V3){const p=new pg.Pool({connectionString:e.DATABASE_URL_V3,connectionTimeoutMillis:5000});
 try{console.log('Database:',(await p.query('SELECT current_database() AS name,current_setting(\'server_version\') AS version')).rows[0]);
 console.log('Migrations:',(await p.query('SELECT ma FROM _migrations ORDER BY ma')).rows.map(r=>r.ma));
 console.log('Counts:',(await p.query('SELECT (SELECT count(*) FROM nguoi_dung) AS users,(SELECT count(*) FROM page) AS pages')).rows[0]);
 }catch(error){console.log('Database check failed:',error.code||error.name);process.exitCode=1;}finally{await p.end();}}
const logfile='/var/log/aicloser.log';
if(fs.existsSync(logfile)){const fd=fs.openSync(logfile,'r');const size=fs.fstatSync(fd).size;const b=Buffer.alloc(Math.min(size,16384));fs.readSync(fd,b,0,b.length,size-b.length);fs.closeSync(fd);
 const lines=b.toString().split('\n').filter(l=>/bad option|not allowed in NODE_OPTIONS|SyntaxError|MODULE_NOT_FOUND|ERR_MODULE|Cannot find module/.test(l));
 console.log('Startup errors:',lines.slice(-5).map(l=>l.replace(/https?:\/\/\S+/g,'[url]').slice(0,250)));}
JS
