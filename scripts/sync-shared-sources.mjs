#!/usr/bin/env node
/**
 * sync-shared-sources
 *
 * 各プロジェクトの data-sources.json を読み、products/_shared/data/sources/<key>/
 * から自身の src/data/sources/<key>/ へ正本ファイルをコピーする。
 *
 * 想定: prebuild フックから呼ばれる。
 *
 *   "scripts": { "prebuild": "node ../_template/scripts/sync-shared-sources.mjs" }
 *
 * _shared が見つからない場合は warn を出してキャッシュ済み(=既にコピー済み)を使う。
 * これにより単独cloneでもビルドは止まらない。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = process.cwd();
const manifestPath = join(projectRoot, 'data-sources.json');

if (!existsSync(manifestPath)) {
  // このプロジェクトは共有データを使っていない
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const requestedKeys = manifest.sources ?? [];

// _shared の場所を解決: 既定は projectRoot の親 (= products/) 配下の _shared
// 環境変数 SHARED_SOURCES_ROOT で上書き可能
const sharedRoot = process.env.SHARED_SOURCES_ROOT
  ? resolve(process.env.SHARED_SOURCES_ROOT)
  : resolve(projectRoot, '..', '_shared', 'data', 'sources');

const cacheRoot = join(projectRoot, 'src', 'data', 'sources');

const sharedExists = existsSync(sharedRoot);
if (!sharedExists) {
  // フォールバック: 既存キャッシュがあればそのまま使う
  let allCached = true;
  for (const key of requestedKeys) {
    if (!existsSync(join(cacheRoot, key))) {
      allCached = false;
      break;
    }
  }
  if (allCached && requestedKeys.length > 0) {
    console.warn(`[sync-shared-sources] _shared not found at ${sharedRoot}. Using cached copies in ${cacheRoot}.`);
    process.exit(0);
  }
  console.error(`[sync-shared-sources] _shared not found at ${sharedRoot} and no cache available for: ${requestedKeys.join(', ')}`);
  process.exit(1);
}

function copyFiles(srcDir, destDir, fileList) {
  mkdirSync(destDir, { recursive: true });
  for (const f of fileList) {
    const from = join(srcDir, f);
    const to = join(destDir, f);
    if (!existsSync(from)) {
      console.error(`[sync-shared-sources] missing file in shared source: ${from}`);
      process.exit(1);
    }
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }
}

let copied = 0;
for (const key of requestedKeys) {
  const srcDir = join(sharedRoot, key);
  const destDir = join(cacheRoot, key);
  const sourceJsonPath = join(srcDir, 'source.json');
  if (!existsSync(sourceJsonPath)) {
    console.error(`[sync-shared-sources] shared source not found: ${key} (${sourceJsonPath})`);
    process.exit(1);
  }
  const sourceJson = JSON.parse(readFileSync(sourceJsonPath, 'utf8'));
  const files = ['source.json', ...(sourceJson.files ?? [])];
  copyFiles(srcDir, destDir, files);
  copied++;
}

console.log(`[sync-shared-sources] synced ${copied} source(s) from ${sharedRoot} → ${cacheRoot}`);
