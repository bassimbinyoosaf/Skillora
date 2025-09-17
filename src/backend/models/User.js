const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { 
        type: String, 
        required: [true, 'First name is required'],
        trim: true,
        maxLength: [50, 'First name cannot exceed 50 characters'],
        minLength: [2, 'First name must be at least 2 characters']
    },
    lastName: { 
        type: String, 
        required: [true, 'Last name is required'],
        trim: true,
        maxLength: [50, 'Last name cannot exceed 50 characters'],
        minLength: [2, 'Last name must be at least 2 characters']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minLength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// OTP Schema for email verification
const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    },
    attempts: {
        type: Number,
        default: 0,
        max: 5
    }
}, {
    timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
otpSchema.index({ email: 1 });
otpSchema.index({ expiresAt: 1 });

// Pre-save middleware
userSchema.pre('save', function(next) {
    if (this.email) {
        this.email = this.email.toLowerCase().trim();
        
        if (this.email === 'admn.skillora@gmail.com') {
            this.role = 'admin';
        }
    }
    next();
});

// Virtuals
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isAdmin').get(function() {
    return this.role === 'admin' || this.email === 'admn.skillora@gmail.com';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Static methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.isAdminEmail = function(email) {
    return email.toLowerCase().trim() === 'admin@skillora.org';
};

// Instance methods
userSchema.methods.isPasswordChanged = function(timestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return timestamp < changedTimestamp;
    }
    return false;
};

userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

userSchema.methods.hasAdminPrivileges = function() {
    return this.role === 'admin' || this.email === 'admn.skillora@gmail.com';
};

// OTP Methods
otpSchema.statics.generateOTP = function() {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

otpSchema.statics.createOTP = async function(email) {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await this.deleteMany({ email: email.toLowerCase().trim() });
    
    return await this.create({
        email: email.toLowerCase().trim(),
        otp,
        expiresAt,
        attempts: 0
    });
};

otpSchema.statics.verifyOTP = async function(email, inputOTP) {
    const otpRecord = await this.findOne({ 
        email: email.toLowerCase().trim(),
        expiresAt: { $gt: new Date() }
    });
    
    if (!otpRecord) {
        return { success: false, message: 'OTP expired or not found. Please request a new one.' };
    }
    
    if (otpRecord.attempts >= 5) {
        await this.deleteOne({ _id: otpRecord._id });
        return { success: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
    }
    
    otpRecord.attempts += 1;
    await otpRecord.save();
    
    if (otpRecord.otp !== inputOTP) {
        return { 
            success: false, 
            message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`,
            attemptsLeft: 5 - otpRecord.attempts
        };
    }
    
    await this.deleteOne({ _id: otpRecord._id });
    return { success: true, message: 'OTP verified successfully!' };
};

// Create models
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);

// Export both models
module.exports = { User, OTP };