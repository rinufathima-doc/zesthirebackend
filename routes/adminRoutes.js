const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User'); // Adjust path to your User model if needed
const Job = require('../models/Job');
const { verifyToken } = require('../middleware/authMiddleware');

// ==========================================
// ADMIN MIDDLEWARE (Inline check for admin role)
// ==========================================
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
      next();
    } else {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
  });
};

// ==========================================
// GET ADMIN PLATFORM STATS
// Endpoint: GET /api/admin/stats
// ==========================================
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalJobSeekers = await User.countDocuments({ role: 'jobSeeker' });
    const totalEmployers = await User.countDocuments({ role: 'employer' });
    const totalJobs = await Job.countDocuments();

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalJobSeekers,
        totalEmployers,
        totalJobs,
      },
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GET ALL USERS (For Admin Directory)
// Endpoint: GET /api/admin/users
// ==========================================
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    // Fetch all users, excluding passwords for security
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Fetch All Users Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DELETE A USER BY ID
// Endpoint: DELETE /api/admin/users/:id
// ==========================================
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Optional: If an employer is deleted, you can also delete their posted jobs
    if (deletedUser.role === 'employer') {
      await Job.deleteMany({ createdBy: id });
    }

    return res.status(200).json({
      success: true,
      message: 'User and associated data deleted successfully!',
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GET ALL JOBS (Admin Moderation View)
// Endpoint: GET /api/admin/jobs
// ==========================================
router.get('/jobs', verifyAdmin, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).populate('createdBy', 'name email companyName');
    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    console.error('Admin Fetch Jobs Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DELETE ANY JOB BY ID (Admin Moderation)
// Endpoint: DELETE /api/admin/jobs/:id
// ==========================================
router.delete('/jobs/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID format' });
    }

    const deletedJob = await Job.findByIdAndDelete(id);

    if (!deletedJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Job removed successfully by admin!',
    });
  } catch (error) {
    console.error('Admin Delete Job Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;