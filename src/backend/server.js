require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillora';
const uploadsDir = path.join(__dirname, 'uploads');

// ---------- MIDDLEWARE ----------
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', true);

// Logger
app.use((req, _, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
  next();
});

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---------- MODELS ----------
// Import models
let User, Student, Contact;

try {
  // Import User model
  const userModels = require('./models/User');
  User = userModels.User || userModels;
  console.log('✅ User model imported successfully');
} catch (error) {
  console.error('❌ Error importing User model:', error.message);
}

try {
  // Import Student model
  Student = require('./models/Student');
  console.log('✅ Student model imported successfully');
} catch (error) {
  console.error('❌ Error importing Student model:', error.message);
  
  // Create Student model inline if file doesn't exist
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
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'LinkedIn must be a valid URL'
      }
    },
    github: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'GitHub must be a valid URL'
      }
    },
    website: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
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

  studentSchema.index({ userId: 1 });
  studentSchema.index({ email: 1 });
  studentSchema.index({ createdAt: -1 });

  studentSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
  });

  studentSchema.set('toJSON', { virtuals: true });
  studentSchema.set('toObject', { virtuals: true });

  studentSchema.statics.findByUserId = function(userId) {
    return this.findOne({ userId });
  };

  Student = mongoose.model('Student', studentSchema);
  console.log('✅ Student model created inline');
}

// Contact Schema and Model
const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxLength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxLength: [2000, 'Message cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

// ---------- HELPERS ----------
const sanitizeEmailForFolder = email => {
  const username = email.toLowerCase().split('@')[0];
  return username.replace(/[^a-z0-9]/g, '_');
};

const getUserFolderPath = email => path.join(uploadsDir, sanitizeEmailForFolder(email));

const findUserFolder = (email) => {
  const sanitizedFolder = sanitizeEmailForFolder(email);
  const sanitizedPath = path.join(uploadsDir, sanitizedFolder);
  
  if (fs.existsSync(sanitizedPath)) {
    return sanitizedPath;
  }
  
  const oldFolder = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  const oldPath = path.join(uploadsDir, oldFolder);
  if (fs.existsSync(oldPath)) {
    return oldPath;
  }
  
  return null;
};

// ---------- MULTER ----------
const storage = multer.diskStorage({
  destination: (req, _, cb) => {
    const { email } = req.body;
    if (!email) return cb(new Error('User email is required for file upload'));
    const folder = getUserFolderPath(email);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const fileFilter = (_, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
  const isExtensionAllowed = allowedExtensions.includes(fileExtension);
  
  if (isMimeTypeAllowed && isExtensionAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Only JPG, PNG, PDF, and DOC files are permitted. Received: ${file.mimetype} (${fileExtension})`), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 
  } 
});

// ---------- STUDENT ROUTES ----------

// Get student profile by user ID
app.get('/api/student/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    let student = await Student.findOne({ userId }).populate('userId', 'firstName lastName email role isVerified createdAt lastLogin');
    
    if (!student) {
      // If no student profile exists, create one from user data
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      student = new Student({
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      });
      
      await student.save();
      student = await Student.findOne({ userId }).populate('userId', 'firstName lastName email role isVerified createdAt lastLogin');
    }

    res.json({
      success: true,
      student: student
    });

  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student profile'
    });
  }
});

// Update student profile
app.put('/api/student/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Remove userId from profileData to prevent overwriting
    delete profileData.userId;

    let student = await Student.findOne({ userId });

    if (!student) {
      // Create new student profile if it doesn't exist
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      student = new Student({
        userId: user._id,
        firstName: profileData.firstName || user.firstName,
        lastName: profileData.lastName || user.lastName,
        email: profileData.email || user.email,
        ...profileData
      });
    } else {
      // Update existing profile
      Object.keys(profileData).forEach(key => {
        if (profileData[key] !== undefined) {
          student[key] = profileData[key];
        }
      });
    }

    const updatedStudent = await student.save();
    const populatedStudent = await Student.findById(updatedStudent._id).populate('userId', 'firstName lastName email role isVerified createdAt lastLogin');

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      student: populatedStudent
    });

  } catch (error) {
    console.error('Error updating student profile:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update student profile'
    });
  }
});

// Get all students (for admin)
app.get('/api/students', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const students = await Student.find({ isActive: true })
      .populate('userId', 'firstName lastName email role isVerified createdAt lastLogin')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments({ isActive: true });

    res.json({
      success: true,
      count: students.length,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
      students: students
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
});

// Get student by email (for admin search)
app.get('/api/student/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const student = await Student.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    }).populate('userId', 'firstName lastName email role isVerified createdAt lastLogin');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      student: student
    });

  } catch (error) {
    console.error('Error fetching student by email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student'
    });
  }
});

// Delete student profile (soft delete)
app.delete('/api/student/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const student = await Student.findOneAndUpdate(
      { userId },
      { isActive: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Student profile deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student profile'
    });
  }
});

// ---------- EXISTING ROUTES ----------

// File upload route
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    if (!req.body.email) return res.status(400).json({ success: false, message: 'User email is required' });

    const files = req.files.map(f => ({
      originalName: f.originalname, filename: f.filename, size: f.size,
      mimetype: f.mimetype, path: f.path, userFolder: sanitizeEmailForFolder(req.body.email)
    }));

    res.json({ success: true, message: `${files.length} file(s) uploaded successfully`, files, userFolder: sanitizeEmailForFolder(req.body.email) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'File upload failed', error: err.message });
  }
});

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;
    
    console.log('Received contact form submission:', { name, email, subject, message, userId });
    
    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address' 
      });
    }
    
    // Create contact submission
    const contactSubmission = new Contact({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      userId: userId || null
    });
    
    const savedSubmission = await contactSubmission.save();
    console.log('Contact form saved to database:', savedSubmission._id);
    
    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      submissionId: savedSubmission._id
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit contact form. Please try again later.' 
    });
  }
});

// Get all contact submissions (admin only)
app.get('/api/contact/submissions', async (req, res) => {
  try {
    const submissions = await Contact.find()
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: 'firstName lastName email' });
    
    res.json({
      success: true,
      submissions: submissions
    });
    
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contact submissions' 
    });
  }
});

// Get user files
app.get('/api/files/:email', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const folder = findUserFolder(email);
    
    if (!folder) return res.status(404).json({ success: false, message: 'No files found for this user' });

    const files = fs.readdirSync(folder).map(name => {
      const stats = fs.statSync(path.join(folder, name));
      return { filename: name, size: stats.size, uploadDate: stats.birthtime, path: path.join(folder, name) };
    });
    res.json({ success: true, userFolder: path.basename(folder), userEmail: email, filesCount: files.length, files });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching files', error: err.message });
  }
});

// Delete file
app.delete('/api/delete/:email/:filename', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const folder = findUserFolder(email);
    
    if (!folder) return res.status(404).json({ success: false, message: 'User folder not found' });
    
    const filePath = path.join(folder, decodeURIComponent(req.params.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting file', error: err.message });
  }
});

// File serving helper
const serveFile = (disposition) => (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const folder = findUserFolder(email);
    
    if (!folder) return res.status(404).json({ success: false, message: 'User folder not found' });
    
    const filePath = path.join(folder, decodeURIComponent(req.params.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    
    res.setHeader('Content-Disposition', `${disposition}; filename="${decodeURIComponent(req.params.filename)}"`);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: `Error ${disposition === 'inline' ? 'viewing' : 'downloading'} file`, error: err.message });
  }
};

// File view and download routes
app.get('/api/view/:email/:filename', serveFile('inline'));
app.get('/api/download/:email/:filename', serveFile('attachment'));

// Static uploads serving
app.use('/uploads', express.static(uploadsDir));

// Health check route
app.get('/', (_, res) => res.json({
  message: 'Skillora Server is running!',
  status: 'healthy',
  timestamp: new Date().toISOString(),
  database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  features: {
    authentication: true,
    fileUploads: true,
    contactForms: true,
    studentProfiles: true
  }
}));

// Auth routes
app.use('/api/auth', authRoutes);

// ---------- ERROR HANDLING ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'File size too large. Maximum size is 10MB per file.',
      LIMIT_FILE_COUNT: 'Too many files. Maximum 10 files allowed.'
    };
    return res.status(400).json({ success: false, message: messages[err.code] || err.message });
  }
  
  // Handle file type validation errors
  if (err.message && err.message.includes('File type not allowed')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => res.status(404).json({
  success: false,
  message: 'Route not found',
  path: req.originalUrl,
  availableRoutes: [
    'GET /api/auth/test',
    'POST /api/auth/signup',
    'POST /api/auth/login',
    'GET /api/student/:userId',
    'PUT /api/student/:userId',
    'GET /api/students',
    'POST /api/contact',
    'POST /api/upload'
  ]
}));

// ---------- DATABASE CONNECTION ----------
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔗 Mongoose disconnected from MongoDB');
});

// ---------- SERVER STARTUP ----------
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`🔧 API Base: http://localhost:${PORT}/api`);
      console.log(`👤 Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`🎓 Student API: http://localhost:${PORT}/api/student`);
      console.log(`📧 Contact API: http://localhost:${PORT}/api/contact`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔥 Shutting down server...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔥 Shutting down server...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();