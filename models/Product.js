const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a product name'],
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    images: [String], // Array of URLs to product images
    category: {
        type: mongoose.Schema.ObjectId,
        ref: 'Category',
        required: true
    },
    price: { // Normal retail price per unit
        type: Number,
        required: [true, 'Please add a normal price'],
        min: [0, 'Price cannot be negative']
    },
    wholesalePrice: { // Price per unit for wholesale
        type: Number,
        required: [true, 'Please add a wholesale price'],
        min: [0, 'Wholesale price cannot be negative']
    },
    minOrderQuantity: { // Minimum quantity to get wholesale price
        type: Number,
        required: [true, 'Please add a minimum order quantity for wholesale'],
        min: [1, 'Minimum order quantity must be at least 1']
    },
    stock: {
        type: Number,
        required: [true, 'Please add stock quantity'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    unit: { // e.g., 'pcs', 'pak', 'karton'
        type: String,
        required: [true, 'Please add a unit of measure']
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create product slug from the name
ProductSchema.pre('save', function(next) {
    this.slug = this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    next();
});

module.exports = mongoose.model('Product', ProductSchema);
