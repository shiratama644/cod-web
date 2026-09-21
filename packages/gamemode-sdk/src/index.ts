/**
 * gamemode-sdk — L1 facade for gamemodes/*.
 *
 * architecture.md 理想: gamemodes/* は gamemode-sdk のみ import 許可。
 * gamemode-api は L1 core、gamemode-sdk は facade (2026-09-22 ユーザー確認 both)。
 *
 * 将来 UGC 向け sanitized API をここに追加する。
 */

export * from '@cod/gamemode-api';

// 追加ヘルパー (将来 UGC 向け)
export const SDK_VERSION = '0.1.0';
