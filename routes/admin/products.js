const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { isAuthenticated, isAdmin } = require('../../middlewares/authMiddleware');
const multer = require('multer'); // For image upload
const path = require('path');
const fs = require('fs'); // For deleting files

// Set storage engine for Multer
const storage = multer.diskStorage({
    destination: './public/uploads/', // Folder where images will be stored
    filename: function(req, file, cb){
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).array('images', 5); // Allow up to 5 images named 'images'

// Check File Type
function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Semua rute di sini akan dilindungi oleh isAuthenticated dan isAdmin
router.use(isAuthenticated, isAdmin);

// @desc    Show all products
// @route   GET /admin/products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('category').sort({ createdAt: -1 });
        res.render('admin/products/index', {
            title: 'Manajemen Produk',
            products,
            error: null,
            success: req.session.success_msg,
            user: req.session.user
        });
        req.session.success_msg = null;
    } catch (err) {
        console.error(err);
        res.render('admin/products/index', {
            title: 'Manajemen Produk',
            products: [],
            error: 'Gagal memuat produk.',
            user: req.session.user
        });
    }
});

// @desc    Show add product form
// @route   GET /admin/products/add
router.get('/add', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/products/add', {
            title: 'Tambah Produk Baru',
            categories,
            error: null,
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.render('admin/products/add', {
            title: 'Tambah Produk Baru',
            categories: [],
            error: 'Gagal memuat kategori.',
            user: req.session.user
        });
    }
});

// @desc    Add new product
// @route   POST /admin/products
router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            const categories = await Category.find().sort({ name: 1 });
            return res.render('admin/products/add', {
                title: 'Tambah Produk Baru',
                categories,
                error: err, // Multer error message
                user: req.session.user
            });
        } else {
            const { name, description, category, price, wholesalePrice, minOrderQuantity, stock, unit, isFeatured, isActive } = req.body;
            const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

            // Basic validation
            if (!name || !description || !category || !price || !wholesalePrice || !minOrderQuantity || !stock || !unit) {
                // Delete uploaded files if validation fails
                images.forEach(img => {
                    const filePath = path.join(__dirname, '../../public', img);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
                const categories = await Category.find().sort({ name: 1 });
                return res.render('admin/products/add', {
                    title: 'Tambah Produk Baru',
                    categories,
                    error: 'Semua kolom bertanda * harus diisi.',
                    user: req.session.user
                });
            }

            try {
                const newProduct = new Product({
                    name,
                    description,
                    category,
                    price,
                    wholesalePrice,
                    minOrderQuantity,
                    stock,
                    unit,
                    isFeatured: isFeatured === 'on' ? true : false,
                    isActive: isActive === 'on' ? true : false,
                    images
                });
                await newProduct.save();
                req.session.success_msg = 'Produk berhasil ditambahkan!';
                res.redirect('/admin/products');
            } catch (saveErr) {
                console.error(saveErr);
                // Delete uploaded files if database save fails
                images.forEach(img => {
                    const filePath = path.join(__dirname, '../../public', img);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
                const categories = await Category.find().sort({ name: 1 });
                let errorMsg = 'Gagal menambahkan produk.';
                if (saveErr.code === 11000) { // Duplicate key error
                    errorMsg = 'Nama produk sudah ada.';
                }
                res.render('admin/products/add', {
                    title: 'Tambah Produk Baru',
                    categories,
                    error: errorMsg,
                    user: req.session.user
                });
            }
        }
    });
});

// @desc    Show edit product form
// @route   GET /admin/products/edit/:id
router.get('/edit/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        if (!product) {
            return res.redirect('/admin/products');
        }
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/products/edit', {
            title: `Edit Produk: ${product.name}`,
            product,
            categories,
            error: null,
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/products');
    }
});

// @desc    Update product
// @route   POST /admin/products/edit/:id
router.post('/edit/:id', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            const categories = await Category.find().sort({ name: 1 });
            const product = await Product.findById(req.params.id).populate('category'); // Re-fetch product
            return res.render('admin/products/edit', {
                title: `Edit Produk: ${product ? product.name : ''}`,
                product,
                categories,
                error: err,
                user: req.session.user
            });
        } else {
            const { name, description, category, price, wholesalePrice, minOrderQuantity, stock, unit, isFeatured, isActive, existingImages } = req.body;
            let newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

            try {
                let product = await Product.findById(req.params.id);
                if (!product) {
                    // Delete new uploaded files if product not found
                    newImages.forEach(img => {
                        const filePath = path.join(__dirname, '../../public', img);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    });
                    req.session.error_msg = 'Produk tidak ditemukan.';
                    return res.redirect('/admin/products');
                }

                // Handle existing images deletion if any
                let currentImages = product.images;
                let imagesToKeep = Array.isArray(existingImages) ? existingImages : (existingImages ? [existingImages] : []);
                let imagesToDelete = currentImages.filter(img => !imagesToKeep.includes(img));

                imagesToDelete.forEach(img => {
                    const filePath = path.join(__dirname, '../../public', img);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });

                product.name = name;
                product.description = description;
                product.category = category;
                product.price = price;
                product.wholesalePrice = wholesalePrice;
                product.minOrderQuantity = minOrderQuantity;
                product.stock = stock;
                product.unit = unit;
                product.isFeatured = isFeatured === 'on' ? true : false;
                product.isActive = isActive === 'on' ? true : false;
                product.images = [...imagesToKeep, ...newImages]; // Combine kept existing and new images
                product.slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''); // Update slug

                await product.save();
                req.session.success_msg = 'Produk berhasil diperbarui!';
                res.redirect('/admin/products');
            } catch (saveErr) {
                console.error(saveErr);
                // Delete new uploaded files if database save fails
                newImages.forEach(img => {
                    const filePath = path.join(__dirname, '../../public', img);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
                const categories = await Category.find().sort({ name: 1 });
                const product = await Product.findById(req.params.id).populate('category'); // Re-fetch product
                let errorMsg = 'Gagal memperbarui produk.';
                if (saveErr.code === 11000) {
                    errorMsg = 'Nama produk sudah ada.';
                }
                res.render('admin/products/edit', {
                    title: `Edit Produk: ${product ? product.name : ''}`,
                    product,
                    categories,
                    error: errorMsg,
                    user: req.session.user
                });
            }
        }
    });
});

// @desc    Delete product
// @route   POST /admin/products/delete/:id
router.post('/delete/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            // Delete associated images
            product.images.forEach(img => {
                const filePath = path.join(__dirname, '../../public', img);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
            await product.deleteOne(); // Use deleteOne() or remove() depending on Mongoose version
        }
        req.session.success_msg = 'Produk berhasil dihapus!';
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        req.session.error_msg = 'Gagal menghapus produk.';
        res.redirect('/admin/products');
    }
});

module.exports = router;
