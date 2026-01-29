import 'dotenv/config';
import express, { json } from 'express';
import { createConnection, createPool } from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// Configuración de Middlewares
app.use(cors());
app.use(json());

// Configuración de la conexión MySQL
// Ajusta estos valores según tu entorno
const dbConfig = {
  host: process.env.DB_SERVER, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

let pool;

async function initDb() {
  try {
    // Primero conectamos sin base de datos para asegurarnos de que exista
    const connection = await createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    // Creamos el pool de conexiones con la base de datos ya seleccionada
    pool = createPool(dbConfig);

    // Crear tablas si no existen
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        subCategories TEXT NOT NULL
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        amount DECIMAL(12, 2) NOT NULL,
        categoryId VARCHAR(50),
        categoryName VARCHAR(100),
        subCategory VARCHAR(100),
        description TEXT,
        date DATE NOT NULL
      )
    `);

    console.log('Conectado a MySQL y tablas verificadas.');
  } catch (err) {
    console.error('Error inicializando MySQL:', err.message);
    process.exit(1);
  }
}

initDb();

// --- ENDPOINTS PARA CATEGORÍAS ---

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories");
    const categories = rows.map(r => ({ 
      ...r, 
      subCategories: JSON.parse(r.subCategories) 
    }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories', async (req, res) => {
  const categories = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM categories");
    
    if (categories.length > 0) {
      const sql = "INSERT INTO categories (id, name, subCategories) VALUES ?";
      const values = categories.map(cat => [
        cat.id, 
        cat.name, 
        JSON.stringify(cat.subCategories)
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

// --- ENDPOINTS PARA GASTOS ---

app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM expenses ORDER BY date DESC");
    // Formatear fecha para evitar desfases de zona horaria al enviar al front
    const formattedRows = rows.map(r => ({
      ...r,
      date: r.date.toISOString().split('T')[0]
    }));
    res.json(formattedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { id, amount, categoryId, categoryName, subCategory, description, date } = req.body;
  try {
    const sql = `INSERT INTO expenses (id, amount, categoryId, categoryName, subCategory, description, date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await pool.execute(sql, [id, amount, categoryId, categoryName, subCategory, description, date]);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM expenses WHERE id = ?", [req.params.id]);
    res.json({ message: "Gasto eliminado", deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Static Frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('/*', (req, res) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
✅ Servidor Activo
🚀 Puerto: ${PORT}
📂 Directorio: ${__dirname}
    `);
});