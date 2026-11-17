const Application = require('../models/Application');
const Job = require('../models/Job');

// @desc    Get detailed candidate resume & application info
// @route   GET /api/employer/applications/:applicationId
// @access  Private (Employer)
const getCandidateDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate('job')
      .populate('applicant', '-password');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Verify the job belongs to the logged-in employer
    const job = await Job.findOne({ _id: application.job._id, employer: req.user._id });
    if (!job) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this application' });
    }

    // Format applicant data to ensure resumeUrl is absolute if stored locally
    const applicantObj = application.applicant.toObject();
    if (applicantObj.resumeUrl && !applicantObj.resumeUrl.startsWith('http')) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      applicantObj.resumeUrl = `${baseUrl}${applicantObj.resumeUrl.startsWith('/') ? '' : '/'}${applicantObj.resumeUrl}`;
    }

    res.status(200).json({
      success: true,
      data: {
        ...application.toObject(),
        applicant: applicantObj
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCandidateDetails };