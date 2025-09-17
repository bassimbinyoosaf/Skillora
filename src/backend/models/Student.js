const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxLength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxLength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    phone: {
        type: String,
        trim: true,
        maxLength: [15, 'Phone number cannot exceed 15 characters']
    },
    location: {
        type: String,
        trim: true,
        maxLength: [100, 'Location cannot exceed 100 characters']
    },
    bio: {
        type: String,
        maxLength: [1000, 'Bio cannot exceed 1000 characters']
    },
    skills: {
        type: String,
        maxLength: [500, 'Skills cannot exceed 500 characters']
    },
    experience: {
        type: String,
        maxLength: [2000, 'Experience cannot exceed 2000 characters']
    },
    education: {
        type: String,
        maxLength: [1000, 'Education cannot exceed 1000 characters']
    },
    linkedIn: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true; // Allow empty values
                return /^https?:\/\/.+/.test(v);
            },
            message: 'LinkedIn must be a valid URL'
        }
    },
    github: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true; // Allow empty values
                return /^https?:\/\/.+/.test(v);
            },
            message: 'GitHub must be a valid URL'
        }
    },
    website: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true; // Allow empty values
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Website must be a valid URL'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
studentSchema.index({ userId: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ createdAt: -1 });

// Virtuals
studentSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

// Static methods
studentSchema.statics.findByUserId = function(userId) {
    return this.findOne({ userId });
};

studentSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase().trim() });
};

// Instance methods
studentSchema.methods.updateProfile = function(profileData) {
    Object.keys(profileData).forEach(key => {
        if (profileData[key] !== undefined && key !== 'userId') {
            this[key] = profileData[key];
        }
    });
    return this.save();
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;