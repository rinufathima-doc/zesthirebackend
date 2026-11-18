const JobSeekerProfile = require("../models/JobSeekerProfile");

// @desc    Get Jobseeker Resume URL
// @route   GET /api/jobseeker/resume
// @access  Private (Jobseeker)
const getResume = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const profile = await JobSeekerProfile.findOne({ userId }).select("resumeUrl updatedAt");

    if (!profile || !profile.resumeUrl) {
      return res.status(404).json({ success: false, message: "No resume found for this user." });
    }

    res.status(200).json({
      success: true,
      resumeUrl: profile.resumeUrl,
      updatedAt: profile.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ success: false, message: "Server error while fetching resume." });
  }
};

// @desc    Upload or Update Jobseeker Resume URL
// @route   PUT /api/jobseeker/resume
// @access  Private (Jobseeker)
const updateResume = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { resumeUrl } = req.body;

    if (!resumeUrl) {
      return res.status(400).json({ success: false, message: "Resume URL is required." });
    }

    // Upsert ensures a profile is created if it doesn't exist yet for this user
    const updatedProfile = await JobSeekerProfile.findOneAndUpdate(
      { userId },
      { resumeUrl },
      { new: true, upsert: true }
    ).select("resumeUrl updatedAt");

    res.status(200).json({
      success: true,
      message: "Resume updated successfully!",
      resumeUrl: updatedProfile.resumeUrl,
    });
  } catch (error) {
    console.error("Error updating resume:", error);
    res.status(500).json({ success: false, message: "Server error while updating resume." });
  }
};

module.exports = {
  getResume,
  updateResume,
};