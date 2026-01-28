/**
 * MERCE VS PATRI - El juego de pasos, constancia y prendas
 * =========================================================
 * Aplicación gamificada donde dos jugadoras compiten caminando
 */

// ========================================
// CONFIGURACIÓN
// ========================================
const CONFIG = {
    POINTS_PER_STEPS: 1000,      // 1 punto cada 1000 pasos
    MIN_DAILY_STEPS: 5000,       // Mínimo recomendado
    MAX_DAILY_STEPS: 20000,      // Máximo contable
    BONUS_10K: 1,                // Bonus por superar 10k pasos
    BONUS_7_DAYS_8K: 2,          // Bonus por 7 días seguidos con 8k+
    STORAGE_KEY: 'merceVsPatri'
};

// ========================================
// ESTADO DE LA APLICACIÓN
// ========================================
let state = {
    records: [],                 // Historial de registros diarios
    weeklyPrenda: '',            // Prenda de la semana actual
    achievements: {},            // Logros desbloqueados
    monthlyWinners: []           // Ganadores mensuales
};

// ========================================
// UTILIDADES
// ========================================
const Utils = {
    // Formatear número con separador de miles
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    // Obtener fecha actual en formato YYYY-MM-DD
    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    // Obtener el lunes de la semana actual
    getMonday(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    // Obtener el domingo de la semana
    getSunday(date = new Date()) {
        const monday = this.getMonday(date);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return sunday;
    },

    // Formatear fecha legible
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short' 
        });
    },

    // Obtener nombre del día
    getDayName(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
    },

    // Obtener nombre del mes
    getMonthName(date = new Date()) {
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    },

    // Verificar si es el mismo día
    isSameDay(date1, date2) {
        return date1 === date2;
    },

    // Calcular puntos desde pasos
    calculatePoints(steps) {
        const cappedSteps = Math.min(steps, CONFIG.MAX_DAILY_STEPS);
        return Math.floor(cappedSteps / CONFIG.POINTS_PER_STEPS);
    },

    // Calcular bonus
    calculateBonus(steps, streak) {
        let bonus = 0;
        if (steps >= 10000) bonus += CONFIG.BONUS_10K;
        if (streak >= 7) bonus += CONFIG.BONUS_7_DAYS_8K;
        return bonus;
    }
};

// ========================================
// GESTIÓN DE DATOS
// ========================================
const DataManager = {
    // Guardar estado en localStorage
    save() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
    },

    // Cargar estado desde localStorage
    load() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            state = { ...state, ...JSON.parse(saved) };
        }
    },

    // Agregar registro diario
    addRecord(date, merceSteps, patriSteps) {
        // Eliminar registro existente del mismo día
        state.records = state.records.filter(r => r.date !== date);
        
        const mercePoints = Utils.calculatePoints(merceSteps);
        const patriPoints = Utils.calculatePoints(patriSteps);
        
        const record = {
            date,
            merce: {
                steps: merceSteps,
                points: mercePoints,
                bonus: Utils.calculateBonus(merceSteps, this.getStreak('merce'))
            },
            patri: {
                steps: patriSteps,
                points: patriPoints,
                bonus: Utils.calculateBonus(patriSteps, this.getStreak('patri'))
            }
        };
        
        state.records.push(record);
        state.records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.save();
        return record;
    },

    // Obtener registro de hoy
    getTodayRecord() {
        return state.records.find(r => r.date === Utils.getToday());
    },

    // Obtener racha de días consecutivos
    getStreak(player) {
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            const record = state.records.find(r => r.date === dateStr);
            if (record && record[player].steps >= CONFIG.MIN_DAILY_STEPS) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        
        return streak;
    },

    // Obtener registros de la semana actual
    getWeekRecords() {
        const monday = Utils.getMonday();
        const sunday = Utils.getSunday();
        
        return state.records.filter(r => {
            const date = new Date(r.date);
            return date >= monday && date <= sunday;
        });
    },

    // Obtener puntos semanales
    getWeeklyPoints(player) {
        const weekRecords = this.getWeekRecords();
        return weekRecords.reduce((sum, r) => sum + r[player].points + r[player].bonus, 0);
    },

    // Obtener registros del mes actual
    getMonthRecords() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return state.records.filter(r => {
            const date = new Date(r.date);
            return date >= firstDay && date <= lastDay;
        });
    },

    // Obtener puntos mensuales
    getMonthlyPoints(player) {
        const monthRecords = this.getMonthRecords();
        return monthRecords.reduce((sum, r) => sum + r[player].points + r[player].bonus, 0);
    },

    // Guardar prenda semanal
    savePrenda(prenda) {
        state.weeklyPrenda = prenda;
        this.save();
    },

    // Exportar datos
    exportData() {
        return JSON.stringify(state, null, 2);
    },

    // Importar datos desde JSON
    importData(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            
            // Validar estructura básica
            if (!imported.records || !Array.isArray(imported.records)) {
                throw new Error('El JSON debe contener un array "records"');
            }
            
            // Recalcular puntos para cada registro importado
            imported.records.forEach(record => {
                if (!record.date || !record.merce || !record.patri) {
                    throw new Error('Cada registro debe tener date, merce y patri');
                }
                
                // Asegurar que los pasos sean números
                record.merce.steps = parseInt(record.merce.steps) || 0;
                record.patri.steps = parseInt(record.patri.steps) || 0;
                
                // Recalcular puntos
                record.merce.points = Utils.calculatePoints(record.merce.steps);
                record.patri.points = Utils.calculatePoints(record.patri.steps);
                record.merce.bonus = record.merce.bonus || 0;
                record.patri.bonus = record.patri.bonus || 0;
            });
            
            // Fusionar con datos existentes o reemplazar
            state = {
                records: imported.records,
                weeklyPrenda: imported.weeklyPrenda || '',
                achievements: imported.achievements || {},
                monthlyWinners: imported.monthlyWinners || []
            };
            
            // Ordenar registros por fecha descendente
            state.records.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.save();
            return { success: true, count: state.records.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Importar solo pasos (formato simplificado)
    importSimpleData(data) {
        try {
            const lines = data.trim().split('\n');
            let imported = 0;
            
            lines.forEach(line => {
                // Formato esperado: YYYY-MM-DD,pasosMerce,pasosPatri
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 3) {
                    const date = parts[0];
                    const merceSteps = parseInt(parts[1]) || 0;
                    const patriSteps = parseInt(parts[2]) || 0;
                    
                    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        this.addRecord(date, merceSteps, patriSteps);
                        imported++;
                    }
                }
            });
            
            return { success: true, count: imported };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Resetear todo
    reset() {
        state = {
            records: [],
            weeklyPrenda: '',
            achievements: {},
            monthlyWinners: []
        };
        this.save();
    }
};

// ========================================
// LOGROS
// ========================================
const ACHIEVEMENTS = [
    {
        id: 'first_week',
        name: 'Primera Semana',
        desc: 'Gana tu primera semana',
        icon: '🏆',
        check: (player) => state.monthlyWinners.some(w => w.player === player)
    },
    {
        id: 'streak_7',
        name: 'Semana Perfecta',
        desc: '7 días seguidos activa',
        icon: '🔥',
        check: (player) => DataManager.getStreak(player) >= 7
    },
    {
        id: 'steps_15k',
        name: 'Día 15K',
        desc: 'Llega a 15.000 pasos en un día',
        icon: '🚀',
        check: (player) => state.records.some(r => r[player].steps >= 15000)
    },
    {
        id: 'steps_20k',
        name: 'Máximo Poder',
        desc: 'Llega a 20.000 pasos en un día',
        icon: '⚡',
        check: (player) => state.records.some(r => r[player].steps >= 20000)
    },
    {
        id: 'streak_30',
        name: 'Mes Perfecto',
        desc: '30 días seguidos activa',
        icon: '💎',
        check: (player) => DataManager.getStreak(player) >= 30
    },
    {
        id: 'total_100k',
        name: 'Centenaria',
        desc: 'Acumula 100.000 pasos totales',
        icon: '🎯',
        check: (player) => state.records.reduce((sum, r) => sum + r[player].steps, 0) >= 100000
    }
];

// ========================================
// UI - ACTUALIZACIÓN DE INTERFAZ
// ========================================
const UI = {
    // Actualizar todo
    update() {
        this.updateScoreboard();
        this.updateWeeklyTab();
        this.updateMonthlyTab();
        this.updateAchievements();
        this.updateHistory();
        this.updateDynamicMessage();
    },

    // Actualizar marcador principal
    updateScoreboard() {
        const todayRecord = DataManager.getTodayRecord();
        
        // Pasos y puntos de hoy
        const merceSteps = todayRecord?.merce.steps || 0;
        const patriSteps = todayRecord?.patri.steps || 0;
        const mercePoints = todayRecord?.merce.points || 0;
        const patriPoints = todayRecord?.patri.points || 0;
        
        document.getElementById('merce-steps-today').textContent = Utils.formatNumber(merceSteps);
        document.getElementById('patri-steps-today').textContent = Utils.formatNumber(patriSteps);
        document.getElementById('merce-points-today').textContent = mercePoints;
        document.getElementById('patri-points-today').textContent = patriPoints;
        
        // Rachas
        document.getElementById('merce-streak').textContent = DataManager.getStreak('merce');
        document.getElementById('patri-streak').textContent = DataManager.getStreak('patri');
        
        // Puntos semanales
        const merceWeekly = DataManager.getWeeklyPoints('merce');
        const patriWeekly = DataManager.getWeeklyPoints('patri');
        
        document.getElementById('merce-weekly').textContent = merceWeekly;
        document.getElementById('patri-weekly').textContent = patriWeekly;
        
        // Coronas y ganador
        const crownMerce = document.getElementById('crown-merce');
        const crownPatri = document.getElementById('crown-patri');
        const mercePlCard = document.querySelector('.player-card.merce');
        const patriCard = document.querySelector('.player-card.patri');
        
        crownMerce.classList.add('hidden');
        crownPatri.classList.add('hidden');
        mercePlCard.classList.remove('winner');
        patriCard.classList.remove('winner');
        
        if (merceWeekly > patriWeekly) {
            crownMerce.classList.remove('hidden');
            mercePlCard.classList.add('winner');
        } else if (patriWeekly > merceWeekly) {
            crownPatri.classList.remove('hidden');
            patriCard.classList.add('winner');
        }
        
        // Diferencia de puntos
        const diff = Math.abs(merceWeekly - patriWeekly);
        const diffElement = document.getElementById('score-diff');
        if (diff > 0) {
            const leader = merceWeekly > patriWeekly ? 'Merce' : 'Patri';
            diffElement.textContent = `${leader} +${diff} pts`;
        } else {
            diffElement.textContent = '¡Empate!';
        }
    },

    // Actualizar tab semanal
    updateWeeklyTab() {
        // Fechas de la semana
        const monday = Utils.getMonday();
        const sunday = Utils.getSunday();
        document.getElementById('week-dates').textContent = 
            `${Utils.formatDate(monday.toISOString())} - ${Utils.formatDate(sunday.toISOString())}`;
        
        // Puntos semanales en barra
        const merceWeekly = DataManager.getWeeklyPoints('merce');
        const patriWeekly = DataManager.getWeeklyPoints('patri');
        const total = merceWeekly + patriWeekly || 1;
        
        document.getElementById('merce-progress').style.width = `${(merceWeekly / total) * 100}%`;
        document.getElementById('patri-progress').style.width = `${(patriWeekly / total) * 100}%`;
        document.getElementById('merce-week-pts').textContent = merceWeekly;
        document.getElementById('patri-week-pts').textContent = patriWeekly;
        
        // Días de la semana
        const weekDaysContainer = document.getElementById('week-days');
        weekDaysContainer.innerHTML = '';
        
        const today = Utils.getToday();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const record = state.records.find(r => r.date === dateStr);
            const isToday = dateStr === today;
            const hasRecord = !!record;
            
            let winner = '';
            if (record) {
                if (record.merce.points > record.patri.points) winner = '🟠';
                else if (record.patri.points > record.merce.points) winner = '🟣';
                else winner = '🤝';
            }
            
            const dayCard = document.createElement('div');
            dayCard.className = `day-card ${isToday ? 'today' : ''} ${hasRecord ? 'completed' : ''}`;
            dayCard.innerHTML = `
                <div class="day-name">${Utils.getDayName(dateStr)}</div>
                <div class="day-date">${date.getDate()}</div>
                <div class="day-winner">${winner}</div>
            `;
            weekDaysContainer.appendChild(dayCard);
        }
        
        // Prenda actual
        document.getElementById('prenda-actual').textContent = 
            state.weeklyPrenda || 'Sin prenda definida';
    },

    // Actualizar tab mensual
    updateMonthlyTab() {
        const monthName = Utils.getMonthName();
        document.getElementById('current-month').textContent = 
            monthName.charAt(0).toUpperCase() + monthName.slice(1);
        
        const merceMonthly = DataManager.getMonthlyPoints('merce');
        const patriMonthly = DataManager.getMonthlyPoints('patri');
        
        let leader, second, leaderPts, secondPts;
        
        if (merceMonthly >= patriMonthly) {
            leader = 'Merce';
            second = 'Patri';
            leaderPts = merceMonthly;
            secondPts = patriMonthly;
        } else {
            leader = 'Patri';
            second = 'Merce';
            leaderPts = patriMonthly;
            secondPts = merceMonthly;
        }
        
        document.getElementById('monthly-leader').textContent = leader;
        document.getElementById('monthly-leader-pts').textContent = `${leaderPts} puntos`;
        document.getElementById('monthly-second').textContent = second;
        document.getElementById('monthly-second-pts').textContent = `${secondPts} puntos`;
    },

    // Actualizar logros
    updateAchievements() {
        const container = document.getElementById('achievements-grid');
        container.innerHTML = '';
        
        ACHIEVEMENTS.forEach(achievement => {
            const merceUnlocked = achievement.check('merce');
            const patriUnlocked = achievement.check('patri');
            const unlocked = merceUnlocked || patriUnlocked;
            
            let unlockedBy = '';
            if (merceUnlocked && patriUnlocked) unlockedBy = 'Ambas';
            else if (merceUnlocked) unlockedBy = 'Merce';
            else if (patriUnlocked) unlockedBy = 'Patri';
            
            const card = document.createElement('div');
            card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
            card.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${unlocked ? `✓ ${unlockedBy}` : achievement.desc}</div>
            `;
            container.appendChild(card);
        });
    },

    // Actualizar historial
    updateHistory() {
        const container = document.getElementById('history-list');
        container.innerHTML = '';
        
        if (state.records.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No hay registros aún</p>';
            return;
        }
        
        state.records.slice(0, 30).forEach(record => {
            let winner = '';
            const merceTotal = record.merce.points + record.merce.bonus;
            const patriTotal = record.patri.points + record.patri.bonus;
            
            if (merceTotal > patriTotal) winner = '🟠';
            else if (patriTotal > merceTotal) winner = '🟣';
            else winner = '🤝';
            
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-date">${Utils.formatDate(record.date)}</div>
                <div class="history-player">
                    <span class="history-player-name" style="color: var(--merce-primary)">Merce</span>
                    <span class="history-steps">${Utils.formatNumber(record.merce.steps)} pasos (${merceTotal} pts)</span>
                </div>
                <div class="history-player">
                    <span class="history-player-name" style="color: var(--patri-primary)">Patri</span>
                    <span class="history-steps">${Utils.formatNumber(record.patri.steps)} pasos (${patriTotal} pts)</span>
                </div>
                <div class="history-winner">${winner}</div>
            `;
            container.appendChild(item);
        });
    },

    // Actualizar mensaje dinámico
    updateDynamicMessage() {
        const messages = [
            { icon: '💪', text: '¡Que empiece el duelo!' },
            { icon: '🚀', text: 'Merce toma la delantera' },
            { icon: '👀', text: 'Patri activa el modo persecución' },
            { icon: '😬', text: 'Semana muy pareja' },
            { icon: '🔥', text: '¡Las rachas están en llamas!' },
            { icon: '🎯', text: 'Cada paso cuenta' }
        ];
        
        const merceWeekly = DataManager.getWeeklyPoints('merce');
        const patriWeekly = DataManager.getWeeklyPoints('patri');
        const diff = Math.abs(merceWeekly - patriWeekly);
        
        let message;
        if (state.records.length === 0) {
            message = messages[0];
        } else if (diff <= 2) {
            message = messages[3];
        } else if (merceWeekly > patriWeekly) {
            message = messages[1];
        } else {
            message = messages[2];
        }
        
        document.querySelector('.message-icon').textContent = message.icon;
        document.querySelector('.message-text').textContent = message.text;
    },

    // Mostrar celebración
    showCelebration(winner, isDaily = true) {
        const modal = document.getElementById('celebration-modal');
        const title = document.getElementById('celebration-title');
        const text = document.getElementById('celebration-text');
        
        title.textContent = `🎉 ¡${winner} gana!`;
        text.textContent = isDaily ? '¡Ha ganado el día de hoy!' : '¡Ha ganado la semana!';
        
        modal.classList.remove('hidden');
        this.createConfetti();
    },

    // Crear confetti
    createConfetti() {
        const container = document.getElementById('confetti');
        container.innerHTML = '';
        
        const colors = ['#FF6B6B', '#6C5CE7', '#FFD700', '#00D9A5', '#FF8E53'];
        
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 2 + 's';
            piece.style.animationDuration = (2 + Math.random() * 2) + 's';
            container.appendChild(piece);
        }
    },

    // Animar número
    animateNumber(elementId) {
        const element = document.getElementById(elementId);
        element.classList.add('animate-number');
        setTimeout(() => element.classList.remove('animate-number'), 300);
    }
};

// ========================================
// EVENT LISTENERS
// ========================================
function initEventListeners() {
    // Inicializar campo de fecha con hoy
    const dateInput = document.getElementById('date-input');
    dateInput.value = Utils.getToday();
    
    // Registrar pasos
    document.getElementById('btn-register').addEventListener('click', () => {
        const dateInput = document.getElementById('date-input');
        const merceInput = document.getElementById('merce-input');
        const patriInput = document.getElementById('patri-input');
        
        const selectedDate = dateInput.value || Utils.getToday();
        const merceSteps = parseInt(merceInput.value) || 0;
        const patriSteps = parseInt(patriInput.value) || 0;
        
        if (merceSteps === 0 && patriSteps === 0) {
            alert('Por favor, ingresa al menos los pasos de una jugadora');
            return;
        }
        
        const record = DataManager.addRecord(selectedDate, merceSteps, patriSteps);
        
        // Limpiar inputs de pasos (mantener fecha)
        merceInput.value = '';
        patriInput.value = '';
        
        // Actualizar UI
        UI.update();
        
        // Mostrar celebración si hay ganadora y es el día de hoy
        if (selectedDate === Utils.getToday() && record.merce.points !== record.patri.points) {
            const winner = record.merce.points > record.patri.points ? 'Merce' : 'Patri';
            setTimeout(() => UI.showCelebration(winner, true), 500);
        } else {
            alert(`✅ Registro guardado para ${Utils.formatDate(selectedDate)}`);
        }
        
        // Animar números
        UI.animateNumber('merce-steps-today');
        UI.animateNumber('patri-steps-today');
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // Guardar prenda
    document.getElementById('btn-prenda').addEventListener('click', () => {
        const prenda = document.getElementById('prenda-input').value.trim();
        if (prenda) {
            DataManager.savePrenda(prenda);
            document.getElementById('prenda-input').value = '';
            document.getElementById('prenda-actual').textContent = prenda;
        }
    });

    // Cerrar modal
    document.getElementById('btn-close-modal').addEventListener('click', () => {
        document.getElementById('celebration-modal').classList.add('hidden');
    });

    // Exportar datos
    document.getElementById('btn-export').addEventListener('click', () => {
        const data = DataManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merce-vs-patri-${Utils.getToday()}.json`;
        a.click();
    });

    // Resetear todo
    document.getElementById('btn-reset').addEventListener('click', () => {
        if (confirm('¿Estás segura de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) {
            if (confirm('¿REALMENTE segura? Se perderán todos los registros, rachas y logros.')) {
                DataManager.reset();
                UI.update();
                alert('Datos reiniciados. ¡A empezar de nuevo!');
            }
        }
    });

    // Importar datos
    document.getElementById('btn-import').addEventListener('click', () => {
        document.getElementById('file-import').click();
    });

    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = DataManager.importData(event.target.result);
            if (result.success) {
                UI.update();
                alert(`✅ ¡Importación exitosa! Se cargaron ${result.count} registros.`);
            } else {
                alert(`❌ Error al importar: ${result.error}`);
            }
        };
        reader.readAsText(file);
        
        // Limpiar el input para permitir reimportar el mismo archivo
        e.target.value = '';
    });

    // Enter en inputs
    document.getElementById('merce-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('patri-input').focus();
    });

    document.getElementById('patri-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-register').click();
    });
}

// ========================================
// INICIALIZACIÓN
// ========================================
function init() {
    DataManager.load();
    initEventListeners();
    UI.update();
    
    console.log('🎮 Merce vs Patri - ¡Iniciado!');
    console.log('📊 Registros cargados:', state.records.length);
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
