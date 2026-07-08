document.addEventListener('DOMContentLoaded', () => {
    const cartButtons = document.querySelectorAll('.btn-add-to-cart, .btn-add-to-cart-detail');
    const cartCountSpan = document.getElementById('cart-count');

    // Initial cart count fetch (if user is logged in, their server-side cart might exist)
    // For simplicity, we assume if user is logged in, their session.cart count is reflected
    // on page load via EJS. If not, this is 0 by default.
    // We'll update it after AJAX calls.

    cartButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();

            const productId = button.dataset.productId;
            const productName = button.dataset.productName;
            const minOrderQuantity = parseInt(button.dataset.productMoq || 1);

            let quantity = 1; // Default quantity for product cards
            if (button.classList.contains('btn-add-to-cart-detail')) {
                const quantityInput = document.getElementById('quantity');
                if (quantityInput) {
                    quantity = parseInt(quantityInput.value);
                }
            } else {
                quantity = minOrderQuantity; // Default for product grid buttons
            }

            if (isNaN(quantity) || quantity < 1) {
                alert('Jumlah harus minimal 1.');
                return;
            }

            try {
                const response = await fetch('/cart/add-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, quantity, update: false }) // 'update: false' means add to existing quantity
                });
                const data = await response.json();

                if (data.success) {
                    alert(`${quantity} ${productName} ditambahkan ke keranjang!`);
                    if (cartCountSpan) {
                        cartCountSpan.textContent = data.totalCartItems; // Update cart count
                    }
                } else {
                    alert('Gagal menambahkan ke keranjang: ' + data.message);
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                alert('Terjadi kesalahan saat menambahkan ke keranjang.');
            }
        });
    });

    // Function to update header cart count (called on page load in `app.js` or `header.ejs` using `res.locals`)
    // No client-side storage, so this should ideally be reflected from session.
    // For now, let's keep it simple: if you refresh, the number will be based on server session.
    // Or, we can trigger a small AJAX call on DOMContentLoaded to get current cart count if user is logged in.
    // For now, this `cart.js` just handles the `add-update` logic.
});
