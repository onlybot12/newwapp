// This script will handle client-side cart interactions (e.g., add to cart button)
// For now, it will use session storage as a temporary client-side cart for demonstration
// In a real application, you would send an AJAX request to the server to manage the cart.

document.addEventListener('DOMContentLoaded', () => {
    const cartButtons = document.querySelectorAll('.btn-add-to-cart, .btn-add-to-cart-detail');
    const cartCountSpan = document.getElementById('cart-count'); // From header.ejs

    // Load cart from session storage on page load
    let cart = JSON.parse(sessionStorage.getItem('cart')) || [];
    updateCartCount();

    cartButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default button action (e.g., form submission)

            const productId = button.dataset.productId;
            const productName = button.dataset.productName;
            const productPrice = parseFloat(button.dataset.productPrice);
            const productUnit = button.dataset.productUnit;
            const minOrderQuantity = parseInt(button.dataset.productMoq || 1); // Get MOQ from button data

            let quantity = 1; // Default quantity
            if (button.classList.contains('btn-add-to-cart-detail')) {
                // If it's the detail page button, get quantity from input
                const quantityInput = document.getElementById('quantity');
                if (quantityInput) {
                    quantity = parseInt(quantityInput.value);
                }
            } else {
                // For product cards, use MOQ as default if available, otherwise 1
                quantity = minOrderQuantity;
            }
            
            if (isNaN(quantity) || quantity < 1) {
                alert('Jumlah harus minimal 1.');
                return;
            }

            addToCart(productId, productName, productPrice, productUnit, quantity);
            alert(`${quantity} ${productUnit} ${productName} ditambahkan ke keranjang!`);
        });
    });

    function addToCart(productId, productName, productPrice, productUnit, quantity) {
        const existingItemIndex = cart.findIndex(item => item.productId === productId);

        if (existingItemIndex > -1) {
            // Update quantity if item already exists
            cart[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.push({
                productId,
                productName,
                productPrice,
                productUnit,
                quantity
            });
        }

        sessionStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        console.log('Keranjang saat ini:', cart);
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCountSpan) {
            cartCountSpan.textContent = totalItems;
        }
    }
    
    // Expose cart object for other scripts or debugging if needed
    window.grosirMartCart = {
        getCart: () => cart,
        clearCart: () => {
            cart = [];
            sessionStorage.removeItem('cart');
            updateCartCount();
            console.log('Keranjang dikosongkan.');
        }
    };
});
