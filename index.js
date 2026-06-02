const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
// Στο Render χρησιμοποιούμε το /opt/render/project/src/ ή τον φάκελο /data για μόνιμα αρχεία. 
// Για απλότητα και επειδή το Render κάνει επανεκκινήσεις, ορίζουμε το αρχείο στην τρέχουσα διαδρομή.
const DATA_FILE = path.join(__dirname, 'transfers.json');

const USERNAME = "nireus"; 
const PASSWORD_PLAIN = "nireus"; 
const HASHED_PASSWORD = bcrypt.hashSync(PASSWORD_PLAIN, 10);

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key-hotel',
    resave: false,
    saveUninitialized: true
}));

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function checkAuth(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
}

function getTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();
    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;
    return `${yyyy}-${mm}-${dd}`;
}

app.get('/login', (req, res) => {
    res.send(`
        <div style="max-width: 300px; margin: 50px auto; font-family: Arial; text-align: center; border: 1px solid #ccc; padding: 20px; border-radius: 8px; background: white;">
            <h2>Είσοδος στο Σύστημα</h2>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Username" required style="width:90%; padding:8px; margin:5px 0;"><br>
                <input type="password" name="password" placeholder="Password" required style="width:90%; padding:8px; margin:5px 0;"><br>
                <button type="submit" style="width:94%; padding:10px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">Είσοδος</button>
            </form>
        </div>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === USERNAME && bcrypt.compareSync(password, HASHED_PASSWORD)) {
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.send("<script>alert('Λάθος στοιχεία!'); window.location='/login';</script>");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', checkAuth, (req, res) => {
    let rows = readData();
    let selectedDate = req.query.filter_date || getTodayDate();
    let filteredRows = rows.filter(row => row.date === selectedDate);
    filteredRows.sort((a, b) => a.time.localeCompare(b.time));

    let parts = selectedDate.split('-');
    let formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];

    let rowsHtml = '';
    if (filteredRows.length > 0) {
        rowsHtml += `
            <table border="1" style="width:100%; border-collapse:collapse; text-align:left;">
                <tr style="background:#f1f1f1;">
                    <th style="padding:10px;">Ώρα</th>
                    <th style="padding:10px;">Όνομα</th>
                    <th style="padding:10px;">Άτομα</th>
                    <th style="padding:10px;">Τύπος</th>
                    <th style="padding:10px;">Πλοίο / Μέσο</th>
                    <th style="padding:10px;">Ενέργεια</th>
                </tr>
        `;
        filteredRows.forEach(t => {
            rowsHtml += `
                <tr>
                    <td style="padding:10px;"><b>${t.time}</b></td>
                    <td style="padding:10px;">${t.name}</td>
                    <td style="padding:10px;">${t.guests}</td>
                    <td style="padding:10px;">${t.type === 'arrival' ? '🛬 Άφιξη' : '🛫 Αναχώρηση'}</td>
                    <td style="padding:10px;">${t.vessel || '-'}</td>
                    <td style="padding:10px;"><a href="/delete/${t.id}?return_date=${selectedDate}" onclick="return confirm('Διαγραφή;')" style="color:red; text-decoration:none;">❌</a></td>
                </tr>
            `;
        });
        rowsHtml += `</table>`;
    } else {
        rowsHtml = `<p style="color:#666; text-align:center; padding:20px;">Δεν υπάρχουν προγραμματισμένα transfers για αυτή την ημέρα.</p>`;
    }

    res.send(`
        <body style="font-family:Arial; max-width:800px; margin:20px auto; padding:0 10px; background:#f4f6f9;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px 20px; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2>📋 Transfer Management</h2>
                <a href="/logout" style="color:red; font-weight:bold; text-decoration:none;">Αποσύνδεση</a>
            </div>
            
            <div style="background:white; padding:15px; margin-top:20px; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:space-between;">
                <div>
                    <span style="font-size:16px;"><b>Επιλογή Ημέρας Προβολής:</b></span>
                    <form action="/" method="GET" style="display:inline-block; margin-left:10px;">
                        <input type="date" name="filter_date" value="${selectedDate}" onchange="this.form.submit()" style="padding:8px; font-size:16px; border-radius:4px; border:1px solid #ccc; cursor:pointer;">
                    </form>
                </div>
                <div style="background:#007bff; color:white; padding:5px 12px; border-radius:20px; font-weight:bold;">
                    ${filteredRows.length} Transfers
                </div>
            </div>

            <h3 style="margin-top:25px;">Δρομολόγια Ημέρας: <span style="color:#007bff;">${formattedDate}</span></h3>
            <div style="background:white; padding:15px; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${rowsHtml}
            </div>

            <h3 style="margin-top:30px;">Καταχώρηση Νέου Transfer</h3>
            <form action="/add" method="POST" style="background:white; padding:20px; border-radius:8px; display:grid; grid-template-columns: 1fr 1fr; gap:15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom:5px;">
                <input type="hidden" name="current_filter" value="${selectedDate}">
                <div><label><b>Ημερομηνία:</b></label><br><input type="date" name="date" value="${selectedDate}" required style="width:95%; padding:8px; margin-top:5px;"></div>
                <div><label><b>Ώρα:</b></label><br><input type="time" name="time" required style="width:95%; padding:8px; margin-top:5px;"></div>
                <div><label><b>Όνομα Πελάτη:</b></label><br><input type="text" name="name" required style="width:95%; padding:8px; margin-top:5px;"></div>
                <div><label><b>Αριθμός Ατόμων:</b></label><br><input type="number" name="guests" min="1" required style="width:95%; padding:8px; margin-top:5px;"></div>
                <div><label><b>Τύπος:</b></label><br>
                    <select name="type" style="width:100%; padding:8px; margin-top:5px;">
                        <option value="arrival">Άφιξη</option>
                        <option value="departure">Αναχώρηση</option>
                    </select>
                </div>
                <div><label><b>Πλοίο / Μέσο:</b></label><br>
    <select name="vessel" style="width:100%; padding:8px; margin-top:5px;">
        <option value="">-- Επιλογή Πλοίου --</option>
        <option value="Παναγία Σκιαδενη">Παναγία Σκιαδενη</option>
        <option value="Σεμπεκο">Σεμπεκο</option>
        <option value="Blue Star">Blue Star</option>
        <option value="Saos">Saos</option>
        <option value="Άλλο / Σχόλιο">Άλλο / Σχόλιο</option>
    </select>
</div>

                <button type="submit" style="grid-column: span 2; padding:12px; background:#28a745; color:white; border:none; cursor:pointer; font-size:16px; border-radius:4px; font-weight:bold;">Προσθήκη στο Πρόγραμμα</button>
            </form>
        </body>
    `);
});

app.post('/add', checkAuth, (req, res) => {
    const { date, name, guests, type, vessel, time, current_filter } = req.body;
    let data = readData();
    const newTransfer = { id: Date.now().toString(), date, name, guests, type, vessel, time };
    data.push(newTransfer);
    writeData(data);
    res.redirect('/?filter_date=' + current_filter);
});

app.get('/delete/:id', checkAuth, (req, res) => {
    let data = readData();
    data = data.filter(item => item.id !== req.params.id);
    writeData(data);
    const returnDate = req.query.return_date || getTodayDate();
    res.redirect('/?filter_date=' + returnDate);
});

// Χρήση της θύρας που δίνει το Render αυτόματα
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
