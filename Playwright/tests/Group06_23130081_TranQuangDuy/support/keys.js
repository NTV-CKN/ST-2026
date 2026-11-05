'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { exec, one } = require('./db');
const { KEYS_FILE, STATE_DIR } = require('./config');

function generatePair(algorithm) {
  const pair = algorithm === 'DSA'
    ? crypto.generateKeyPairSync('dsa', { modulusLength: 2048, divisorLength: 256 })
    : crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

  return {
    algorithm,
    publicKeyBase64: pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKeyPem: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

/**
 * Server băm formatData một lần (SHA-256 hex) rồi verify bằng SHA256withRSA/DSA
 * trên chính 32 byte digest; vì vậy Node ký `crypto.sign('sha256', digestBytes)`
 * sẽ tạo ra chữ ký mà VerifySignature chấp nhận.
 */
function signHash(hashHex, privateKeyPem) {
  return crypto.sign('sha256', Buffer.from(hashHex, 'hex'), privateKeyPem).toString('base64');
}

function readState() {
  if (!fs.existsSync(KEYS_FILE)) return {};
  return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
}

function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(KEYS_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function saveEntry(alias, entry) {
  const state = readState();
  state[alias] = entry;
  writeState(state);
}

function getEntry(alias) {
  return readState()[alias] || null;
}

async function insertKey(userId, { keyName, algorithm = 'RSA', status = 'ACTIVE', pair = null }) {
  const material = pair || generatePair(algorithm);
  const result = await exec(
    `INSERT INTO user_keys (user_id, key_name, name_algorithm, public_key, status, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
    [userId, keyName, algorithm, material.publicKeyBase64, status, status === 'REVOKED' ? new Date() : null],
  );

  return {
    id: result.insertId,
    keyName,
    algorithm,
    status,
    publicKeyBase64: material.publicKeyBase64,
    privateKeyPem: material.privateKeyPem,
  };
}

async function resetKeys(userId) {
  await exec(
    'DELETE FROM key_revoke_requests WHERE user_key_id IN (SELECT id FROM user_keys WHERE user_id = ?)',
    [userId],
  );
  await exec('DELETE FROM user_keys WHERE user_id = ?', [userId]);
}

async function findActive(userId) {
  return one(
    `SELECT id, key_name, name_algorithm, status FROM user_keys
      WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
    [userId],
  );
}

async function activeKeyRow(userId) {
  return one(
    `SELECT id, user_id, key_name, name_algorithm, public_key, status, created_at, revoked_at
       FROM user_keys WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
    [userId],
  );
}

/**
 * Bảo đảm tài khoản có khóa ACTIVE kèm private key dùng được.
 * Ưu tiên khóa do 4.1 tạo (state/keys.json) để 4.3 không phá dữ liệu bàn giao.
 */
async function ensureActiveKey(alias, userId, { keyName = 'Khóa RSA số 2', algorithm = 'RSA' } = {}) {
  const entry = getEntry(alias);
  if (entry) {
    const row = await one('SELECT id, status FROM user_keys WHERE id = ? AND user_id = ?', [entry.id, userId]);
    if (row && row.status === 'ACTIVE') return entry;
  }

  await resetKeys(userId);
  const created = await insertKey(userId, { keyName, algorithm });
  saveEntry(alias, created);
  return created;
}

/** 4.3 cần một khóa đã REVOKED của A để kiểm thử userKeyId không còn ACTIVE. */
async function ensureRevokedKey(userId) {
  const existing = await one(
    "SELECT id FROM user_keys WHERE user_id = ? AND status = 'REVOKED' ORDER BY id DESC LIMIT 1",
    [userId],
  );
  if (existing) return existing.id;

  const created = await insertKey(userId, { keyName: 'Khóa RSA số 1', algorithm: 'RSA', status: 'REVOKED' });
  await exec(
    "UPDATE user_keys SET status = 'REVOKED', revoked_at = NOW() WHERE id = ?",
    [created.id],
  );
  return created.id;
}

async function keyByName(userId, keyName) {
  return one(
    'SELECT id, key_name, name_algorithm, status, created_at, revoked_at FROM user_keys WHERE user_id = ? AND key_name = ? ORDER BY id DESC LIMIT 1',
    [userId, keyName],
  );
}

async function activeCount(userId) {
  const row = await one(
    "SELECT COUNT(*) AS total FROM user_keys WHERE user_id = ? AND status = 'ACTIVE'",
    [userId],
  );
  return row.total;
}

async function revokeRequestCount(userKeyId) {
  const row = await one(
    'SELECT COUNT(*) AS total FROM key_revoke_requests WHERE user_key_id = ?',
    [userKeyId],
  );
  return row.total;
}

async function latestRevokeRequest(userKeyId) {
  return one(
    `SELECT id, user_key_id, token, expired_at, is_completed + 0 AS completed
       FROM key_revoke_requests WHERE user_key_id = ? ORDER BY id DESC LIMIT 1`,
    [userKeyId],
  );
}

function writePublicKeyFile(name, content) {
  const directory = path.join(STATE_DIR, 'files');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, name);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

module.exports = {
  generatePair,
  signHash,
  insertKey,
  resetKeys,
  findActive,
  activeKeyRow,
  ensureActiveKey,
  ensureRevokedKey,
  keyByName,
  activeCount,
  revokeRequestCount,
  latestRevokeRequest,
  saveEntry,
  getEntry,
  writePublicKeyFile,
};
