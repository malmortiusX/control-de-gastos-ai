/**
 * Script para crear el primer usuario administrador.
 *
 * Uso:
 *   node scripts/create-user.js
 *   node scripts/create-user.js --username juan --password miClave123 --family "Familia García"
 *
 * Si no se pasan argumentos, usa los valores por defecto:
 *   usuario: admin | contraseña: admin123 | familia: Mi Familia
 */

import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import crypto from 'crypto';
import { promisify } from 'util';

// ── Leer argumentos de línea de comandos ─────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const USERNAME    = get('--username', 'admin');
const PASSWORD    = get('--password', 'admin123');
const FAMILY_NAME = get('--family',   'Mi Familia');

// ── Hash de contraseña (mismo algoritmo que server.js) ───────────────────────
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key  = await scryptAsync(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = await createConnection({
    host:     process.env.DB_SERVER,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // 1. Verificar que el usuario no exista ya
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ?', [USERNAME]
    );
    if (existing.length > 0) {
      console.log(`⚠️  El usuario "${USERNAME}" ya existe. No se creó nada.`);
      return;
    }

    // 2. Buscar o crear la familia
    let familyId;
    const [families] = await db.query(
      'SELECT id FROM families WHERE name = ?', [FAMILY_NAME]
    );

    if (families.length > 0) {
      familyId = families[0].id;
      console.log(`ℹ️  Familia existente: "${FAMILY_NAME}" (${familyId})`);
    } else {
      familyId = crypto.randomUUID();
      await db.execute(
        'INSERT INTO families (id, name) VALUES (?, ?)', [familyId, FAMILY_NAME]
      );
      console.log(`✅ Familia creada: "${FAMILY_NAME}" (${familyId})`);
    }

    // 3. Crear el usuario
    const userId       = crypto.randomUUID();
    const passwordHash = await hashPassword(PASSWORD);

    await db.execute(
      'INSERT INTO users (id, username, password_hash, family_id) VALUES (?, ?, ?, ?)',
      [userId, USERNAME, passwordHash, familyId]
    );

    console.log(`
╔══════════════════════════════════════════════╗
║           USUARIO CREADO EXITOSAMENTE        ║
╠══════════════════════════════════════════════╣
║  Familia  : ${FAMILY_NAME.padEnd(30)} ║
║  Usuario  : ${USERNAME.padEnd(30)} ║
║  Contraseña: ${PASSWORD.padEnd(29)} ║
╚══════════════════════════════════════════════╝
    `);
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
