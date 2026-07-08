const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a category name'],
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description can not be more than 500 characters']
    },
    icon: String, // URL or class for icon
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create category slug from the name
CategorySchema.pre('save', function(next) {
    this.slug = this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    next();
});

module.exports = mongoose.model('Category', CategorySchema);
