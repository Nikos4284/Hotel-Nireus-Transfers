const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = "nireus";
const PASSWORD_PLAIN = "nireus";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD_PLAIN, 10);

global.transfersMemory = global.transfersMemory || [];

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

app.get('/', isAuthenticated, (req, res) => {
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
                h2 { margin-top: 0; color: #512da8; border-bottom: 2px solid #eee; padding-bottom: 8px; font-size: 18px; }
                .form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
                label { font-weight: bold; font-size: 14px; }
                input, select { width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 15px; }
                button.submit-btn { background: #2e7d32; color: white; border: none; padding: 12px; width: 100%; border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 15px; font-weight: bold; }
                .day-block { background: #fff; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; }
                .day-header { background: #e8eaf6; padding: 10px 15px; font-weight: bold; color: #1a237e; border-top-left-radius: 5px; border-top-right-radius: 5px; }
                .transfer-card { padding: 12px 15px; border-bottom: 1px solid #eee; position: relative; }
                .time-badge { background: #512da8; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 13px; }
                .delete-btn { position: absolute; top: 12px; right: 15px; color: #d32f2f; text-decoration: none; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Hotel Nireus Transfers 🗓️</h1>
                <a href="/logout" class="logout-btn">Έξοδος</a>
            </div>

            <div class="container">
                <h2>➕ Νέα Καταχώρηση</h2>
                <form action="/add" method="POST">
                    <div class="form-grid">
                        <div><label>Ημερομηνία:</label><input type="date" name="date" required id="todayDate"></div>
                        <div><label>Ώρα:</label><input type="time" name="time" required></div>
                        <div><label>Δωμάτιο / Όνομα:</label><input type="text" name="room" required></div>
                        <div><label>Από:</label><input type="text" name="from_loc" required></div>
                        <div><label>Προς:</label><input type="text" name="to_loc" required></div>
                        <div><label>Άτομα:</label><input type="number" name="pax" value="2" min="1" required></div>
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
                        <div><label>Σημειώσεις:</label><input type="text" name="notes"></div>
                    </div>
                    <button type="submit" class="submit-btn">Προσθήκη στο Πρόγραμμα</button>
                </form>
            </div>

            <h2>📅 Πρόγραμμα Μεταφορών</h2>
            <div id="schedule">
                ` + renderSchedule() + `
            </div>

            <script>
                if(!document.getElementById('todayDate').value) {
                    document.getElementById('todayDate').value = new Date().toISOString().split('T')[0];
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/add', isAuthenticated, (req, res) => {
    const { date, time, room, from_loc, to_loc, pax, vessel, notes } = req.body;
    global.transfersMemory.push({
        id: Date.now().toString(),
        date, time, room, from_loc, to_loc, pax, vessel, notes
    });
    res.redirect('/');
});

app.get('/delete/:id', isAuthenticated, (req, res) => {
    global.transfersMemory = global.transfersMemory.filter(t => t.id !== req.params.id);
    res.redirect('/');
});

function renderSchedule() {
    if (!global.transfersMemory || global.transfersMemory.length === 0) {
        return '<div class="container">Δεν υπάρχουν προγραμματισμένα transfers.</div>';
    }
    
    const sorted = [...global.transfersMemory].sort((a,b) => {
        if(a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });

    const groups = {};
    sorted.forEach(t => {
        if(!groups[t.date]) groups[t.date] = [];
        groups[t.date].push(t);
    });

    let html = '';
    for (const date in groups) {
        html += '<div class="day-block"><div class="day-header">' + date + '</div>';
        groups[date].forEach(t => {
            html += `
                <div class="transfer-card">
                    <div><span class="time-badge">` + t.time + `</span> <b>` + t.room + `</b> (` + t.pax + ` άτομα)</div>
                    <div style="margin-top:4px; font-size:14px;">🛣️ <b>` + t.from_loc + `</b> → <b>` + t.to_loc + `</b></div>
                    ` + (t.vessel ? `<div style="font-size:14px; color:#512da8;">🚢 <b>` + t.vessel + `</b></div>` : '') + `
                    ` + (t.notes ? `<div style="font-size:13px; color:#666; font-style:italic;">📝 ` + t.notes + `</div>` : '') + `
                    <a href="/delete/` + t.id + `" class="delete-btn" onclick="return confirm('Σίγουρα διαγραφή;')">❌</a>
                </div>
            `;
        });
        html += `</div>`;
    }
    return html;
}

app.listen(PORT, () => {
    console.log("Server running!");
});
