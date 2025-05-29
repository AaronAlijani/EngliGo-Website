const sqlite3 = require('sqlite3').verbose();
// const bcrypt = require('bcrypt'); // Uncomment if you add a default hashed user to the 'Users' table

//connect to sqlite database
const db = new sqlite3.Database('./engligo.db', (err) => {
    if (err) {
        console.error('Error : Opening Database', err.message);
    } else {
        console.log('Connected to EngliGo Database.');
        createTables();
    }
});

//creating the creatTable function
function createTables() {
    db.serialize(() => {
        //creating the Submission (contact us) Table
        db.run(`CREATE TABLE IF NOT EXISTS Submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            birthdate TEXT NOT NULL,
            comment TEXT NOT NULL,
            submission_date TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error : Creating Submissions Table', err.message);
            } else {
                console.log('Submissions table created or already exists.');
            }
        });

        //creating user table for login
        db.run(`CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE   NOT NULL 
        )`, (err) => {
            if (err) {
                console.error('Error : creating Users table for general registration', err.message);
            } else {
                console.log('Users table (for general registration) created or already exists.');
            }
        });
    }); 
}