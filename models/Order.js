const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product',
                required: true
            },
            name: String,
            quantity: {
                type: Number,
                required: true,
                min: [1, 'Quantity must be at least 1']
            },
            pricePerUnit: { // Price at the time of order
                type: Number,
                required: true
            },
            totalItemPrice: {
                type: Number,
                required: true
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        province: { type: String, required: true },
        postalCode: { type: String, required: true },
        phoneNumber: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['pending_whatsapp', 'confirmed', 'shipped', 'completed', 'cancelled'],
        default: 'pending_whatsapp'
    },
    orderNotes: String,
    whatsappAdminLink: String, // To store the generated WhatsApp link for reference
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update `updatedAt` field on save
OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', OrderSchema);
