const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../../middlewares/authMiddleware');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Category = require('../../models/Category');

// Semua rute di sini akan dilindungi oleh isAuthenticated dan isAdmin
router.use(isAuthenticated, isAdmin);

// @desc    Admin Dashboard Home
// @route   GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending_whatsapp' });

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.session.user,
            stats: {
                totalUsers,
                totalProducts,
                totalOrders,
                pendingOrders
            }
        });
    } catch (err) {
        console.error(err);
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.session.user,
            error: 'Gagal mengambil statistik dashboard.'
        });
    }
});

module.exports = router;
