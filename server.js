import 'dotenv/config';
import express from 'express';
import { createConnection, createPool } from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { promisify } from 'util';

const app = express();

// Configuración de Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de la conexión MySQL
const dbConfig = {
  host: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const JWT_SECRET = process.env.JWT_SECRET || 'gastowise_jwt_secret_2024';
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 3600; // 7 días

let pool;

// ─────────────────────────────────────────────
//  UTILIDADES: JWT (sin dependencias externas)
// ─────────────────────────────────────────────

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS,
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token malformado');
  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expectedSig) throw new Error('Firma inválida');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expirado');
  return payload;
}

// ─────────────────────────────────────────────
//  UTILIDADES: Contraseñas (scrypt nativo)
// ─────────────────────────────────────────────

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derivedKey = await scryptAsync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, 'hex');
  return crypto.timingSafeEqual(derivedKey, hashBuffer);
}

// ─────────────────────────────────────────────
//  MIDDLEWARE DE AUTENTICACIÓN
// ─────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: token requerido' });
  }
  const token = authHeader.substring(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: `No autorizado: ${err.message}` });
  }
}

// ─────────────────────────────────────────────
//  INICIALIZACIÓN DE BASE DE DATOS
// ─────────────────────────────────────────────

async function initDb() {
  try {
    const connection = await createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    pool = createPool(dbConfig);

    // Tabla: familias
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS families (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla: usuarios
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        family_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id)
      )
    `);

    // Tabla: categorías (con family_id)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        subCategories TEXT NOT NULL,
        family_id VARCHAR(50) NOT NULL DEFAULT ''
      )
    `);

    // Tabla: gastos (con family_id)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        amount DECIMAL(12, 2) NOT NULL,
        categoryId VARCHAR(50),
        categoryName VARCHAR(100),
        subCategory VARCHAR(100),
        description TEXT,
        date DATE NOT NULL,
        family_id VARCHAR(50) NOT NULL DEFAULT ''
      )
    `);

    // ── Migración: agregar family_id a tablas existentes ──────────────────────
    // MySQL error 1060 (ER_DUP_FIELDNAME) = la columna ya existe → ignorar.
    // Cualquier otro error se relanza para no ocultar problemas reales.

    try {
      await pool.execute("ALTER TABLE categories ADD COLUMN family_id VARCHAR(50) NOT NULL DEFAULT ''");
      console.log('✅ Migración: columna family_id agregada a categories');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      console.log('ℹ️  Migración: family_id ya existe en categories');
    }

    try {
      await pool.execute("ALTER TABLE expenses ADD COLUMN family_id VARCHAR(50) NOT NULL DEFAULT ''");
      console.log('✅ Migración: columna family_id agregada a expenses');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      console.log('ℹ️  Migración: family_id ya existe en expenses');
    }

    // ── Seeding: crear familias y usuarios iniciales si no existen ─────────
    const [familyRows] = await pool.query("SELECT id FROM families LIMIT 1");
    let defaultFamilyId;

    if (familyRows.length === 0) {
      const family1Id = crypto.randomUUID();
      const family2Id = crypto.randomUUID();
      defaultFamilyId = family1Id;

      await pool.execute("INSERT INTO families (id, name) VALUES (?, ?)", [family1Id, 'Mi Familia']);
      await pool.execute("INSERT INTO families (id, name) VALUES (?, ?)", [family2Id, 'Familia 2']);

      const hash1 = await hashPassword('admin123');
      const hash2 = await hashPassword('familia2');

      await pool.execute(
        "INSERT INTO users (id, username, password_hash, family_id) VALUES (?, ?, ?, ?)",
        [crypto.randomUUID(), 'admin', hash1, family1Id]
      );
      await pool.execute(
        "INSERT INTO users (id, username, password_hash, family_id) VALUES (?, ?, ?, ?)",
        [crypto.randomUUID(), 'familia2', hash2, family2Id]
      );

      console.log(`
╔══════════════════════════════════════════════╗
║         USUARIOS CREADOS AUTOMÁTICAMENTE     ║
╠══════════════════════════════════════════════╣
║  Familia: Mi Familia                         ║
║  Usuario: admin      Contraseña: admin123    ║
╠══════════════════════════════════════════════╣
║  Familia: Familia 2                          ║
║  Usuario: familia2   Contraseña: familia2    ║
╚══════════════════════════════════════════════╝
      `);
    } else {
      defaultFamilyId = familyRows[0].id;
    }

    // ── Asignar registros huérfanos (family_id vacío) a la familia por defecto
    // Esto cubre: primera ejecución tras migración Y reinicios posteriores.
    const [orphanCats]  = await pool.query("SELECT COUNT(*) AS c FROM categories WHERE family_id = ''");
    const [orphanExps]  = await pool.query("SELECT COUNT(*) AS c FROM expenses   WHERE family_id = ''");

    if (orphanCats[0].c > 0) {
      await pool.execute("UPDATE categories SET family_id = ? WHERE family_id = ''", [defaultFamilyId]);
      console.log(`✅ Migración: ${orphanCats[0].c} categoría(s) asignada(s) a familia por defecto`);
    }
    if (orphanExps[0].c > 0) {
      await pool.execute("UPDATE expenses SET family_id = ? WHERE family_id = ''", [defaultFamilyId]);
      console.log(`✅ Migración: ${orphanExps[0].c} gasto(s) asignado(s) a familia por defecto`);
    }

    console.log('✅ Conectado a MySQL y tablas verificadas.');
  } catch (err) {
    console.error('Error inicializando MySQL:', err.message);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
//  ENDPOINT PÚBLICO: Health check
// ─────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─────────────────────────────────────────────
//  ENDPOINTS DE AUTENTICACIÓN (públicos)
// ─────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT u.*, f.name as familyName
       FROM users u
       JOIN families f ON u.family_id = f.id
       WHERE u.username = ?`,
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const userRow = rows[0];
    const valid = await verifyPassword(password, userRow.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const user = {
      id: userRow.id,
      username: userRow.username,
      familyId: userRow.family_id,
      familyName: userRow.familyName,
    };
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ─────────────────────────────────────────────
//  ENDPOINTS PARA CATEGORÍAS (protegidos)
// ─────────────────────────────────────────────

app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM categories WHERE family_id = ?",
      [req.user.familyId]
    );
    const categories = rows.map(r => ({
      ...r,
      subCategories: JSON.parse(r.subCategories)
    }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories', authMiddleware, async (req, res) => {
  const categories = req.body;
  const familyId = req.user.familyId;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM categories WHERE family_id = ?", [familyId]);

    if (categories.length > 0) {
      const sql = "INSERT INTO categories (id, name, subCategories, family_id) VALUES ?";
      const values = categories.map(cat => [
        cat.id,
        cat.name,
        JSON.stringify(cat.subCategories),
        familyId
      ]);
      await connection.query(sql, [values]);
    }

    await connection.commit();
    res.json({ message: "Categorías actualizadas" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// ─────────────────────────────────────────────
//  ENDPOINTS PARA GASTOS (protegidos)
// ─────────────────────────────────────────────

app.get('/api/expenses', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM expenses WHERE family_id = ? ORDER BY date DESC",
      [req.user.familyId]
    );
    const formattedRows = rows.map(r => ({
      ...r,
      date: r.date.toISOString().split('T')[0]
    }));
    res.json(formattedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', authMiddleware, async (req, res) => {
  const { id, amount, categoryId, categoryName, subCategory, description, date } = req.body;
  const familyId = req.user.familyId;
  try {
    const sql = `INSERT INTO expenses (id, amount, categoryId, categoryName, subCategory, description, date, family_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await pool.execute(sql, [id, amount, categoryId, categoryName, subCategory, description, date, familyId]);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM expenses WHERE id = ? AND family_id = ?",
      [req.params.id, req.user.familyId]
    );
    res.json({ message: "Gasto eliminado", deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  ENDPOINTS DE ADMINISTRACIÓN (protegidos)
// ─────────────────────────────────────────────

// --- Familias ---

// Listar todas las familias con conteo de usuarios y gastos
app.get('/api/admin/families', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        f.id,
        f.name,
        f.created_at,
        COUNT(DISTINCT u.id)  AS userCount,
        COUNT(DISTINCT e.id)  AS expenseCount
      FROM families f
      LEFT JOIN users    u ON u.family_id = f.id
      LEFT JOIN expenses e ON e.family_id = f.id
      GROUP BY f.id, f.name, f.created_at
      ORDER BY f.created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear nueva familia
app.post('/api/admin/families', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la familia es requerido' });
  }
  try {
    const id = crypto.randomUUID();
    await pool.execute("INSERT INTO families (id, name) VALUES (?, ?)", [id, name.trim()]);
    res.status(201).json({ id, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar familia (solo si no tiene usuarios ni datos)
app.delete('/api/admin/families/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE family_id = ?", [id]);
    if (users[0].c > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: la familia tiene usuarios activos' });
    }
    // Eliminar categorías y gastos huérfanos de la familia
    await pool.execute("DELETE FROM categories WHERE family_id = ?", [id]);
    await pool.execute("DELETE FROM expenses WHERE family_id = ?", [id]);
    const [result] = await pool.execute("DELETE FROM families WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Familia no encontrada' });
    res.json({ message: 'Familia eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Usuarios ---

// Listar todos los usuarios (con nombre de familia)
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.username, u.family_id, u.created_at, f.name AS familyName
      FROM users u
      JOIN families f ON u.family_id = f.id
      ORDER BY f.name ASC, u.username ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear nuevo usuario
app.post('/api/admin/users', authMiddleware, async (req, res) => {
  const { username, password, familyId } = req.body;
  if (!username || !password || !familyId) {
    return res.status(400).json({ error: 'Usuario, contraseña y familia son requeridos' });
  }
  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE username = ?", [username.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }
    const id = crypto.randomUUID();
    const hash = await hashPassword(password);
    await pool.execute(
      "INSERT INTO users (id, username, password_hash, family_id) VALUES (?, ?, ?, ?)",
      [id, username.trim(), hash, familyId]
    );
    res.status(201).json({ id, username: username.trim(), familyId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambiar contraseña de un usuario
app.put('/api/admin/users/:id/password', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }
  try {
    const hash = await hashPassword(password);
    const [result] = await pool.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [hash, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar usuario (no puede eliminarse a sí mismo)
app.delete('/api/admin/users/:id', authMiddleware, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  }
  try {
    const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  ENDPOINT IA: Análisis de gastos (protegido)
// ─────────────────────────────────────────────

app.post('/api/ai/insights', authMiddleware, async (req, res) => {
  const { expenses } = req.body;
  if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
    return res.json({ insights: [] });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY no está definida en las variables de entorno');
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const expensesSummary = expenses
      .map(e => `${e.date}: ${e.amount} en ${e.categoryName} (${e.description})`)
      .join('\n');
    const prompt = `Analiza los siguientes gastos personales y proporciona 3 consejos o insights financieros útiles.
Gastos:
${expensesSummary}

Devuelve la respuesta en formato JSON con una lista de objetos que tengan 'title', 'description' y 'type' (saving, warning, info).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ['title', 'description', 'type']
              }
            }
          },
          required: ['insights']
        }
      }
    });

    const jsonStr = response.text?.trim() || '{"insights":[]}';
    const data = JSON.parse(jsonStr);
    res.json({ insights: data.insights || [] });
  } catch (error) {
    console.error('Error llamando a Gemini API:', error.message);
    const isQuotaError = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
    res.status(isQuotaError ? 429 : 500).json({
      insights: [{
        title: isQuotaError ? 'Límite de IA alcanzado' : 'IA no disponible',
        description: isQuotaError
          ? 'Se alcanzó el límite de consultas gratuitas de Gemini. Intenta más tarde.'
          : 'No pudimos conectar con el analista inteligente en este momento.',
        type: 'info'
      }]
    });
  }
});

// ─────────────────────────────────────────────
//  SERVE STATIC FRONTEND
// ─────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─────────────────────────────────────────────
//  INICIAR SERVIDOR
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

async function startServer() {
  await initDb();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
✅ Servidor Activo
🚀 Puerto: ${PORT}
📂 Directorio: ${__dirname}
    `);
  });
}

startServer();
