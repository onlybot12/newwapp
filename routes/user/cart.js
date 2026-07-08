const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middlewares/authMiddleware');
const Product = require('../../models/Product'); // Diperlukan untuk validasi stok/harga terbaru

// @desc    Show user's cart
// @route   GET /cart
router.get('/', isAuthenticated, async (req, res) => {
    // Assume cart is stored in session for now.
    // In a real app, if user is logged in, you might load a persistent cart from DB.
    const cart = req.session.cart || [];

    // Fetch latest product info (prices, stock) for items in cart
    // This is crucial to prevent users from buying outdated items/prices
    const updatedCartItems = [];
    let totalCartAmount = 0;

    for (const item of cart) {
        try {
            const product = await Product.findById(item.productId);
            if (product && product.isActive && product.stock >= item.quantity) {
                // Use wholesale price if quantity meets MOQ, otherwise normal price
                const priceToUse = item.quantity >= product.minOrderQuantity ? product.wholesalePrice : product.price;
                const itemTotal = priceToUse * item.quantity;
                updatedCartItems.push({
                    ...item,
                    productName: product.name, // Ensure latest name
                    productPrice: priceToUse, // Use latest price
                    totalItemPrice: itemTotal,
                    productUnit: product.unit, // Ensure latest unit
                    currentStock: product.stock,
                    minOrderQuantity: product.minOrderQuantity
                });
                totalCartAmount += itemTotal;
            } else {
                // Product no longer available, inactive, or insufficient stock
                // You might want to remove it from cart or flag it
                console.log(`Produk ${item.productName} (ID: ${item.productId}) tidak valid atau stok habis, dihapus dari keranjang.`);
                req.session.cart = req.session.cart.filter(cartItem => cartItem.productId !== item.productId); // Remove invalid item
                req.session.save(); // Save session after modification
            }
        } catch (err) {
            console.error(`Error fetching product ${item.productId} for cart:`, err);
            req.session.cart = req.session.cart.filter(cartItem => cartItem.productId !== item.productId); // Remove problematic item
            req.session.save();
        }
    }
    
    // Update the session cart with validated and updated items
    req.session.cart = updatedCartItems;

    res.render('cart/index', {
        title: 'Keranjang Belanja',
        cartItems: updatedCartItems,
        totalCartAmount,
        user: req.session.user,
        error: req.session.error_msg,
        success: req.session.success_msg
    });
    req.session.error_msg = null;
    req.session.success_msg = null;
});

// @desc    Add/Update item in cart (AJAX endpoint)
// @route   POST /cart/add-update
router.post('/add-update', isAuthenticated, async (req, res) => {
    const { productId, quantity, update } = req.body; // 'update' is true for direct quantity setting
    
    if (!productId || isNaN(quantity) || quantity < 0) {
        return res.status(400).json({ success: false, message: 'Invalid product ID or quantity.' });
    }

    try {
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan atau tidak aktif.' });
        }
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: `Stok ${product.name} tidak mencukupi. Hanya tersedia ${product.stock} ${product.unit}.` });
        }

        let cart = req.session.cart || [];
        const existingItemIndex = cart.findIndex(item => item.productId === productId);

        let newQuantity;
        if (existingItemIndex > -1) {
            if (update) { // If it's a direct update (e.g. from quantity input)
                newQuantity = quantity;
            } else { // If it's an "add more" action
                newQuantity = cart[existingItemIndex].quantity + quantity;
            }
            
            if (newQuantity <= 0) { // Remove item if quantity becomes zero or less
                cart.splice(existingItemIndex, 1);
            } else if (newQuantity > product.stock) {
                return res.status(400).json({ success: false, message: `Stok ${product.name} tidak mencukupi untuk jumlah tersebut.` });
            } else {
                 // Determine price based on new quantity
                const priceToUse = newQuantity >= product.minOrderQuantity ? product.wholesalePrice : product.price;

                cart[existingItemIndex].quantity = newQuantity;
                cart[existingItemIndex].productPrice = priceToUse; // Update price
                cart[existingItemIndex].totalItemPrice = priceToUse * newQuantity;
            }
        } else if (quantity > 0) {
            // Determine price for new item
            const priceToUse = quantity >= product.minOrderQuantity ? product.wholesalePrice : product.price;

            cart.push({
                productId: product._id.toString(),
                productName: product.name,
                productPrice: priceToUse,
                totalItemPrice: priceToUse * quantity,
                productUnit: product.unit,
                quantity,
                minOrderQuantity: product.minOrderQuantity
            });
        }

        req.session.cart = cart;
        await req.session.save(); // Make sure session is saved
        
        // Recalculate total items in cart for header count
        const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

        res.json({ success: true, cart: req.session.cart, totalCartItems });

    } catch (err) {
        console.error('Error adding/updating cart item:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat memperbarui keranjang.' });
    }
});


// @desc    Remove item from cart (AJAX endpoint)
// @route   POST /cart/remove
router.post('/remove', isAuthenticated, async (req, res) => {
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    let cart = req.session.cart || [];
    const initialLength = cart.length;
    cart = cart.filter(item => item.productId !== productId);

    if (cart.length === initialLength) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan di keranjang.' });
    }

    req.session.cart = cart;
    await req.session.save();
    
    const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    res.json({ success: true, cart: req.session.cart, totalCartItems });
});


module.exports = router;
