require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const authRoutes = require('./routes/auth');
const overviewRoutes = require("./routes/overview");
const achievementRoutes = require("./routes/achievement");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillora';
const uploadsDir = path.join(__dirname, 'uploads');
const DOC_SERVICE_URL = 'http://localhost:5001';

// ---------- MIDDLEWARE ----------
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
app.use((req, _, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
  next();
});

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---------- MODELS ----------
let User, Student, Contact;

try {
  const userModels = require('./models/User');
  User = userModels.User || userModels;
  console.log('User model imported successfully');
} catch (error) {
  console.error('Error importing User model:', error.message);
}

try {
  Student = require('./models/Student');
  console.log('Student model imported successfully');
} catch (error) {
  console.error('Error importing Student model:', error.message);
  
  const studentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    firstName: { type: String, required: true, trim: true, maxLength: 50 },
    lastName: { type: String, required: true, trim: true, maxLength: 50 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxLength: 15 },
    location: { type: String, trim: true, maxLength: 100 },
    bio: { type: String, maxLength: 1000 },
    skills: { type: String, maxLength: 500 },
    experience: { type: String, maxLength: 2000 },
    education: { type: String, maxLength: 1000 },
    linkedIn: { type: String, validate: { validator: v => !v || /^https?:\/\/.+/.test(v) } },
    github: { type: String, validate: { validator: v => !v || /^https?:\/\/.+/.test(v) } },
    website: { type: String, validate: { validator: v => !v || /^https?:\/\/.+/.test(v) } },
    isActive: { type: Boolean, default: true }
  }, { timestamps: true });

  Student = mongoose.model('Student', studentSchema);
  console.log('Student model created inline');
}

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxLength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, required: true, trim: true, maxLength: 200 },
  message: { type: String, required: true, maxLength: 2000 },
  status: { type: String, enum: ['new', 'read', 'replied', 'archived'], default: 'new' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

// ---------- HELPERS ----------
const sanitizeEmailForFolder = email => email.toLowerCase().split('@')[0].replace(/[^a-z0-9]/g, '_');
const getUserFolderPath = email => path.join(uploadsDir, sanitizeEmailForFolder(email));

const findUserFolder = (email) => {
  const sanitizedPath = path.join(uploadsDir, sanitizeEmailForFolder(email));
  if (fs.existsSync(sanitizedPath)) return sanitizedPath;
  
  const oldPath = path.join(uploadsDir, email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_'));
  return fs.existsSync(oldPath) ? oldPath : null;
};

const isDocServiceAvailable = async () => {
  try {
    const response = await axios.get(`${DOC_SERVICE_URL}/health`, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Skillora-Server/1.0'
      }
    });
    return response.status === 200 && response.data.status === 'healthy';
  } catch (error) {
    console.warn('Document service health check failed:', error.message);
    return false;
  }
};

// ---------- MULTER ----------
const storage = multer.diskStorage({
  destination: (req, _, cb) => {
    const { email } = req.body;
    if (!email) return cb(new Error('User email is required'));
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

const tempStorage = multer.diskStorage({
  destination: (req, _, cb) => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `temp-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const fileFilter = (_, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 
                       'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedExts = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
  const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(file.mimetype) && allowedExts.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Only JPG, PNG, PDF, and DOC files permitted. Received: ${file.mimetype}`), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 10 } });
const tempUpload = multer({ storage: tempStorage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ---------- DOCUMENT PROCESSING ROUTES ----------

app.post('/api/document/extract', tempUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const serviceAvailable = await isDocServiceAvailable();
    if (!serviceAvailable) {
      fs.unlinkSync(req.file.path);
      return res.status(503).json({
        success: false,
        message: 'Document processing service unavailable. Please ensure the Python service is running on port 5001.'
      });
    }

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(req.file.path));
      formData.append('extract_keywords', 'true');
      formData.append('categorize_skills', 'true'); 

      console.log('Sending request to local Python service...');
      
      const response = await axios.post(`${DOC_SERVICE_URL}/analyze_and_recommend`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      console.log('Python service response received');
      
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        filename: req.file.originalname,
        ...response.data
      });

    } catch (axiosError) {
      console.error('Python service error:', axiosError.response?.data || axiosError.message);
      
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Document analysis failed',
        error: axiosError.response?.data?.error || axiosError.message,
        details: axiosError.response?.data || null
      });
    }

  } catch (error) {
    console.error('Document extraction error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to process document',
      error: error.message
    });
  }
});

app.post('/api/document/extract-from-file', async (req, res) => {
  try {
    const { email, filename, extract_keywords = true, categorize_skills = true } = req.body;

    if (!email || !filename) {
      return res.status(400).json({ success: false, message: 'Email and filename required' });
    }

    const userFolder = findUserFolder(email);
    if (!userFolder) {
      return res.status(404).json({ success: false, message: 'User folder not found' });
    }

    const filePath = path.join(userFolder, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const serviceAvailable = await isDocServiceAvailable();
    if (!serviceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Document processing service unavailable. Please ensure the Python service is running on port 5001.'
      });
    }

    try {
      console.log(`Analyzing file: ${filePath}`);
      
      const response = await axios.post(`${DOC_SERVICE_URL}/document/analyze_from_path`, {
        file_path: filePath,
        extract_keywords: extract_keywords,
        categorize_skills: categorize_skills
      }, { 
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('File analysis completed');

      res.json({
        success: true,
        filename: filename,
        ...response.data
      });

    } catch (axiosError) {
      console.error('Python service error:', axiosError.response?.data || axiosError.message);
      
      res.status(500).json({
        success: false,
        message: 'Document analysis failed',
        error: axiosError.response?.data?.error || axiosError.message,
        details: axiosError.response?.data || null
      });
    }

  } catch (error) {
    console.error('Document extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze document',
      error: error.message
    });
  }
});

app.post('/api/skills/categorize', async (req, res) => {
  try {
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ success: false, message: 'Skills array is required' });
    }

    const serviceAvailable = await isDocServiceAvailable();
    if (!serviceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Skill categorization service unavailable'
      });
    }

    const response = await axios.post(`${DOC_SERVICE_URL}/skills/categorize`, {
      skills: skills
    }, { timeout: 30000 });

    res.json(response.data);

  } catch (error) {
    console.error('Skill categorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to categorize skills',
      error: error.response?.data?.error || error.message
    });
  }
});

app.post('/api/analyze-and-recommend', tempUpload.single('file'), async (req, res) => {
  try {
    const serviceAvailable = await isDocServiceAvailable();
    if (!serviceAvailable) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(503).json({
        success: false,
        message: 'Document processing service unavailable. Please ensure the Python service is running on port 5001.'
      });
    }

    try {
      let response;
      
      if (req.file) {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));
        
        response = await axios.post(`${DOC_SERVICE_URL}/analyze_and_recommend`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 120000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });
        
        fs.unlinkSync(req.file.path);
      } else {
        const requestData = req.body;
        
        response = await axios.post(`${DOC_SERVICE_URL}/analyze_and_recommend`, requestData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 120000
        });
      }

      res.json({
        success: true,
        ...response.data
      });

    } catch (axiosError) {
      console.error('Python service error:', axiosError.response?.data || axiosError.message);
      
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Analysis and recommendation failed',
        error: axiosError.response?.data?.error || axiosError.message,
        details: axiosError.response?.data || null
      });
    }

  } catch (error) {
    console.error('Combined analysis error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to perform analysis and recommendation',
      error: error.message
    });
  }
});

app.get('/api/sectors', async (req, res) => {
  try {
    const serviceAvailable = await isDocServiceAvailable();
    if (!serviceAvailable) {
      // Return hardcoded sectors if service is unavailable
      return res.json({
        success: true,
        sectors: [
          "Technology",
          "Life Sciences", 
          "Physical Sciences",
          "Business & Management",
          "Education & Training",
          "Creative & Design",
          "Industrial & Manufacturing",
          "Social Sciences",
          "Other"
        ],
        total_sectors: 9
      });
    }

    const response = await axios.get(`${DOC_SERVICE_URL}/sectors`, { timeout: 10000 });
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sectors',
      error: error.response?.data?.error || error.message
    });
  }
});

app.get('/api/sectors/:sector/skills', async (req, res) => {
  try {
    const { sector } = req.params;
    
    const serviceAvailable = await isDocServiceAvailable();
    if (!serviceAvailable) {
      // Return hardcoded sector skills if service is unavailable
      const sectorSkills = {
        "Technology": [
          "Python", "JavaScript", "Java", "React", "Node.js", "SQL", "AWS", 
          "Machine Learning", "Data Science", "Software Development"
        ],
        "Life Sciences": [
          "Biology", "Medical Research", "Clinical Trials", "Biotechnology", 
          "Pharmaceuticals", "Laboratory Skills", "Genetics", "Biochemistry"
        ],
        "Physical Sciences": [
          "Physics", "Chemistry", "Mathematics", "Statistics", "Research", 
          "Laboratory Analysis", "Materials Science", "Data Analysis"
        ],
        "Business & Management": [
          "Project Management", "Business Analysis", "Finance", "Marketing", 
          "Leadership", "Strategic Planning", "Operations Management"
        ]
      };
      
      const skills = sectorSkills[sector] || [];
      return res.json({
        success: true,
        sector: sector,
        skills: skills,
        skill_count: skills.length
      });
    }

    const response = await axios.get(`${DOC_SERVICE_URL}/sectors/${encodeURIComponent(sector)}/skills`, { 
      timeout: 10000 
    });
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching sector skills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sector skills',
      error: error.response?.data?.error || error.message
    });
  }
});

app.get('/api/document/status', async (req, res) => {
  try {
    const available = await isDocServiceAvailable();
    
    let serviceInfo = {
      available: available,
      service_url: DOC_SERVICE_URL,
      processing_type: 'Local Only'
    };

    if (available) {
      try {
        const healthResponse = await axios.get(`${DOC_SERVICE_URL}/health`, { timeout: 5000 });
        serviceInfo = {
          ...serviceInfo,
          ...healthResponse.data
        };
      } catch (healthError) {
        console.warn('Could not get detailed service info:', healthError.message);
      }
    }

    res.json({
      success: true,
      ...serviceInfo
    });
  } catch (error) {
    res.json({
      success: false,
      available: false,
      service_url: DOC_SERVICE_URL,
      processing_type: 'Local Only',
      error: error.message
    });
  }
});

// ---------- STUDENT ROUTES ----------

app.get('/api/student/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    let student = await Student.findOne({ userId }).populate('userId', 'firstName lastName email');
    
    if (!student) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      student = await new Student({
        userId: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email
      }).save();
      
      student = await Student.findOne({ userId }).populate('userId', 'firstName lastName email');
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student profile' });
  }
});

app.put('/api/student/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    delete profileData.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    let student = await Student.findOne({ userId });
    if (!student) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      student = new Student({ userId, ...profileData });
    } else {
      Object.assign(student, profileData);
    }

    await student.save();
    const updated = await Student.findById(student._id).populate('userId', 'firstName lastName email');
    res.json({ success: true, message: 'Profile updated successfully!', student: updated });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ---------- CORE ROUTES ----------

app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    if (!req.body.email) return res.status(400).json({ success: false, message: 'User email required' });

    const files = req.files.map(f => ({
      originalName: f.originalname, filename: f.filename, size: f.size,
      mimetype: f.mimetype, userFolder: sanitizeEmailForFolder(req.body.email)
    }));

    res.json({ success: true, message: `${files.length} file(s) uploaded`, files, userFolder: sanitizeEmailForFolder(req.body.email) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    
    const contact = await new Contact({
      name: name.trim(), email: email.toLowerCase().trim(),
      subject: subject.trim(), message: message.trim(), userId: userId || null
    }).save();
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully!',
      submissionId: contact._id
    });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit contact form' });
  }
});

app.get('/api/files/:email', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const folder = findUserFolder(email);
    
    if (!folder) return res.status(404).json({ success: false, message: 'No files found' });

    const files = fs.readdirSync(folder).map(name => {
      const stats = fs.statSync(path.join(folder, name));
      return { filename: name, size: stats.size, uploadDate: stats.birthtime };
    });
    
    res.json({ success: true, userFolder: path.basename(folder), filesCount: files.length, files });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching files', error: err.message });
  }
});

app.delete('/api/delete/:email/:filename', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const folder = findUserFolder(email);
    
    if (!folder) return res.status(404).json({ success: false, message: 'User folder not found' });
    
    const filePath = path.join(folder, decodeURIComponent(req.params.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed', error: err.message });
  }
});

const serveFile = (disposition) => (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const folder = findUserFolder(email);
    
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    
    const filePath = path.join(folder, decodeURIComponent(req.params.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    
    res.setHeader('Content-Disposition', `${disposition}; filename="${decodeURIComponent(req.params.filename)}"`);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: 'File serve failed', error: err.message });
  }
};

app.get('/api/view/:email/:filename', serveFile('inline'));
app.get('/api/download/:email/:filename', serveFile('attachment'));

app.use('/uploads', express.static(uploadsDir));

app.get('/', (_, res) => res.json({
  message: 'Skillora Server with Local Document Processing & Sector-Based Classification is running!',
  status: 'healthy',
  timestamp: new Date().toISOString(),
  database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  features: { 
    authentication: true, 
    fileUploads: true, 
    contactForms: true, 
    studentProfiles: true, 
    documentProcessing: true,
    keywordExtraction: true,
    sectorBasedClassification: true,
    skillCategorization: true,
    jobRecommendations: false,
    localProcessingOnly: true
  },
  documentServiceUrl: DOC_SERVICE_URL,
  supportedSectors: [
    "Technology",
    "Life Sciences", 
    "Physical Sciences",
    "Business & Management",
    "Education & Training",
    "Creative & Design",
    "Industrial & Manufacturing",
    "Social Sciences",
    "Other"
  ],
  processingType: "Local Only - No External APIs - No Job Recommendations"
}));

app.use('/api/auth', authRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/achievements", achievementRoutes);

// ---------- ERROR HANDLING ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'File too large. Max 10MB per file.',
      LIMIT_FILE_COUNT: 'Too many files. Max 10 files allowed.'
    };
    return res.status(400).json({ success: false, message: messages[err.code] || err.message });
  }
  
  if (err.message?.includes('File type not allowed')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use('*', (req, res) => res.status(404).json({
  success: false, message: 'Route not found', path: req.originalUrl
}));

// ---------- DATABASE & STARTUP ----------
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Error:", err.message);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    const docAvailable = await isDocServiceAvailable();
    console.log(`Document Service: ${docAvailable ? 'Available' : 'Not Available'}`);
    console.log(`Processing Type: Local Only - No External APIs - No Job Recommendations`);
    console.log(`Keyword Extraction: ${docAvailable ? 'Available' : 'Not Available'}`);
    console.log(`Sector Classification: ${docAvailable ? 'Available' : 'Not Available'}`);
    console.log(`Job Recommendations: Disabled/Removed`);
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`Document Service: ${DOC_SERVICE_URL} (Local Processing Only - No Job Recommendations)`);
      console.log(`Features: Document Processing, Sector-Based Classification, Skill Categorization`);
      console.log(`Available API Endpoints:`);
      console.log(`   /api/document/extract - Upload & analyze documents`);
      console.log(`   /api/document/extract-from-file - Analyze existing files`);
      console.log(`   /api/analyze-and-recommend - Combined analysis & skill categorization`);
      console.log(`   /api/skills/categorize - Categorize skills by sector (Local)`);
      console.log(`   /api/sectors - Get available sectors`);
      console.log(`   /api/sectors/:sector/skills - Get skills by sector`);
      console.log(`   NOTE: Career goals endpoints removed`);
    });
  } catch (error) {
    console.error('Server start failed:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();