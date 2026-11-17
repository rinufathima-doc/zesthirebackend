const express = require('express');
const router = express.Router();
const { 
  getJobApplications, 
  getCandidateDetails, 
  updateApplicationStatus 
} = require('../controllers/employerApplicationController');
const { protect, employerOnly } = require('../middleware/authMiddleware');

router.get('/jobs/:jobId/applications', protect, employerOnly, getJobApplications);
router.get('/applications/:applicationId', protect, employerOnly, getCandidateDetails);
router.patch('/applications/:applicationId/status', protect, employerOnly, updateApplicationStatus);

module.exports = router;