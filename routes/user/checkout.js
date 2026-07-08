const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middlewares/authMiddleware');
const Order = require('../../models/Order');
const User = require('../../models/User'); // Untuk mengambil alamat user
const Product = require('../../models/Product'); // Untuk validasi final

// Fungsi untuk mendapatkan URL WhatsApp admin (bisa dikonfigurasi di .env)
const getWhatsappAdminUrl = () => {
    // Ganti dengan nomor WhatsApp admin yang sebenarnya.
    // Format: https://wa.me/NOMOR_TELEPON_ADMIN?text=PESAN_ANDA
    // Contoh: https://wa.me/6281234567890
    return process.env.WHATSAPP_ADMIN_NUMBER || '6281234567890';
};

// @desc    Show checkout page
// @route   GET /checkout
router.get('/', isAuthenticated, async (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
        req.session.error_msg = 'Keranjang belanja Anda kosong, tidak bisa checkout.';
        return res.redirect('/cart');
    }

    const user = await User.findById(req.session.user.id);
    const defaultAddress = user.address.find(addr => addr.isDefault) || user.address[0];

    // Recalculate cart to ensure latest prices and stock before checkout view
    const updatedCartItems = [];
    let totalCartAmount = 0;
    let hasInvalidItems = false;

    for (const item of cart) {
        try {
            const product = await Product.findById(item.productId);
            if (product && product.isActive && product.stock >= item.quantity) {
                const priceToUse = item.quantity >= product.minOrderQuantity ? product.wholesalePrice : product.price;
                const itemTotal = priceToUse * item.quantity;
                updatedCartItems.push({
                    ...item,
                    productName: product.name,
                    productPrice: priceToUse,
                    totalItemPrice: itemTotal,
                    productUnit: product.unit,
                    currentStock: product.stock,
                    minOrderQuantity: product.minOrderQuantity
                });
                totalCartAmount += itemTotal;
            } else {
                hasInvalidItems = true;
                req.session.error_msg = `Beberapa produk di keranjang Anda tidak tersedia atau stok tidak cukup. Mohon periksa kembali keranjang Anda.`;
                return res.redirect('/cart'); // Redirect to cart if invalid items found
            }
        } catch (err) {
            console.error(`Error fetching product ${item.productId} for checkout:`, err);
            hasInvalidItems = true;
            req.session.error_msg = 'Terjadi kesalahan saat memproses keranjang. Mohon coba lagi.';
            return res.redirect('/cart'); // Redirect to cart on error
        }
    }
    
    req.session.cart = updatedCartItems; // Update session cart with final validated data

    res.render('checkout/index', {
        title: 'Checkout Pesanan',
        cartItems: updatedCartItems,
        totalCartAmount,
        user: req.session.user,
        defaultAddress,
        error: req.session.error_msg,
        success: req.session.success_msg
    });
    req.session.error_msg = null;
    req.session.success_msg = null;
});

// @desc    Process order and redirect to WhatsApp
// @route   POST /checkout/process
router.post('/process', isAuthenticated, async (req, res) => {
    const { orderNotes } = req.body;
    const cart = req.session.cart || [];

    if (cart.length === 0) {
        req.session.error_msg = 'Keranjang belanja Anda kosong, tidak bisa checkout.';
        return res.redirect('/cart');
    }

    const user = await User.findById(req.session.user.id);
    const shippingAddress = user.address.find(addr => addr.isDefault) || user.address[0];

    if (!shippingAddress) {
        req.session.error_msg = 'Anda belum memiliki alamat pengiriman default. Mohon tambahkan di profil Anda.';
        return res.redirect('/checkout');
    }

    // Final validation of cart items before saving order
    let finalCartItems = [];
    let totalOrderAmount = 0;
    for (const item of cart) {
        try {
            const product = await Product.findById(item.productId);
            if (!product || !product.isActive || product.stock < item.quantity) {
                req.session.error_msg = `Produk ${item.productName} tidak tersedia atau stok tidak cukup. Mohon periksa kembali keranjang Anda.`;
                return res.redirect('/cart');
            }
            const priceToUse = item.quantity >= product.minOrderQuantity ? product.wholesalePrice : product.price;
            const itemTotal = priceToUse * item.quantity;

            finalCartItems.push({
                productId: item.productId,
                name: product.name, // Use product name from DB
                quantity: item.quantity,
                pricePerUnit: priceToUse,
                totalItemPrice: itemTotal
            });
            totalOrderAmount += itemTotal;

            // Optionally, decrement stock here (or after admin confirms)
            // For "redirect to WA" model, might be better to decrement AFTER admin confirmation.
            // product.stock -= item.quantity;
            // await product.save();

        } catch (err) {
            console.error(`Error validating product ${item.productId} during checkout:`, err);
            req.session.error_msg = 'Terjadi kesalahan saat memproses pesanan. Mohon coba lagi.';
            return res.redirect('/cart');
        }
    }

    try {
        const newOrder = new Order({
            userId: req.session.user.id,
            items: finalCartItems,
            totalAmount: totalOrderAmount,
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                province: shippingAddress.province,
                postalCode: shippingAddress.postalCode,
                phoneNumber: user.phoneNumber // Use user's primary phone number
            },
            orderNotes: orderNotes,
            status: 'pending_whatsapp' // Initial status
        });

        await newOrder.save();

        // Construct WhatsApp message
        let whatsappMessage = `Halo admin, saya ingin mengkonfirmasi pesanan saya.\n`;
        whatsappMessage += `*ID Pesanan:* #${newOrder._id.toString().slice(-6)}\n`; // Short ID for easy reference
        whatsappMessage += `*Nama Pelanggan:* ${user.username}\n`;
        whatsappMessage += `*Nomor Telepon:* ${user.phoneNumber}\n`;
        whatsappMessage += `*Alamat Pengiriman:* ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.province}, ${shippingAddress.postalCode}\n`;
        whatsappMessage += `*Detail Pesanan:*\n`;
        finalCartItems.forEach(item => {
            whatsappMessage += `- ${item.quantity} ${item.name} @ Rp ${item.pricePerUnit.toLocaleString('id-ID')} = Rp ${item.totalItemPrice.toLocaleString('id-ID')}\n`;
        });
        whatsappMessage += `*Total Belanja:* Rp ${totalOrderAmount.toLocaleString('id-ID')}\n`;
        if (orderNotes) {
            whatsappMessage += `*Catatan Tambahan:* ${orderNotes}\n`;
        }
        whatsappMessage += `\nMohon info metode pembayaran dan total akhir termasuk ongkir. Terima kasih!`;

        // Encode message for URL
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappLink = `https://wa.me/${getWhatsappAdminUrl()}?text=${encodedMessage}`;

        // Store the generated link in order for admin to see
        newOrder.whatsappAdminLink = whatsappLink;
        await newOrder.save();

        // Clear cart from session after successful order
        req.session.cart = [];
        await req.session.save();

        // Redirect user to WhatsApp
        res.redirect(whatsappLink);

    } catch (err) {
        console.error('Error processing order:', err);
        req.session.error_msg = 'Terjadi kesalahan saat memproses pesanan. Mohon coba lagi.';
        res.redirect('/checkout');
    }
});

module.exports = router;
