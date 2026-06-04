const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Διαχειριστής (Πλήρη δικαιώματα)
const ADMIN_USER = "admin";
const ADMIN_PASS_PLAIN = "admin";
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASS_PLAIN, 10);

// Οδηγοί (Μόνο προβολή)
const DRIVER_USER = "nireus";
const DRIVER_PASS_PLAIN = "nireus";
const DRIVER_HASH = bcrypt.hashSync(DRIVER_PASS_PLAIN, 10);

// Εξασφάλιση μόνιμης αποθήκευσης σε οποιαδήποτε δομή του Render
let DATA_FILE = path.join(__dirname, 'transfers.json');
if (fs.existsSync('/data')) {
    DATA_FILE = '/data/transfers.json';
} else if (fs.existsSync('/opt/render/project/src/data')) {
    DATA_FILE = '/opt/render/project/src/data/transfers.json';
}

function loadTransfers() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.log("Error reading file", e);
    }
    return [];
}

function saveTransfers(transfers) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(transfers, null, 2), 'utf8');
    } catch (e) {
        console.log("Error writing file", e);
    }
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'hotel_nireus_secure_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login');
}

// Έλεγχος αν ο συνδεδεμένος χρήστης είναι Admin (ξενοδοχείο)
function isAdmin(req) {
    return req.session.user === ADMIN_USER;
}

// Σελίδα Login
app.get('/login', (req, res) => {
    let errorHTML = '';
    if (req.query.error) {
        errorHTML = '<div style="color: red; margin-bottom: 10px;">Λάθος στοιχεία εισόδου!</div>';
    }
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Nireus Transfers - Login</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f4f6f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .login-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 90%; max-width: 360px; text-align: center; }
                input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
                button { width: 100%; padding: 12px; background: #512da8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>Nireus Transfers</h2>
                ` + errorHTML + `
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Username" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <button type="submit">Είσοδος</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && bcrypt.compareSync(password, ADMIN_HASH)) {
        req.session.user = username;
        return res.redirect('/');
    } else if (username === DRIVER_USER && bcrypt.compareSync(password, DRIVER_HASH)) {
        req.session.user = username;
        return res.redirect('/');
    }
    res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Κύρια Σελίδα
app.get('/', isAuthenticated, (req, res) => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISODate = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
    const selectedDate = req.query.date || localISODate;
    const editId = req.query.edit || null;
    
    const userIsAdmin = isAdmin(req);

    let editData = { id: '', time: '', room: '', type_move: 'Άφιξη', pax: '2', vessel: '', notes: '' };
    if (editId && userIsAdmin) {
        const transfers = loadTransfers();
        const found = transfers.find(t => t.id === editId);
        if (found) editData = found;
    }

    let actionFormHTML = '';
    if (userIsAdmin) {
        actionFormHTML = `
            <div class="container ` + (editId ? 'edit-mode' : '') + `">
                <h2>` + (editId ? '✏️ Επεξεργασία Καταχώρησης' : '➕ Νέα Καταχώρηση για την ημέρα αυτή') + `</h2>
                <form action="` + (editId ? '/update' : '/add') + `" method="POST">
                    <input type="hidden" name="date" value="` + selectedDate + `">
                    ` + (editId ? `<input type="hidden" name="id" value="` + editData.id + `">` : '') + `
                    
                    <div class="form-grid">
                        <div>
                            <label>Ώρα (24h - π.χ. 17:15):</label>
                            <input type="time" name="time" value="` + editData.time + `" required style="font-variant-numeric: tabular-nums;" autocomplete="off">
                        </div>
                        <div><label>Όνομα Πελάτη / Δωμάτιο:</label><input type="text" name="room" value="` + editData.room + `" placeholder="π.χ. Παπαδόπουλος - Δωμ. 202" required></div>
                        <div>
                            <label>Τύπος Κίνησης:</label>
                            <select name="type_move" required>
                                <option value="Άφιξη" ` + (editData.type_move === 'Άφιξη' ? 'selected' : '') + `>🛬 Άφιξη</option>
                                <option value="Αναχώρηση" ` + (editData.type_move === 'Αναχώρηση' ? 'selected' : '') + `>🛫 Αναχώρηση</option>
                            </select>
                        </div>
                        <div>
                            <label>Άτομα:</label>
                            <select name="pax" required>
                                ` + [1,2,3,4,5,6,7,8,9,10].map(n => `<option value="`+n+`" `+(editData.pax == n ? 'selected' : '')+`>`+n+` άτομα</option>`).join('') + `
                            </select>
                        </div>
                        <div>
                            <label>Πλοίο / Μέσο:</label>
                            <select name="vessel">
                                <option value="">-- Επιλογή Πλοίου --</option>
                                <option value="Παναγία Σκιαδενη" ` + (editData.vessel === 'Παναγία Σκιαδενη' ? 'selected' : '') + `>Παναγία Σκιαδενη</option>
                                <option value="Σεμπεκο" ` + (editData.vessel === 'Σεμπεκο' ? 'selected' : '') + `>Σεμπεκο</option>
                                <option value="Blue Star" ` + (editData.vessel === 'Blue Star' ? 'selected' : '') + `>Blue Star</option>
                                <option value="Saos" ` + (editData.vessel === 'Saos' ? 'selected' : '') + `>Saos</option>
                                <option value="Άλλο / Σχόλιο" ` + (editData.vessel === 'Άλλο / Σχόλιο' ? 'selected' : '') + `>Άλλο / Σχόλιο</option>
                            </select>
                        </div>
                        <div><label>Σημειώσεις:</label><input type="text" name="notes" value="` + editData.notes + `" placeholder="π.χ. έξτρα σχόλια"></div>
                    </div>
                    <button type="submit" class="submit-btn ` + (editId ? 'update-btn' : '') + `">` + (editId ? 'Αποθήκευση Αλλαγών' : 'Προσθήκη στο Πρόγραμμα') + `</button>
                    ` + (editId ? `<a href="/?date=` + selectedDate + `" class="cancel-edit-btn">Ακύρωση Επεξεργασίας</a>` : '') + `
                </form>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Hotel Nireus Transfers</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 15px; background: #f8f9fa; color: #333; }
                .header { background: #512da8; color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .header h1 { margin: 0; font-size: 20px; }
                .logout-btn { color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 4px; font-size: 14px; }
                .container { background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 20px; }
                .container.edit-mode { border: 2px solid #0288d1; background: #f1f8ff; }
                .date-picker-box { background: #e8eaf6; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #c5cae9; }
                h2 { margin-top: 0; color: #512da8; border-bottom: 2px solid #eee; padding-bottom: 8px; font-size: 18px; }
                .form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
                @media(min-width: 600px) { .form-grid { grid-template-columns: 1fr 1fr; } }
                label { font-weight: bold; font-size: 14px; }
                input, select { width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 15px; }
                button.submit-btn { background: #2e7d32; color: white; border: none; padding: 12px; width: 100%; border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 15px; font-weight: bold; }
                button.submit-btn.update-btn { background: #0288d1; }
                .cancel-edit-btn { display: block; text-align: center; background: #757575; color: white; text-decoration: none; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 15px; font-weight: bold; }
                .print-btn { background: #0288d1; color: white; border: none; padding: 10px 16px; border-radius: 4px; font-size: 15px; cursor: pointer; font-weight: bold; margin-bottom: 15px; display: inline-flex; align-items: center; gap: 8px; }
                .day-block { background: #fff; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .day-header { background: #512da8; padding: 10px 15px; font-weight: bold; color: white; border-top-left-radius: 5px; border-top-right-radius: 5px; border-bottom: 1px solid #ddd; }
                .transfer-card { padding: 12px 15px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 4px; position: relative; }
                .transfer-card:last-child { border-bottom: none; }
                .time-badge { background: #512da8; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 13px; display: inline-block; width: max-content; }
                .type-badge { padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 13px; display: inline-block; }
                .arrival { background: #e8f5e9; color: #2e7d32; }
                .departure { background: #ffebee; color: #c62828; }
                .actions-box { position: absolute; top: 12px; right: 15px; display: flex; gap: 10px; }
                .edit-btn { color: #0288d1; text-decoration: none; font-weight: bold; font-size: 16px; padding: 5px; }
                .delete-btn { color: #d32f2f; text-decoration: none; font-weight: bold; font-size: 16px; padding: 5px; }

                @media print {
                    body { background: white; padding: 0; }
                    .header, .date-picker-box, .container, .print-btn, .actions-box, h2 { display: none !important; }
                    .day-block { border: none; box-shadow: none; }
                    .day-header { background: #512da8 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .time-badge { background: #512da8 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .arrival { background: #e8f5e9 !important; color: #2e7d32 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .departure { background: #ffebee !important; color: #c62828 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Hotel Nireus Transfers 🗓️</h1>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 13px; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px;">👤 ` + req.session.user + `</span>
                    <a href="/logout" class="logout-btn">Έξοδος</a>
                </div>
            </div>

            <div class="date-picker-box">
                <label style="color: #1a237e; font-size: 16px;">📅 Επιλέξτε Ημερομηνία για Προβολή:</label>
                <form action="/" method="GET" id="dateForm">
                    <input type="date" name="date" value="` + selectedDate + `" onchange="document.getElementById('dateForm').submit()" style="font-size: 18px; padding: 10px; margin-top: 8px; border: 2px solid #512da8;">
                </form>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <h2>📅 Πρόγραμμα Μεταφορών</h2>
                <button onclick="window.print()" class="print-btn">📤 Αποστολή / Εκτύπωση</button>
            </div>
            
            <div id="schedule" style="margin-bottom: 30px;">
                ` + renderScheduleForDate(selectedDate, userIsAdmin) + `
            </div>

            ` + actionFormHTML + `
        </body>
        </html>
    `);
});

app.post('/add', isAuthenticated, (req, res) => {
    if (!isAdmin(req)) return res.status(403).send("Δεν έχετε δικαίωμα καταχώρησης.");
    const { date, time, room, type_move, pax, vessel, notes } = req.body;
    const transfers = loadTransfers();
    transfers.push({
        id: Date.now().toString(),
        date, time, room, type_move, pax, vessel, notes
    });
    saveTransfers(transfers);
    res.redirect('/?date=' + date);
});

app.post('/update', isAuthenticated, (req, res) => {
    if (!isAdmin(req)) return res.status(403).send("Δεν έχετε δικαίωμα επεξεργασίας.");
    const { id, date, time, room, type_move, pax, vessel, notes } = req.body;
    let transfers = loadTransfers();
    const index = transfers.findIndex(t => t.id === id);
    if (index !== -1) {
        transfers[index] = { id, date, time, room, type_move, pax, vessel, notes };
        saveTransfers(transfers);
    }
    res.redirect('/?date=' + date);
});

app.get('/delete/:id', isAuthenticated, (req, res) => {
    if (!isAdmin(req)) return res.status(403).send("Δεν έχετε δικαίωμα διαγραφής.");
    const { date } = req.query;
    let transfers = loadTransfers();
    transfers = transfers.filter(t => t.id !== req.params.id);
    saveTransfers(transfers);
    res.redirect('/?date=' + date);
});

function renderScheduleForDate(targetDate, userIsAdmin) {
    const transfers = loadTransfers();
    const filtered = transfers.filter(t => t.date === targetDate);
    
    const d = new Date(targetDate);
    const formattedDate = d.toLocaleDateString('el-GR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (filtered.length === 0) {
        return `
            <div class="day-block">
                <div class="day-header">` + formattedDate + `</div>
                <div style="padding: 20px; color: #777; font-style: italic; text-align: center; background: white;">
                    Δεν υπάρχουν προγραμματισμένα transfers για αυτή την ημέρα.
                </div>
            </div>
        `;
    }
    
    const sorted = filtered.sort((a,b) => a.time.localeCompare(b.time));

    let html = '<div class="day-block"><div class="day-header">' + formattedDate + '</div>';
    sorted.forEach(t => {
        const typeClass = t.type_move === 'Άφιξη' ? 'arrival' : 'departure';
        html += `
            <div class="transfer-card">
                <div>
                    <span class="time-badge">` + t.time + `</span> 
                    <span class="type-badge ` + typeClass + `">` + (t.type_move || 'Transfer') + ` ` + (t.type_move === 'Άφιξη' ? '🛬' : '🛫') + `</span>
                    <b>` + t.room + `</b> (` + t.pax + ` άτομα)
                </div>
                ` + (t.vessel ? `<div style="font-size:14px; margin-top:2px; color:#512da8;">🚢 <b>` + t.vessel + `</b></div>` : '') + `
                ` + (t.notes ? `<div style="font-size:13px; margin-top:2px; color:#666; font-style:italic;">📝 ` + t.notes + `</div>` : '') + `
                
                ` + (userIsAdmin ? `
                <div class="actions-box">
                    <a href="/?date=` + targetDate + `&edit=` + t.id + `" class="edit-btn" title="Επεξεργασία">✏️</a>
                    <a href="/delete/` + t.id + `?date=` + targetDate + `" class="delete-btn" onclick="return confirm('Σίγουρα διαγραφή;')" title="Διαγραφή">❌</a>
                </div>
                ` : '') + `
            </div>
        `;
    });
    html += `</div>`;
    return html;
}

app.listen(PORT, () => {
    console.log("Server running with custom free 24h format and top-aligned schedule visualization!");
});
