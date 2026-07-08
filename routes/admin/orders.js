const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const { isAuthenticated, isAdmin } = require('../../middlewares/authMiddleware');

// Semua rute di sini akan dilindungi oleh isAuthenticated dan isAdmin
router.use(isAuthenticated, isAdmin);

// @desc    Show all orders
// @route   GET /admin/orders
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().populate('userId', 'username email phoneNumber').sort({ createdAt: -1 });
        res.render('admin/orders/index', {
            title: 'Manajemen Pesanan',
            orders,
            error: null,
            success: req.session.success_msg,
            user: req.session.user
        });
        req.session.success_msg = null;
    } catch (err) {
        console.error(err);
        res.render('admin/orders/index', {
            title: 'Manajemen Pesanan',
            orders: [],
            error: 'Gagal memuat pesanan.',
            user: req.session.user
        });
    }
});

// @desc    Show single order details
// @route   GET /admin/orders/:id
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
                                .populate('userId', 'username email phoneNumber')
                                .populate('items.productId', 'name images'); // Populate product name and images
        if (!order) {
            return res.status(404).render('404', { title: 'Pesanan Tidak Ditemukan' });
        }
        res.render('admin/orders/show', {
            title: `Detail Pesanan #${order._id.toString().slice(-6)}`,
            order,
            error: null,
            success: req.session.success_msg,
            user: req.session.user
        });
        req.session.success_msg = null;
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { title: 'Terjadi Kesalahan', message: 'Gagal memuat detail pesanan.' });
    }
});

// @desc    Update order status
// @route   POST /admin/orders/:id/status
router.post('/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            req.session.error_msg = 'Pesanan tidak ditemukan.';
            return res.redirect('/admin/orders');
        }
        order.status = status;
        await order.save();
        req.session.success_msg = 'Status pesanan berhasil diperbarui!';
        res.redirect(`/admin/orders/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.session.error_msg = 'Gagal memperbarui status pesanan.';
        res.redirect(`/admin/orders/${req.params.id}`);
    }
});

module.exports = router;
