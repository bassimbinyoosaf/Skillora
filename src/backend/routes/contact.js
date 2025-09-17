const express = require('express');
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const User = require('../models/User').User;

const router = express.Router();

// Helper function for error handling
const handleServerError = (res, error, message = 'Server error') => {
  console.error(`❌ ${message}:`, error);
  res.status(500).json({ success: false, message: message });
};

// Submit contact form
router.post('/submit', async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;
    
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
    
    // Check if user exists if userId is provided
    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    
    // Create contact submission
    const contactSubmission = new Contact({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      user: user ? user._id : null
    });
    
    const savedSubmission = await contactSubmission.save();
    
    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      submissionId: savedSubmission._id
    });
    
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }
    handleServerError(res, error, 'Failed to submit contact form');
  }
});

// Get all contact submissions (admin only)
router.get('/submissions', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status && ['new', 'read', 'replied', 'archived'].includes(status)) {
      query.status = status;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: { path: 'user', select: 'firstName lastName email' }
    };
    
    const submissions = await Contact.paginate(query, options);
    
    res.json({
      success: true,
      submissions: submissions.docs,
      total: submissions.total,
      pages: submissions.pages,
      currentPage: submissions.page
    });
    
  } catch (error) {
    handleServerError(res, error, 'Failed to fetch contact submissions');
  }
});

// Get submission by ID
router.get('/submission/:id', async (req, res) => {
  try {
    const submission = await Contact.findById(req.params.id)
      .populate({ path: 'user', select: 'firstName lastName email' });
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    res.json({
      success: true,
      submission
    });
    
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid submission ID' 
      });
    }
    handleServerError(res, error, 'Failed to fetch submission');
  }
});

// Update submission status
router.patch('/submission/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be "new", "read", "replied", or "archived"' 
      });
    }
    
    const submission = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate({ path: 'user', select: 'firstName lastName email' });
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    res.json({
      success: true,
      message: `Submission status updated to ${status}`,
      submission
    });
    
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid submission ID' 
      });
    }
    handleServerError(res, error, 'Failed to update submission status');
  }
});

// Delete submission
router.delete('/submission/:id', async (req, res) => {
  try {
    const submission = await Contact.findByIdAndDelete(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
    
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid submission ID' 
      });
    }
    handleServerError(res, error, 'Failed to delete submission');
  }
});

module.exports = router;