// Require the express web application framework (https://expressjs.com)
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
// const bcrypt = require('bcrypt'); // Not needed for plain text passwords

// Create a new web application by calling the express function
const app = express();
const port = 3000;

//Database connection
const db = new sqlite3.Database('./engligo.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error : Connecting to Database', err.message);
    } else {
        // Corrected the log message to reflect the actual filename
        console.log('Successfully connected to engligo.db for the server.');
    }
});

//view engin setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true })); // To parse URL-encoded form data
app.use(express.json()); // To parse JSON request bodies
// Tell our application to serve all the files under the `public_html` directory
app.use(express.static('public_html'));

// Session middleware setup
app.use(session({
    secret: 'Wq@Ue38B*#tu5&wsoObS', //this is the secret admin code
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: { secure: false } // For development (HTTP). For production (HTTPS) should be true
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
});

//Route to handle submit contact form
app.post('/submit-contact', (req, res) => {
    const { contactName, contactEmail, contactPhone, contactBirthdate, contactComment } = req.body;
    let errors = [];

    if (!contactName || contactName.trim() === "") { errors.push("Name is required and cannot be empty."); }
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) { errors.push("A valid Email is required (e.g., user@example.com)."); }
    if (!contactPhone || contactPhone.trim() === "" || !/^[0-9]{8,15}$/.test(contactPhone.trim())) { errors.push("Phone number is required (8-15 digits, numbers only)."); }
    if (!contactBirthdate || !/^\d{4}-\d{2}-\d{2}$/.test(contactBirthdate.trim())) {
        errors.push("Birthdate in YYYY-MM-DD format is required.");
    } else {
        const trimmedBirthdate = contactBirthdate.trim();
        const dateParts = trimmedBirthdate.split('-');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        const dateObj = new Date(year, month - 1, day);
        if (!(dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day)) {
            errors.push("Invalid birthdate. Please enter a real calendar date.");
        }
    }
    if (!contactComment || contactComment.trim() === "") { errors.push("Comment is required and cannot be empty."); }

    if (errors.length > 0) {
        return res.status(400).json({
            message: "Validation failed. Please check your input.",
            errors: errors
        });
    }

    const sql = `INSERT INTO Submissions (name, email, phone, birthdate, comment) VALUES (?, ?, ?, ?, ?)`;
    const params = [
        contactName.trim(), contactEmail.trim(), contactPhone.trim(),
        contactBirthdate.trim(), contactComment.trim()
    ];
    db.run(sql, params, function (err) {
        if (err) {
            console.error('Database error saving submission:', err.message);
            return res.status(500).json({
                message: "Error: Could not save your submission. Please try again later."
            });
        }
        console.log(`A new submission has been inserted with rowid ${this.lastID}`);
        res.status(201).json({
            message: "Thank you for your submission! It has been received."
        });
    });
});

// --- larnSVG page route -----
app.get('/learnSvg', (req, res) => {
    res.render('learnSVG', {
        pageTitle: 'Learn SVG Waves - EngliGo'
            
    });
});

// --- User Registration Routes ---
app.get('/register', (req, res) => {
    res.render('register', {
        pageTitle: 'Register - EngliGo',
        errors: [],
        usernameValue: '',
        emailValue: ''
    });
});

app.post('/register', (req, res) => { // Removed async
    const { username, email, password, confirmPassword } = req.body;
    let errors = [];

    if (!username || username.trim().length < 3) { errors.push({ msg: "Username must be at least 3 characters." }); }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { errors.push({ msg: "A valid Email is required." }); }
    if (!password || password.length < 6) { errors.push({ msg: "Password must be at least 6 characters." }); }
    if (password !== confirmPassword) { errors.push({ msg: "Passwords do not match." }); }

    if (errors.length > 0) {
        return res.render('register', { pageTitle: 'Register - EngliGo', errors: errors, usernameValue: username, emailValue: email });
    }

    // No try-catch needed here if not using await
    const userExistsSql = "SELECT * FROM Users WHERE username = ? OR email = ?";
    db.get(userExistsSql, [username.trim(), email.trim()], (err, row) => { // Removed async
        if (err) {
            errors.push({ msg: "Database error. Please try again." });
            return res.render('register', { pageTitle: 'Register - EngliGo', errors: errors, usernameValue: username, emailValue: email });
        }
        if (row) {
            if (row.username === username.trim()) { errors.push({ msg: "Username already taken." }); }
            if (row.email === email.trim()) { errors.push({ msg: "Email already registered." }); }
            return res.render('register', { pageTitle: 'Register - EngliGo', errors: errors, usernameValue: username, emailValue: email });
        }

        // Store plain text password
        const plainPassword = password; // Using the submitted password directly

        const insertSql = "INSERT INTO Users (username, email, password) VALUES (?, ?, ?)";
        // CORRECTED: Use plainPassword instead of hashedPassword
        db.run(insertSql, [username.trim(), email.trim(), plainPassword], function (err) {
            if (err) {
                errors.push({ msg: "Could not register user. Please try again." });
                return res.render('register', { pageTitle: 'Register - EngliGo', errors: errors, usernameValue: username, emailValue: email });
            }
            res.redirect('/login?status=registered');
        });
    });
});

// --- User Login Routes ---
app.get('/login', (req, res) => {
    let successMsg = null;
    if (req.query.status === 'registered') {
        successMsg = 'Registration successful! Please log in.';
    }
    res.render('login', {
        pageTitle: 'Login - EngliGo',
        error: null,
        success_msg: successMsg
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { pageTitle: 'Login - EngliGo', error: 'Username and password are required.', success_msg: null });
    }

    const sql = "SELECT * FROM Users WHERE username = ?";
    db.get(sql, [username.trim()], (err, user) => { // Removed async
        if (err) {
            return res.render('login', { pageTitle: 'Login - EngliGo', error: 'Database error. Please try again.', success_msg: null });
        }
        if (!user) {
            return res.render('login', { pageTitle: 'Login - EngliGo', error: 'Invalid username or password.', success_msg: null });
        }

        // Direct plain text password comparison
        if (password === user.password) {
            req.session.isUserLoggedIn = true;
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/');
        } else {
            return res.render('login', { pageTitle: 'Login - EngliGo', error: 'Invalid username or password.', success_msg: null });
        }
        // Removed try-catch for bcrypt.compare as it's no longer used
    });
});

// --- Logout Route ---
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Route to display submitted messages (Admin View)
app.get('/admin/messages', async (req, res) => {
    const submissionsSql = "SELECT id, name, email, phone, birthdate, comment, submission_date FROM Submissions ORDER BY submission_date DESC";
    // Corrected Users SQL to select only non-sensitive fields
    const usersSql = "SELECT id, username, email FROM Users ORDER BY username ASC";

    try {
        const getAll = (sqlQuery, params = []) => {
            return new Promise((resolve, reject) => {
                db.all(sqlQuery, params, (dbErr, rows) => {
                    if (dbErr) { reject(dbErr); } else { resolve(rows); }
                });
            });
        };

        const [submissions, users] = await Promise.all([
            getAll(submissionsSql),
            getAll(usersSql)
        ]);

        res.render('admin_messages', {
            pageTitle: 'Site Data Overview - EngliGo',
            submissions: submissions,
            users: users,
            loggedInUsername: req.session.username // Pass username if logged in
        });
    } catch (dbError) {
        console.error('Database error fetching data for admin/messages:', dbError.message);
        res.status(500).send("Error retrieving data from the database.");
    }
});

// Tell our application to listen to requests at port 3000 on the localhost
app.listen(port, () => {
    console.log(`Web server running at: http://localhost:${port}`);
    console.log(`Type Ctrl+C to shut down the web server`);
});
