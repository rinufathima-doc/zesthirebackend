const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");

const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const JobSeekerProfile = require("../models/JobSeekerProfile");

const { verifyEmployer, verifyToken } = require("../middleware/authMiddleware");

const upload = multer({ dest: "uploads/" });

// ==========================================
// HELPER: GET LOGGED-IN USER ID
// ==========================================

const getUserId = (req) => {
  return req.user?.userId || req.user?.id || req.user?._id;
};

// ==========================================
// SAVED JOBS HANDLERS (PLACED FIRST TO AVOID :id CONFLICTS)
// ==========================================

const handleGetSavedJobs = async (req, res) => {
  try {
    const userId = getUserId(req);
    const profile = await JobSeekerProfile.findOne({ userId }).populate({
      path: "savedJobs",
      select:
        "title companyName location jobType salary basicSalary description createdAt employerId postedBy createdBy",
    });

    if (!profile) {
      return res.status(200).json({ success: true, savedJobs: [] });
    }

    return res.status(200).json({
      success: true,
      savedJobs: profile.savedJobs || [],
    });
  } catch (error) {
    console.error("Fetch Saved Jobs Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleSaveJob = async (req, res) => {
  try {
    const jobId = req.body.jobId || req.params.id;
    const userId = getUserId(req);

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job ID format" });
    }

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      profile = new JobSeekerProfile({
        userId,
        fullName: req.user?.name || req.user?.fullName || "Candidate",
        savedJobs: [],
      });
    }

    if (!profile.savedJobs) {
      profile.savedJobs = [];
    }

    const objectIdJobId = new mongoose.Types.ObjectId(jobId);
    if (!profile.savedJobs.some((id) => id.equals(objectIdJobId))) {
      profile.savedJobs.push(objectIdJobId);
      await profile.save();
    }

    return res.status(200).json({
      success: true,
      message: "Job saved successfully!",
    });
  } catch (error) {
    console.error("Save Job Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleRemoveSavedJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = getUserId(req);

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job ID format" });
    }

    const profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    if (profile.savedJobs) {
      profile.savedJobs = profile.savedJobs.filter(
        (id) => id.toString() !== jobId,
      );
      await profile.save();
    }

    return res.status(200).json({
      success: true,
      message: "Job removed from saved list",
    });
  } catch (error) {
    console.error("Remove Saved Job Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Register saved job routes ABOVE any dynamic /:id routes
router.get("/saved-jobs", verifyToken, handleGetSavedJobs);
router.get("/jobseeker/saved-jobs", verifyToken, handleGetSavedJobs);

router.post("/saved-jobs", verifyToken, handleSaveJob);
router.post("/jobseeker/saved-jobs", verifyToken, handleSaveJob);
router.post("/save/:id", verifyToken, handleSaveJob);

router.delete("/saved-jobs/:id", verifyToken, handleRemoveSavedJob);
router.delete("/jobseeker/saved-jobs/:id", verifyToken, handleRemoveSavedJob);
router.delete("/save/:id", verifyToken, handleRemoveSavedJob);

// ==========================================
// GET ALL JOBS (PUBLIC)
// GET /api/jobs
// ==========================================

router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });

    return res.status(200).json(jobs);
  } catch (error) {
    console.error("Get All Jobs Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// GET EMPLOYER JOBS
// GET /api/jobs/employer/jobs
// ==========================================

router.get("/employer/jobs", verifyEmployer, async (req, res) => {
  try {
    const employerId = getUserId(req);

    const jobs = await Job.find({
      $or: [{ createdBy: employerId }, { employerId: employerId }],
    }).sort({ createdAt: -1 });

    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({
          job: job._id,
        });

        return {
          ...job.toObject(),
          applicantCount: count,
        };
      }),
    );

    return res.status(200).json(jobsWithCounts);
  } catch (error) {
    console.error("Get Employer Jobs Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// GET INCOMING APPLICATIONS
// GET /api/jobs/employer/incoming-applications
// ==========================================

router.get(
  "/employer/incoming-applications",
  verifyEmployer,
  async (req, res) => {
    try {
      const employerId = getUserId(req);

      const employerJobs = await Job.find({
        $or: [{ createdBy: employerId }, { employerId: employerId }],
      }).select("_id title companyName location");

      const jobIds = employerJobs.map((job) => job._id);

      const applications = await Application.find({
        job: { $in: jobIds },
      })
        .populate("job", "title companyName location jobType")
        .populate("applicant", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: applications.length,
        applications,
      });
    } catch (error) {
      console.error("Fetch Employer Applications Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// ==========================================
// GET LOGGED-IN EMPLOYER PROFILE
// GET /api/jobs/employer/profile
// ==========================================

router.get("/employer/profile", verifyEmployer, async (req, res) => {
  try {
    const employerId = getUserId(req);

    const user = await User.findById(employerId).select(
      "name fullName companyName email industry companyWebsite phone location bio profilePicture",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        fullName: user.fullName,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
        industry: user.industry,
        companyWebsite: user.companyWebsite,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Fetch Employer Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employer profile",
    });
  }
});

// ==========================================
// UPDATE EMPLOYER PROFILE
// PUT /api/jobs/employer/profile
// ==========================================

router.put("/employer/profile", verifyEmployer, async (req, res) => {
  try {
    const employerId = getUserId(req);

    const allowedFields = [
      "companyName",
      "contactName",
      "name",
      "industry",
      "companyWebsite",
      "phone",
      "location",
      "bio",
      "profilePicture",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (typeof updates.companyName === "string") {
      updates.companyName = updates.companyName.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      employerId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Employer Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// POST A NEW JOB
// POST /api/jobs
// ==========================================

router.post("/", verifyEmployer, async (req, res) => {
  try {
    const {
      title,
      location,
      jobType,
      basicSalary,
      requiredSkills,
      experience,
      qualifications,
      description,
      applicationDeadline,
    } = req.body;

    const employerId = getUserId(req);

    const employer = await User.findById(employerId);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    if (!employer.companyName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please update your company name before posting a job.",
      });
    }

    const newJob = new Job({
      title,
      companyName: employer.companyName.trim(),
      location,
      jobType,
      basicSalary: basicSalary ? Number(basicSalary) : undefined,

      requiredSkills: Array.isArray(requiredSkills)
        ? requiredSkills
        : String(requiredSkills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),

      experience,
      qualifications,
      description,

      applicationDeadline: applicationDeadline
        ? new Date(applicationDeadline)
        : undefined,

      createdBy: employerId,
      employerId: employerId,
      postedBy: employerId,
      employer: employerId,
      status: "Active",
    });

    const savedJob = await newJob.save();

    return res.status(201).json({
      success: true,
      message: "Job posted successfully!",
      job: savedJob,
    });
  } catch (error) {
    console.error("Job Creation Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error creating job",
    });
  }
});

// ==========================================
// UPDATE JOB DETAILS
// PUT /api/jobs/:id
// ==========================================

router.put("/:id", verifyEmployer, async (req, res) => {
  try {
    const jobId = req.params.id;
    const employerId = getUserId(req);

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (
      job.createdBy?.toString() !== employerId.toString() &&
      job.employerId?.toString() !== employerId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to edit this job",
      });
    }

    const allowedFields = [
      "title",
      "location",
      "jobType",
      "basicSalary",
      "requiredSkills",
      "experience",
      "qualifications",
      "requirements",
      "description",
      "applicationDeadline",
      "status",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job: updatedJob,
    });
  } catch (error) {
    console.error("Update Job Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// UPDATE JOB STATUS
// PATCH /api/jobs/:id/status
// ==========================================

router.patch("/:id/status", verifyEmployer, async (req, res) => {
  try {
    const jobId = req.params.id;
    const employerId = getUserId(req);
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    if (!["Active", "Closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (
      job.createdBy?.toString() !== employerId.toString() &&
      job.employerId?.toString() !== employerId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to modify this job",
      });
    }

    job.status = status;
    await job.save();

    return res.status(200).json({
      success: true,
      message: `Job status updated to ${status}`,
      job,
    });
  } catch (error) {
    console.error("Update Job Status Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// DELETE JOB POSTING
// DELETE /api/jobs/:id
// ==========================================

router.delete("/:id", verifyEmployer, async (req, res) => {
  try {
    const jobId = req.params.id;
    const employerId = getUserId(req);

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (
      job.createdBy?.toString() !== employerId.toString() &&
      job.employerId?.toString() !== employerId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this job",
      });
    }

    await Job.findByIdAndDelete(jobId);

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Delete Job Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// APPLY FOR A JOB
// POST /api/jobs/:id/apply
// ==========================================

router.post(
  "/:id/apply",
  verifyToken,
  upload.single("resume"),
  async (req, res) => {
    try {
      const jobId = req.params.id;
      const { coverLetter, resumeUrl } = req.body;
      const applicantId = getUserId(req);

      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job ID format",
        });
      }

      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      const uploadedFile = req.file ? `/uploads/${req.file.filename}` : null;
      const finalResumeUrl = uploadedFile || resumeUrl;

      if (!finalResumeUrl) {
        return res.status(400).json({
          success: false,
          message: "Resume file or link is required.",
        });
      }

      if (!coverLetter) {
        return res.status(400).json({
          success: false,
          message: "Cover letter is required.",
        });
      }

      const newApplication = await Application.create({
        job: jobId,
        applicant: applicantId,
        coverLetter,
        resumeUrl: finalResumeUrl,
        status: "Pending",
      });

      return res.status(201).json({
        success: true,
        message: "Application submitted successfully to employer!",
        application: newApplication,
      });
    } catch (error) {
      console.error("Job Application Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Error submitting application",
      });
    }
  },
);

// ==========================================
// GET PUBLIC COMPANY PROFILE BY ID
// GET /api/jobs/company/:id
// ==========================================

router.get("/company/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
    }

    const user = await User.findById(id).select(
      "name fullName companyName email industry companyWebsite phone location bio profilePicture role"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Fetch Public Company Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// GET SINGLE JOB BY ID
// GET /api/jobs/:id
// ==========================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    return res.status(200).json(job);
  } catch (error) {
    console.error("Get Single Job Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;