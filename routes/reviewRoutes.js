const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/review');
const { verifyToken } = require('../middleware/authMiddleware');

// ==========================================
// GET REVIEWS FOR A SPECIFIC EMPLOYER / COMPANY
// Endpoint: GET /api/reviews/employer/:employerId
// ==========================================
router.get('/employer/:employerId', async (req, res) => {
  try {
    const { employerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employerId)) {
      return res.status(400).json({ success: false, message: 'Invalid employer ID' });
    }

    const reviews = await Review.find({ employer: employerId })
      .populate('jobseeker', 'name email')
      .sort({ createdAt: -1 });

    // Calculate average rating
    let averageRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = (sum / reviews.length).toFixed(1);
    }

    return res.status(200).json({
      success: true,
      averageRating: Number(averageRating),
      totalReviews: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error('Fetch Reviews Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST A NEW REVIEW (Job Seekers Only)
// Endpoint: POST /api/reviews
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const { employerId, rating, title, comment } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const userRole = (req.user?.role || '').toLowerCase().trim();

    if (!['jobseeker', 'job_seeker'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can submit company reviews',
      });
    }

    if (!employerId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Employer ID, rating, and comment are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Check if review already exists from this user for this employer
    const existingReview = await Review.findOne({ employer: employerId, jobseeker: userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this company. You can edit your existing review.',
      });
    }

    const newReview = await Review.create({
      employer: employerId,
      jobseeker: userId,
      rating: Number(rating),
      title: title || 'Candidate Experience',
      comment,
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      review: newReview,
    });
  } catch (error) {
    console.error('Create Review Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;