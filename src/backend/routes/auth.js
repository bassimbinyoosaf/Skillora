const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// Import models
let User, OTP;
try {
  const models = require('../models/User');
  
  if (models.User && models.OTP) {
    User = models.User;
    OTP = models.OTP;
    console.log('✅ User and OTP models imported successfully');
  } else {
    User = models;
    
    // Create OTP model inline
    const otpSchema = new mongoose.Schema({
      email: { type: String, required: true, lowercase: true, trim: true },
      otp: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      attempts: { type: Number, default: 0, max: 5 }
    }, { timestamps: true });
    
    otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    otpSchema.statics.generateOTP = function() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    
    otpSchema.statics.createOTP = async function(email) {
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await this.deleteMany({ email: email.toLowerCase().trim() });
      return await this.create({ email: email.toLowerCase().trim(), otp, expiresAt, attempts: 0 });
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
    
    OTP = mongoose.model('OTP', otpSchema);
  }
} catch (error) {
  console.error('❌ Error importing models:', error.message);
  
  // Create basic models as fallback
  const userSchema = new mongoose.Schema({
    firstName: String, lastName: String, email: String, password: String,
    role: String, lastLogin: Date, isActive: Boolean, isVerified: Boolean
  }, { timestamps: true });
  
  const otpSchema = new mongoose.Schema({
    email: String, otp: String, expiresAt: Date, attempts: Number
  }, { timestamps: true });
  
  User = mongoose.model('User', userSchema) || mongoose.models.User;
  OTP = mongoose.model('OTP', otpSchema) || mongoose.models.OTP;
}

const router = express.Router();

// --- Email Configuration ---
let transporter;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('📧 Email transporter configured successfully');
  } else {
    console.warn('⚠️  EMAIL_USER or EMAIL_PASS not configured in .env');
  }
} catch (error) {
  console.error('❌ Email transporter configuration failed:', error);
}

// --- Helpers ---
const handleServerError = (res, error, message = 'Server error') => {
  console.error(`❌ ${message}:`, error);
  res.status(500).json({ success: false, message: message });
};

const formatUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  isAdmin: user.role === 'admin' || user.email === 'admn.skillora@gmail.com',
  isVerified: user.isVerified,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt
});

const sendOTPEmail = async (email, otp, firstName = '') => {
  if (!transporter) {
    throw new Error('Email service not configured');
  }
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email - Skillora',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to Skillora${firstName ? ', ' + firstName : ''}!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Verify your email to complete registration</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
          <p style="color: '666'; font-size: 16px;">Please enter this code to verify your email address:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 10px; font-family: monospace;">${otp}</span>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            This code will expire in <strong>5 minutes</strong><br>
            If you didn't request this, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© 2024 Skillora. All rights reserved.</p>
        </div>
      </div>
    `
  };
  
  return await transporter.sendMail(mailOptions);
};

// --- Routes ---

// Test route
router.get('/test', (_, res) => {
  res.json({ 
    message: 'Auth routes working!', 
    timestamp: new Date().toISOString(), 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    otpService: transporter ? 'Ready' : 'Not configured'
  });
});

// Step 1: Send OTP for email verification
router.post('/send-otp', async (req, res) => {
  try {
    const { email, firstName } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }
    
    if (!transporter) {
      return res.status(500).json({ success: false, message: 'Email service not configured. Please contact administrator.' });
    }
    
    // Generate and save OTP
    const otpRecord = await OTP.createOTP(email);
    
    // Send OTP email
    await sendOTPEmail(email, otpRecord.otp, firstName);
    
    res.json({
      success: true,
      message: 'OTP sent to your email address. Please check your inbox.',
      expiresIn: 5 * 60 * 1000
    });
    
  } catch (error) {
    console.error('Send OTP Error:', error);
    handleServerError(res, error, 'Failed to send OTP');
  }
});

// Step 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    
    const verification = await OTP.verifyOTP(email, otp);
    
    if (!verification.success) {
      return res.status(400).json(verification);
    }
    
    res.json({
      success: true,
      message: 'Email verified successfully! You can now complete your registration.',
      verified: true
    });
    
  } catch (error) {
    console.error('Verify OTP Error:', error);
    handleServerError(res, error, 'Failed to verify OTP');
  }
});

// Step 3: Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, firstName } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    if (!transporter) {
      return res.status(500).json({ success: false, message: 'Email service not configured. Please contact administrator.' });
    }
    
    // Generate and save new OTP
    const otpRecord = await OTP.createOTP(email);
    
    // Send new OTP email
    await sendOTPEmail(email, otpRecord.otp, firstName);
    
    res.json({
      success: true,
      message: 'New OTP sent to your email address.',
      expiresIn: 5 * 60 * 1000
    });
    
  } catch (error) {
    console.error('Resend OTP Error:', error);
    handleServerError(res, error, 'Failed to resend OTP');
  }
});

// Step 4: Complete Signup (after OTP verification)
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, isVerified } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if email is verified (skip for admn.skillora@gmail.com)
    if (email.toLowerCase().trim() !== 'admn.skillora@gmail.com' && !isVerified) {
      return res.status(400).json({ success: false, message: 'Please verify your email first' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const isAdminEmail = email.toLowerCase().trim() === 'admn.skillora@gmail.com';
    
    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: isAdminEmail ? 'admin' : 'user',
      isVerified: true
    });

    const savedUser = await newUser.save();
    
    const userResponse = formatUser(savedUser);

    res.status(201).json({
      success: true,
      message: savedUser.role === 'admin'
        ? 'Admin account created successfully! You now have administrative privileges.'
        : 'Account created successfully! You can now sign in.',
      user: userResponse
    });
  } catch (err) {
    console.error('Signup Error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(err.errors).map(e => e.message) });
    }
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    handleServerError(res, err, 'Signup error');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    res.json({
      success: true,
      message: (user.role === 'admin' || user.email === 'admn.skillora@gmail.com') 
        ? 'Admin login successful - Welcome back!' 
        : 'Login successful',
      user: formatUser(user)
    });
  } catch (err) {
    handleServerError(res, err, 'Login error');
  }
});

// Get profile
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    handleServerError(res, err, 'Profile fetch error');
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, count: users.length, users: users.map(formatUser) });
  } catch (err) {
    handleServerError(res, err, 'Error fetching users');
  }
});

// Delete user
router.delete('/user/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    handleServerError(res, err, 'Error deleting user');
  }
});

// Update user role
router.patch('/user/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be "user" or "admin"' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { role }, 
      { new: true, select: '-password' }
    );
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: `User role updated to ${role}`, user: formatUser(user) });
  } catch (err) {
    handleServerError(res, err, 'Error updating user role');
  }
});

module.exports = router;