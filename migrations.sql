-- ============================================================
--  MIGRACIONES — GastoWise PRO
--  Ejecutar sobre una base de datos existente para agregar
--  soporte multi-familia. El servidor (server.js) corre estas
--  migraciones automáticamente al arrancar, pero puedes
--  ejecutarlas manualmente si lo prefieres.
-- ============================================================

-- 1. Tabla de familias (nueva)
CREATE TABLE IF NOT EXISTS families (
  id          VARCHAR(50)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de usuarios (nueva)
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(50)  PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  family_id     VARCHAR(50)  NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id)
);

-- 3. Agregar family_id a categories (ignorar si ya existe)
ALTER TABLE categories
  ADD COLUMN family_id VARCHAR(50) NOT NULL DEFAULT '';

-- 4. Agregar family_id a expenses (ignorar si ya existe)
ALTER TABLE expenses
  ADD COLUMN family_id VARCHAR(50) NOT NULL DEFAULT '';

-- 5. Crear familia y usuario por defecto para los datos existentes
--    (solo si no hay ninguna familia aún)
INSERT IGNORE INTO families (id, name)
  SELECT 'default-family', 'Mi Familia'
  WHERE NOT EXISTS (SELECT 1 FROM families LIMIT 1);

-- 6. Asignar todos los registros huérfanos a la primera familia
UPDATE categories
  SET family_id = (SELECT id FROM families ORDER BY created_at ASC LIMIT 1)
  WHERE family_id = '';

UPDATE expenses
  SET family_id = (SELECT id FROM families ORDER BY created_at ASC LIMIT 1)
  WHERE family_id = '';

-- ============================================================
--  NOTA: los usuarios y sus contraseñas se crean desde
--  server.js al primer arranque (no se guardan aquí porque
--  las contraseñas deben ser hasheadas con scrypt).
--  Ver la salida de consola del servidor al iniciar.
-- ============================================================
