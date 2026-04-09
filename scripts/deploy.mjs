// ConoHa WING FTPS デプロイスクリプト
//
// 使い方: npm run deploy
//   1. npm run build で dist/ を生成
//   2. このスクリプトが安全な順序でデプロイ:
//      a. dist/ の中身をアップロード（既存ファイルは上書き）
//      b. リモート assets/ にあってローカルにないものを削除（古いハッシュ付きファイル掃除）
//   → ダウンタイムなし、古いファイルも蓄積しない
//
// 必要な環境変数 (.env):
//   FTP_HOST, FTP_PORT, FTP_USER, FTP_PASSWORD, FTP_REMOTE_DIR
//
// 起動: node --env-file=.env scripts/deploy.mjs

import * as ftp from 'basic-ftp';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, join, posix } from 'node:path';

const required = ['FTP_HOST', 'FTP_PORT', 'FTP_USER', 'FTP_PASSWORD', 'FTP_REMOTE_DIR'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ 環境変数が不足しています:', missing.join(', '));
  console.error('   .env ファイルを作成し、.env.example を参考に値を設定してください。');
  process.exit(1);
}

const localDir = resolve(process.cwd(), 'dist');
if (!existsSync(localDir) || !statSync(localDir).isDirectory()) {
  console.error('❌ dist/ が存在しません。先に npm run build を実行してください。');
  process.exit(1);
}

const remoteDir = process.env.FTP_REMOTE_DIR.replace(/\/+$/, '') + '/';

/** ローカルディレクトリ配下の全ファイルを再帰列挙（dist/からの相対パス、posix形式） */
function listLocalFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listLocalFiles(full, base));
    } else {
      const rel = full.slice(base.length + 1).replace(/\\/g, '/');
      out.push(rel);
    }
  }
  return out;
}

const client = new ftp.Client(30_000);
client.ftp.verbose = false;

console.log(`📡 ${process.env.FTP_HOST}:${process.env.FTP_PORT} に FTPS で接続中...`);

try {
  await client.access({
    host: process.env.FTP_HOST,
    port: Number(process.env.FTP_PORT),
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: true, // Explicit FTPS (AUTH TLS)
    secureOptions: { rejectUnauthorized: false }, // ConoHa の証明書互換性のため
  });
  console.log('✅ 接続成功');

  // -------- Step 1: ローカルから dist/ 全ファイル名を取得 --------
  const localFiles = listLocalFiles(localDir);
  const localAssetSet = new Set(
    localFiles.filter((f) => f.startsWith('assets/')).map((f) => f.replace('assets/', '')),
  );
  console.log(`📦 ローカル ${localFiles.length} ファイルを検出`);

  // -------- Step 2: dist/ をリモートに再帰アップロード --------
  console.log(`📤 ${remoteDir} にアップロード中...`);
  client.trackProgress((info) => {
    if (info.name) {
      console.log(`   → ${info.name}`);
    }
  });
  await client.ensureDir(remoteDir);
  await client.uploadFromDir(localDir);
  client.trackProgress();

  // -------- Step 3: リモート assets/ の古いファイルを削除 --------
  try {
    await client.cd(posix.join(remoteDir, 'assets'));
    const remoteList = await client.list();
    const stale = remoteList.filter((e) => e.isFile && !localAssetSet.has(e.name));

    if (stale.length > 0) {
      console.log(`🗑  古いファイルを削除中（${stale.length}件）...`);
      for (const entry of stale) {
        await client.remove(entry.name);
        console.log(`   ✕ assets/${entry.name}`);
      }
    } else {
      console.log('🗑  古いファイルなし');
    }
  } catch (e) {
    console.log(`⚠️  assets/ 同期スキップ: ${e.message}`);
  }

  console.log('✅ デプロイ完了');
} catch (err) {
  console.error('❌ デプロイ失敗:', err.message);
  process.exit(1);
} finally {
  client.close();
}
