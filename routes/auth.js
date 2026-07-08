const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Show register page
// @route   GET /register
router.get('/register', (req, res) => {
    res.render('auth/register', { title: 'Daftar Akun Baru', error: null });
});

// @desc    Register user
// @route   POST /register
router.post('/register', async (req, res) => {
    const { username, email, password, phoneNumber, street, city, province, postalCode } = req.body;

    // Basic validation (more robust validation can be added)
    if (!username || !email || !password || !phoneNumber || !street || !city || !province || !postalCode) {
        return res.render('auth/register', { title: 'Daftar Akun Baru', error: 'Semua kolom harus diisi.' });
    }

    try {
        let user = await User.findOne({ $or: [{ email }, { username }, { phoneNumber }] });
        if (user) {
            return res.render('auth/register', { title: 'Daftar Akun Baru', error: 'Email, username, atau nomor telepon sudah terdaftar.' });
        }

        user = await User.create({
            username,
            email,
            password, // Password akan di-hash oleh pre-save hook di model User
            phoneNumber,
            address: [{ street, city, province, postalCode, isDefault: true }]
        });

        // Log user in after successful registration
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber
        };

        // Redirect to original requested URL or homepage
        const redirectUrl = req.session.returnTo || '/';
        delete req.session.returnTo; // Hapus returnTo setelah digunakan
        res.redirect(redirectUrl);

    } catch (err) {
        console.error(err);
        let errorMsg = 'Terjadi kesalahan saat pendaftaran.';
        if (err.code === 11000) { // Duplicate key error
            errorMsg = 'Email, username, atau nomor telepon sudah terdaftar.';
        }
        res.render('auth/register', { title: 'Daftar Akun Baru', error: errorMsg });
    }
});

// @desc    Show login page
// @route   GET /login
router.get('/login', (req, res) => {
    res.render('auth/login', { title: 'Login ke Akun Anda', error: null });
});

// @desc    Login user
// @route   POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.render('auth/login', { title: 'Login ke Akun Anda', error: 'Email dan password harus diisi.' });
    }

    try {
        const user = await User.findOne({ email }).select('+password'); // Select password explicitly
        if (!user) {
            return res.render('auth/login', { title: 'Login ke Akun Anda', error: 'Kredensial tidak valid.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.render('auth/login', { title: 'Login ke Akun Anda', error: 'Kredensial tidak valid.' });
        }

        // Set user in session
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber
        };

        // Redirect to original requested URL or homepage
        const redirectUrl = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(redirectUrl);

    } catch (err) {
        console.error(err);
        res.render('auth/login', { title: 'Login ke Akun Anda', error: 'Terjadi kesalahan saat login.' });
    }
});

// @desc    Logout user
// @route   GET /logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.redirect('/');
    });
});

module.exports = router;
