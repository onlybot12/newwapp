const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Load env vars
dotenv.config({ path: './.env' });

// Connect to database
connectDB();

const app = express();

// EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Body parser for form data
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // For API requests if any

// Session middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false, // Don't save session if unmodified
        saveUninitialized: false, // Don't create session until something stored
        store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
        cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
    })
);

// Global variable for current user (optional, helpful for EJS views)
app.use((req, res, next) => {
    res.locals.user = req.session.user; // Make user available in all EJS templates
    next();
});

// Define Routes
// Ini akan kita isi nanti. Sementara kita buat route sederhana dulu.
app.get('/', (req, res) => {
    res.render('index', { title: 'Grosir Mart - Beranda' });
});

// Error handling for 404
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' });
});

const PORT = process.env.PORT || 5000;

app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
);
