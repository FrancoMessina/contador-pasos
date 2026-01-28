/**
 * MERCE VS PATRI - Servidor para persistencia de datos
 * =====================================================
 * Servidor Express que maneja la persistencia en archivo JSON
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Servir archivos estáticos (index.html, app.js, etc.)

// Inicializar archivo de datos si no existe
function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            records: [],
            weeklyPrenda: '',
            achievements: {},
            monthlyWinners: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
        console.log('📁 Archivo data.json creado');
    }
}

// Leer datos del archivo
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo datos:', error);
        return { records: [], weeklyPrenda: '', achievements: {}, monthlyWinners: [] };
    }
}

// Escribir datos al archivo
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error escribiendo datos:', error);
        return false;
    }
}

// ========================================
// ENDPOINTS API
// ========================================

// GET /api/data - Obtener todos los datos
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

// POST /api/data - Guardar todos los datos
app.post('/api/data', (req, res) => {
    const success = writeData(req.body);
    if (success) {
        res.json({ success: true, message: 'Datos guardados correctamente' });
    } else {
        res.status(500).json({ success: false, message: 'Error al guardar datos' });
    }
});

// POST /api/record - Agregar o actualizar un registro diario
app.post('/api/record', (req, res) => {
    const { date, merce, patri } = req.body;
    
    if (!date || merce === undefined || patri === undefined) {
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
    }
    
    const data = readData();
    
    // Eliminar registro existente del mismo día
    data.records = data.records.filter(r => r.date !== date);
    
    // Agregar nuevo registro
    data.records.push({ date, merce, patri });
    
    // Ordenar por fecha descendente
    data.records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const success = writeData(data);
    
    if (success) {
        res.json({ success: true, record: { date, merce, patri } });
    } else {
        res.status(500).json({ success: false, message: 'Error al guardar registro' });
    }
});

// POST /api/prenda - Guardar prenda semanal
app.post('/api/prenda', (req, res) => {
    const { prenda } = req.body;
    
    const data = readData();
    data.weeklyPrenda = prenda || '';
    
    const success = writeData(data);
    
    if (success) {
        res.json({ success: true, prenda: data.weeklyPrenda });
    } else {
        res.status(500).json({ success: false, message: 'Error al guardar prenda' });
    }
});

// DELETE /api/reset - Reiniciar todos los datos
app.delete('/api/reset', (req, res) => {
    const initialData = {
        records: [],
        weeklyPrenda: '',
        achievements: {},
        monthlyWinners: []
    };
    
    const success = writeData(initialData);
    
    if (success) {
        res.json({ success: true, message: 'Datos reiniciados' });
    } else {
        res.status(500).json({ success: false, message: 'Error al reiniciar datos' });
    }
});

// ========================================
// INICIAR SERVIDOR
// ========================================
initDataFile();

app.listen(PORT, () => {
    console.log(`
🎮 ═══════════════════════════════════════════════
   MERCE VS PATRI - Servidor iniciado
   
   📍 URL: http://localhost:${PORT}
   📁 Datos: ${DATA_FILE}
═══════════════════════════════════════════════════
    `);
});
