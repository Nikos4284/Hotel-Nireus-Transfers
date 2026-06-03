const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = "nireus";
const PASSWORD_PLAIN = "nireus";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD_PLAIN, 10);

// Ρύθμιση για τον ΜΟΝΙΜΟ ΔΙΣΚΟ του Render
const RENDER_DISK_DIR = '/data';
let DATA_FILE = path.join(__dirname, 'transfers.json');

if (fs.existsSync(RENDER_DISK_DIR)) {
    DATA_FILE = path.join(RENDER_DISK_DIR, 'transfers.json');
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
    if (username === USERNAME && bcrypt.compareSync(password, PASSWORD_HASH)) {
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
    // Υπολογισμός της σημερινής ημερομηνίας σε μορφή YYYY-MM-DD με βάση την τοπική ώρα
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISODate = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
    
    // Αν δεν υπάρχει επιλεγμένη ημερομηνία στο URL, δείχνει ΑΥΤΟΜΑΤΑ τη σημερινή
    const selectedDate = req.query.date || localISODate;

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
                .date-picker-box { background: #e8eaf6; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #c5cae9; }
                h2 { margin-top: 0; color: #512da8; border-bottom: 2px solid #eee; padding-bottom: 8px; font-size: 18px; }
                .form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
                @media(min-width: 600px) { .form-grid { grid-template-columns: 1fr 1fr; } }
                label { font-weight: bold; font-size: 14px; }
                input, select { width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 15px; }
                button.submit-btn { background: #2e7d32; color: white; border: none; padding: 12px; width: 100%; border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 15px; font-weight: bold; }
                
                .print-btn { background: #0288d1; color: white; border: none; padding: 10px 16px; border-radius: 4px; font-size: 15px; cursor: pointer; font-weight: bold; margin-bottom: 15px; display: inline-flex; align-items: center; gap: 8px; }
                
                .day-block { background: #fff; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .day-header { background: #512da8; padding: 10px 15px; font-weight: bold; color: white; border-top-left-radius: 5px; border-top-right-radius: 5px; border-bottom: 1px solid #ddd; }
                .transfer-card { padding: 12px 15px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 4px; position: relative; }
                .transfer-card:last-child { border-bottom: none; }
                .time-badge { background: #512da8; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 13px; display: inline-block; width: max-content; }
                .type-badge { padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 13px; display: inline-block; }
                .arrival { background: #e8f5e9; color: #2e7d32; }
                .departure { background: #ffebee; color: #c62828; }
                .delete-btn { position: absolute; top: 12px; right: 15px; color: #d32f2f; text-decoration: none; font-weight: bold; font-size: 14px; padding: 5px; }

                @media print {
                    body { background: white; padding: 0; }
                    .header, .date-picker-box, .container, .print-btn, .delete-btn, h2 { display: none !important; }
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
                <a href="/logout" class="logout-btn">Έξοδος</a>
            </div>

            <div class="date-picker-box">
                <label style="color: #1a237e; font-size: 16px;">📅 Επιλέξτε Ημερομηνία για Προβολή & Καταχώρηση:</label>
                <form action="/" method="GET" id="dateForm">
                    <input type="date" name="date" value="` + selectedDate + `" onchange="document.getElementById('dateForm').submit()" style="font-size: 18px; padding: 10px; margin-top: 8px; border: 2px solid #512da8;">
                </form>
            </div>

            <div class="container">
                <h2>➕ Νέα Καταχώρηση για την ημέρα αυτή</h2>
                <form action="/add" method="POST">
                    <input type="hidden" name="date" value="` + selectedDate + `">
                    
                    <div class="form-grid">
                        <div><label>Ώρα (24ωρη μορφή):</label><input type="time" name="time" step="60" required></div>
                        <div><label>Όνομα Πελάτη / Δωμάτιο:</label><input type="text" name="room" placeholder="π.χ. Παπαδόπουλος - Δωμ. 202" required></div>
                        <div>
                            <label>Τύπος Κίνησης:</label>
                            <select name="type_move" required>
                                <option value="Άφιξη">🛬 Άφιξη</option>
                                <option value="Αναχώρηση">🛫 Αναχώρηση</option>
                            </select>
                        </div>
                        <div>
                            <label>Άτομα:</label>
                            <select name="pax" required>
                                <option value="1">1 άτομο</option>
                                <option value="2" selected>2 άτομα</option>
                                <option value="3">3 άτομα</option>
                                <option value="4">4 άτομα</option>
                                <option value="5">5 άτομα</option>
                                <option value="6">6 άτομα</option>
                                <option value="7">7 άτομα</option>
                                <option value="8">8 άτομα</option>
                                <option value="9">9 άτομα</option>
                                <option value="10">10 άτομα</option>
                            </select>
                        </div>
                        <div>
                            <label>Πλοίο / Μέσο:</label>
                            <select name="vessel">
                                <option value="">-- Επιλογή Πλοίου --</option>
                                <option value="Παναγία Σκιαδενη">Παναγία Σκιαδενη</option>
                                <option value="Σεμπεκο">Σεμπεκο</option>
                                <option value="Blue Star">Blue Star</option>
                                <option value="Saos">Saos</option>
                                <option value="Άλλο / Σχόλιο">Άλλο / Σχόλιο</option>
                            </select>
                        </div>
                        <div><label>Σημειώσεις:</label><input type="text" name="notes" placeholder="π.χ. έξτρα σχόλια"></div>
                    </div>
                    <button type="submit" class="submit-btn">Προσθήκη στο Πρόγραμμα</button>
                </form>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <h2>📅 Πρόγραμμα Μεταφορών</h2>
                <button onclick="window.print()" class="print-btn">📤 Αποστολή / Εκτύπωση</button>
            </div>
            
            <div id="schedule">
                ` + renderScheduleForDate(selectedDate) + `
            </div>
        </body>
        </html>
    `);
});

app.post('/add', isAuthenticated, (req, res) => {
    const { date, time, room, type_move, pax, vessel, notes } = req.body;
    const transfers = loadTransfers();
    transfers.push({
        id: Date.now().toString(),
        date, time, room, type_move, pax, vessel, notes
    });
    saveTransfers(transfers);
    res.redirect('/?date=' + date);
});

app.get('/delete/:id', isAuthenticated, (req, res) => {
    const { date } = req.query;
    let transfers = loadTransfers();
    transfers = transfers.filter(t => t.id !== req.params.id);
    saveTransfers(transfers);
    res.redirect('/?date=' + date);
});

function renderScheduleForDate(targetDate) {
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
                <a href="/delete/` + t.id + `?date=` + targetDate + `" class="delete-btn" onclick="return confirm('Σίγουρα διαγραφή;')">❌</a>
            </div>
        `;
    });
    html += `</div>`;
    return html;
}

app.listen(PORT, () => {
    console.log("Server running with 24h time format and dynamic today default!");
});
