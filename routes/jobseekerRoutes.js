const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const JobSeekerProfile = require('../models/JobSeekerProfile');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');

// ==========================================
// MULTER CONFIG FOR FILE UPLOADS
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const getUserId = (req) => {
  return req.user?.id || req.user?._id || req.user?.userId;
};

// ==========================================
// GET JOBSEEKER PROFILE
// @route   GET /api/jobseeker/profile
// @access  Private
// ==========================================
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId).select('-password');
    const profile = await JobSeekerProfile.findOne({ userId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        ...(profile ? profile.toObject() : {})
      }
    });
  } catch (error) {
    console.error('Fetch Profile Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// UPDATE JOBSEEKER PREFERENCES
// @route   PUT /api/jobseeker/preferences
// @access  Private
// ==========================================
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const { preferredJobTypes, preferredLocations } = req.body;
    const userId = getUserId(req);

    let profile = await JobSeekerProfile.findOne({ userId });

    if (!profile) {
      profile = new JobSeekerProfile({
        userId,
        fullName: req.user.name || 'Job Seeker',
      });
    }

    if (preferredJobTypes) profile.preferredJobTypes = preferredJobTypes;
    if (preferredLocations) profile.preferredLocations = preferredLocations;

    const updatedProfile = await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully!',
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving preferences.',
    });
  }
});

// ==========================================
// UPDATE JOBSEEKER PROFILE INFO (Name, Location, Phone)
// @route   PUT /api/jobseeker/profile
// @access  Private
// ==========================================
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, location, phone } = req.body;

    // Update User model
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, location, phone } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update or create JobSeekerProfile
    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      profile = new JobSeekerProfile({ userId, fullName: name, location, phone });
    } else {
      if (name) profile.fullName = name;
      if (location) profile.location = location;
      if (phone) profile.phone = phone;
    }
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// UPLOAD PROFILE PHOTO
// @route   POST /api/jobseeker/photo
// @access  Private
// ==========================================
router.post('/photo', verifyToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { profilePicture: photoUrl } },
      { new: true }
    ).select('-password');

    // Also update profile record so it stays fully synchronized
    await JobSeekerProfile.findOneAndUpdate(
      { userId },
      { $set: { profilePicture: photoUrl } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully!',
      profilePicture: photoUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Photo Upload Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// UPLOAD RESUME
// @route   POST /api/jobseeker/resume
// @access  Private
// ==========================================
router.post('/resume', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No resume file uploaded' });
    }

    const resumeUrl = `/uploads/${req.file.filename}`;

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      profile = new JobSeekerProfile({ 
        userId, 
        resumeUrl, 
        fullName: req.user?.name || 'Job Seeker' 
      });
    } else {
      profile.resumeUrl = resumeUrl;
    }
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully!',
      resumeUrl,
    });
  } catch (error) {
    console.error('Resume Upload Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GET SAVED JOBS
// @route   GET /api/jobseeker/saved-jobs
// @access  Private
// ==========================================
router.get('/saved-jobs', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId).populate('savedJobs');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      savedJobs: user.savedJobs || [],
    });
  } catch (error) {
    console.error('Fetch Saved Jobs Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SAVE A JOB
// @route   POST /api/jobseeker/saved-jobs
// @access  Private
// ==========================================
router.post('/saved-jobs', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: 'Invalid Job ID format' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { savedJobs: jobId } },
      { new: true, runValidators: true }
    ).populate('savedJobs');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Job saved successfully!',
      savedJobs: updatedUser.savedJobs || [],
    });
  } catch (error) {
    console.error('Save Job Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// REMOVE A SAVED JOB
// @route   DELETE /api/jobseeker/saved-jobs/:jobId
// @access  Private
// ==========================================
router.delete('/saved-jobs/:jobId', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { jobId } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { savedJobs: jobId } },
      { new: true, runValidators: true }
    ).populate('savedJobs');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Job removed from saved list',
      savedJobs: updatedUser.savedJobs || [],
    });
  } catch (error) {
    console.error('Remove Saved Job Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;