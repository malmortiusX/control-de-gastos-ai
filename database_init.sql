
-- Script de inicialización para GastoWise PRO
-- Motor: MySQL / MariaDB

-- 1. Crear la base de datos
CREATE DATABASE IF NOT EXISTS gastowise 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE gastowise;

-- 2. Crear tabla de categorías
-- Almacenamos subcategorías como un string JSON para mantener la flexibilidad del front
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    subCategories TEXT NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 3. Crear tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    categoryId VARCHAR(50),
    categoryName VARCHAR(100),
    subCategory VARCHAR(100),
    description TEXT,
    date DATE NOT NULL,
    PRIMARY KEY (id),
    -- Índices para optimizar reportes y búsquedas
    INDEX idx_date (date),
    INDEX idx_category (categoryId)
) ENGINE=InnoDB;

-- 4. Insertar categorías por defecto (Ignorar si ya existen los IDs)
INSERT IGNORE INTO categories (id, name, subCategories) VALUES 
('cat-1', 'Alimentación', '["Mercado", "Comida Calle"]'),
('cat-2', 'Transporte', '["Bus", "Indrive", "Gasolina", "Mantenimiento"]'),
('cat-3', 'Vivienda', '["Arriendo"]'),
('cat-4', 'Servicios', '["Luz", "Agua", "Gas", "Internet Casa", "Celular"]'),
('cat-5', 'Ocio', '["Cine", "Streaming", "Salidas"]'),
('cat-6', 'Salud', '["Farmacia", "Consulta", "Gimnasio"]');

-- Mensaje de éxito para consola
SELECT 'Base de datos gastowise inicializada correctamente' AS Status;
