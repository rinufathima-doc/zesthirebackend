const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const Application = require("../models/Application");
const { verifyToken } = require("../middleware/authMiddleware");

// 1. Get all jobs for authenticated employer with calculated application counts & company info
router.get("/jobs", verifyToken, async (req, res) => {
  try {
    const employerId = req.user.id || req.user._id;

    // Find jobs created by this employer and populate employer/creator details
    const jobs = await Job.find({ 
      $or: [{ employerId: employerId }, { createdBy: employerId }] 
    })
      .populate("employerId createdBy", "companyName company name email")
      .sort({ createdAt: -1 });

    // Aggregate candidate count per job dynamically from Applications collection
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({ job: job._id });
        const jobObj = job.toObject();

        // Attach companyName directly onto each job object
        const companyName = 
          job.employerId?.companyName || 
          job.employerId?.company || 
          job.createdBy?.companyName || 
          job.createdBy?.company || 
          job.createdBy?.name ||
          req.user?.companyName ||
          req.user?.company ||
          req.user?.name;

        return { 
          ...jobObj, 
          applicantCount: count,
          companyName: companyName || "My Company"
        };
      })
    );

    return res.status(200).json(jobsWithCounts);
  } catch (err) {
    console.error("Fetch Employer Jobs Error:", err);
    return res.status(500).json({ error: "Server error fetching jobs" });
  }
});

// 2. Toggle Status (Active / Closed)
router.patch("/jobs/:id/status", verifyToken, async (req, res) => {
  try {
    const employerId = req.user.id || req.user._id;
    const { status } = req.body;

    if (!["Active", "Closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const job = await Job.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [{ employerId: employerId }, { createdBy: employerId }] 
      },
      { status },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error("Update Status Error:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

// 3. Update Job Details
router.put("/jobs/:id", verifyToken, async (req, res) => {
  try {
    const employerId = req.user.id || req.user._id;

    const updatedJob = await Job.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [{ employerId: employerId }, { createdBy: employerId }] 
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    return res.status(200).json({ success: true, job: updatedJob });
  } catch (err) {
    console.error("Update Job Error:", err);
    return res.status(500).json({ error: "Failed to update job details" });
  }
});

// 4. Delete Job
router.delete("/jobs/:id", verifyToken, async (req, res) => {
  try {
    const employerId = req.user.id || req.user._id;

    const deletedJob = await Job.findOneAndDelete({ 
      _id: req.params.id, 
      $or: [{ employerId: employerId }, { createdBy: employerId }] 
    });

    if (!deletedJob) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    // Clean up related applications
    await Application.deleteMany({ job: req.params.id });

    return res.status(200).json({ success: true, message: "Job deleted successfully" });
  } catch (err) {
    console.error("Delete Job Error:", err);
    return res.status(500).json({ error: "Failed to delete job" });
  }
});

module.exports = router;