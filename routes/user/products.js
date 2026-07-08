const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const Category = require('../../models/Category');

// @desc    Show all products
// @route   GET /products
router.get('/', async (req, res) => {
    try {
        const filter = { isActive: true };

        // Filter kategori jika ada
        if (req.query.category) {
            const category = await Category.findOne({ slug: req.query.category });

            if (category) {
                filter.category = category._id;
            }
        }

        const products = await Product.find(filter)
            .populate('category')
            .sort({ createdAt: -1 });

        const categories = await Category.find().sort({ name: 1 });

        res.render('products/index', {
            title: 'Daftar Produk',
            products,
            categories,
            selectedCategory: req.query.category || '',
            error: null,
            user: req.session.user
        });

    } catch (err) {
        console.error(err);

        res.render('products/index', {
            title: 'Daftar Produk',
            products: [],
            categories: [],
            selectedCategory: '',
            error: 'Gagal memuat produk.',
            user: req.session.user
        });
    }
});

// @desc    Show single product details
// @route   GET /products/:slug
router.get('/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({
            slug: req.params.slug,
            isActive: true
        }).populate('category');

        if (!product) {
            return res.status(404).render('404', {
                title: 'Produk Tidak Ditemukan'
            });
        }

        res.render('products/show', {
            title: product.name,
            product,
            user: req.session.user
        });

    } catch (err) {
        console.error(err);

        res.status(500).render('error', {
            title: 'Terjadi Kesalahan',
            message: 'Gagal memuat detail produk.'
        });
    }
});

module.exports = router;
