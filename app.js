const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { isAuthenticated, isAdmin } = require('./middlewares/authMiddleware'); // Import middleware

// Load env vars
dotenv.config({ path: './.env' });

// Connect to database
connectDB();

const app = express();

// EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static folder (for CSS, JS, images, uploads)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser for form data
app.use(express.urlencoded({ extended: false })); // For form submissions
app.use(express.json()); // For AJAX requests (e.g., cart add/update/remove)

// Session middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET, // Use a strong, random secret
        resave: false, // Don't save session if unmodified
        saveUninitialized: false, // Don't create session until something stored
        store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
        cookie: { 
            maxAge: 1000 * 60 * 60 * 24, // 1 day
            httpOnly: true, // Prevent client-side JS from reading cookie
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            sameSite: 'lax' // CSRF protection
        } 
    })
);

// Global variable for current user (available in all EJS templates)
// Also passes `req.session` for general session data if needed
app.use((req, res, next) => {
    res.locals.user = req.session.user; 
    res.locals.session = req.session; // Pass entire session for flash messages etc.
    // console.log('Current Session User:', req.session.user); // Uncomment for debug
    // console.log('Current Session Cart:', req.session.cart); // Uncomment for debug
    next();
});

// --- Define Routes ---

// Authentication Routes (Register, Login, Logout)
app.use('/', require('./routes/auth')); 

// User-facing Product Routes (All products, single product detail)
app.use('/products', require('./routes/user/products'));

// User Cart Routes (View cart, add/update/remove items via AJAX)
app.use('/cart', require('./routes/user/cart'));

// User Checkout Routes (View checkout, process order to WhatsApp)
app.use('/checkout', require('./routes/user/checkout'));

// Homepage Route (now with featured products)
const Product = require('./models/Product'); // Import Product model for homepage
const Category = require('./models/Category'); // Import Category model for homepage
app.get('/', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true, isFeatured: true }).limit(8).sort({ createdAt: -1 });
        const categories = await Category.find().sort({ name: 1 }); // Pass categories for potential filter on homepage
        res.render('index', {
            title: 'Grosir Mart - Beranda',
            products,
            categories,
            error: null
            // user: res.locals.user is already available via middleware
            // error: res.locals.session.error_msg, etc. will be passed via res.locals.session
        });
        // Clear flash messages after rendering
        req.session.error_msg = null;
        req.session.success_msg = null;
    } catch (err) {
        console.error(err);
        res.render('index', {
            title: 'Grosir Mart - Beranda',
            products: [],
            categories: [],
            error: 'Gagal memuat produk di beranda.',
            // user: res.locals.user is already available
        });
    }
});


// --- Admin Routes ---
// These routes are protected by `isAuthenticated` and `isAdmin` middleware
app.use('/admin', require('./routes/admin/index')); // Admin Dashboard main
app.use('/admin/categories', require('./routes/admin/categories')); // Admin Category Management
app.use('/admin/products', require('./routes/admin/products'));     // Admin Product Management
app.use('/admin/orders', require('./routes/admin/orders'));         // Admin Order Management

// --- Error Handling ---

// 404 Not Found Handler
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' });
});

// General Error Handler (for 500 Internal Server Error)
// Must be the last middleware
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging
    res.status(500).render('error', { 
        title: 'Terjadi Kesalahan Server', 
        message: 'Mohon maaf, terjadi kesalahan pada server kami. Silakan coba lagi nanti.' 
    });
});


const PORT = process.env.PORT || 5000;

app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
);
