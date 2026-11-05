'use strict';

const mysql = require('mysql2/promise');
const { DB } = require('./config');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...DB,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
      dateStrings: true,
      timezone: 'local',
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function exec(sql, params = []) {
  const [result] = await getPool().query(sql, params);
  return result;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { query, one, exec, closePool };
