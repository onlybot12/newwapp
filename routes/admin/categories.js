const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const { isAuthenticated, isAdmin } = require('../../middlewares/authMiddleware');

// Semua rute di sini akan dilindungi oleh isAuthenticated dan isAdmin
router.use(isAuthenticated, isAdmin);

// @desc    Show all categories
// @route   GET /admin/categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/categories/index', {
            title: 'Manajemen Kategori',
            categories,
            error: null,
            success: req.session.success_msg,
            user: req.session.user
        });
        req.session.success_msg = null; // Clear success message after displaying
    } catch (err) {
        console.error(err);
        res.render('admin/categories/index', {
            title: 'Manajemen Kategori',
            categories: [],
            error: 'Gagal memuat kategori.',
            user: req.session.user
        });
    }
});

// @desc    Show add category form
// @route   GET /admin/categories/add
router.get('/add', (req, res) => {
    res.render('admin/categories/add', {
        title: 'Tambah Kategori Baru',
        error: null,
        user: req.session.user
    });
});

// @desc    Add new category
// @route   POST /admin/categories
router.post('/', async (req, res) => {
    const { name, description, icon } = req.body;

    if (!name) {
        return res.render('admin/categories/add', {
            title: 'Tambah Kategori Baru',
            error: 'Nama kategori harus diisi.',
            user: req.session.user
        });
    }

    try {
        const newCategory = new Category({ name, description, icon });
        await newCategory.save();
        req.session.success_msg = 'Kategori berhasil ditambahkan!';
        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err);
        let errorMsg = 'Gagal menambahkan kategori.';
        if (err.code === 11000) { // Duplicate key error
            errorMsg = 'Nama kategori sudah ada.';
        }
        res.render('admin/categories/add', {
            title: 'Tambah Kategori Baru',
            error: errorMsg,
            user: req.session.user
        });
    }
});

// @desc    Show edit category form
// @route   GET /admin/categories/edit/:id
router.get('/edit/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.redirect('/admin/categories'); // Redirect if not found
        }
        res.render('admin/categories/edit', {
            title: `Edit Kategori: ${category.name}`,
            category,
            error: null,
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/categories');
    }
});

// @desc    Update category
// @route   POST /admin/categories/edit/:id
router.post('/edit/:id', async (req, res) => {
    const { name, description, icon } = req.body;

    if (!name) {
        const category = await Category.findById(req.params.id); // Re-fetch category for form
        return res.render('admin/categories/edit', {
            title: `Edit Kategori: ${category ? category.name : ''}`,
            category,
            error: 'Nama kategori harus diisi.',
            user: req.session.user
        });
    }

    try {
        let category = await Category.findById(req.params.id);
        if (!category) {
            req.session.error_msg = 'Kategori tidak ditemukan.';
            return res.redirect('/admin/categories');
        }

        // Check for duplicate name if changed
        if (category.name !== name) {
            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                return res.render('admin/categories/edit', {
                    title: `Edit Kategori: ${category.name}`,
                    category,
                    error: 'Nama kategori sudah ada.',
                    user: req.session.user
                });
            }
        }

        category.name = name;
        category.description = description;
        category.icon = icon;
        category.slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''); // Update slug

        await category.save();
        req.session.success_msg = 'Kategori berhasil diperbarui!';
        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err);
        res.render('admin/categories/edit', {
            title: 'Edit Kategori',
            category: req.body, // Pass submitted data back
            error: 'Gagal memperbarui kategori.',
            user: req.session.user
        });
    }
});

// @desc    Delete category
// @route   POST /admin/categories/delete/:id
router.post('/delete/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        req.session.success_msg = 'Kategori berhasil dihapus!';
        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err);
        req.session.error_msg = 'Gagal menghapus kategori.';
        res.redirect('/admin/categories');
    }
});

module.exports = router;
