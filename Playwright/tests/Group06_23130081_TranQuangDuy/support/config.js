'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Nạp .env nếu có, không cần thêm dependency.
const envFile = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFile);
  } else {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/pkcn';

// Giới hạn chờ phản hồi ở các bước server gửi email đồng bộ (EmailUtils/SMTP).
const SLOW_CALL_TIMEOUT_MS = Number(process.env.SLOW_CALL_TIMEOUT_MS || 15000);

module.exports = {
  BASE_URL,
  SLOW_CALL_TIMEOUT_MS,
  ADMIN: {
    username: process.env.ADMIN_USER || '',
    password: process.env.ADMIN_PASS || '',
  },
  DB: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'phu_kien_cong_nghe',
  },
  STATE_DIR: path.resolve(__dirname, '..', 'state'),
  SEED_FILE: path.resolve(__dirname, '..', 'state', 'seed.json'),
  KEYS_FILE: path.resolve(__dirname, '..', 'state', 'keys.json'),
  ORDERS_FILE: path.resolve(__dirname, '..', 'state', 'orders.json'),
  AUTH_DIR: path.resolve(__dirname, '..', 'state', 'auth'),
};
