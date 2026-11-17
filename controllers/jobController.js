const User = require('../models/User');
const Job = require('../models/Job');

// Get saved jobs for the logged-in jobseeker
const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    // Fetch user and populate savedJobs with strictPopulate set to false
    const user = await User.findById(userId).populate({
      path: 'savedJobs',
      strictPopulate: false,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      savedJobs: user.savedJobs || [],
    });
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Save a job
const saveJob = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const jobId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already saved
    if (user.savedJobs.includes(jobId)) {
      return res.status(400).json({ message: 'Job already saved' });
    }

    user.savedJobs.push(jobId);
    await user.save();

    res.status(200).json({ success: true, message: 'Job saved successfully' });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove a saved job
const removeSavedJob = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const jobId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.savedJobs = user.savedJobs.filter((id) => id.toString() !== jobId);
    await user.save();

    res.status(200).json({ success: true, message: 'Job removed from saved list' });
  } catch (error) {
    console.error('Error removing saved job:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getSavedJobs,
  saveJob,
  removeSavedJob,
};