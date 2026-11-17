const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");

// Configure Multer for temporary file uploads (stores files in an 'uploads/' folder)
const upload = multer({ dest: "uploads/" });

const Application = require("../models/Application");
const sendEmail = require("../routes/utils/sendEmail"); // Verify this path matches where sendEmail.js is saved

// Import application controllers
const {
  applyForJob,
  getApplications,
} = require("../controllers/applicationController");

// Import authentication middleware
const {
  verifyToken,
  verifyJobSeeker,
} = require("../middleware/authMiddleware");

// ==========================================
// JOB SEEKER ROUTES
// ==========================================

// Job seeker applies for a job (upload.single('resume') parses the file and form data)
// POST /api/applications
router.post(
  "/",
  verifyJobSeeker,
  upload.single("resume"),
  applyForJob
);

// ==========================================
// APPLICATION VIEW ROUTES
// ==========================================

// Job seeker: View their own applications
// Employer: View applications for their posted jobs
// GET /api/applications
router.get("/", verifyToken, getApplications);

// ==========================================
// UPDATE APPLICATION STATUS & NOTIFY CANDIDATE
// PATCH /api/applications/:id/status
// ==========================================
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Pending', 'Shortlisted', 'Rejected'

    if (!["Pending", "Shortlisted", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid application ID format" });
    }

    // Populate both "job" and "applicant" so we get the candidate's email and name
    const application = await Application.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: "after", runValidators: true }
    )
      .populate("job")
      .populate("applicant", "name email");

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Extract candidate and job details safely
    const candidateEmail = application.applicant?.email || application.email;
    const candidateName = application.applicant?.name || application.name || "Candidate";
    const jobTitle = application.job ? application.job.title : "the position";
    const companyName = application.job?.companyName || "ZestHire Partner";

    // Send Email Notification when Shortlisted
    if (status === "Shortlisted") {
      if (candidateEmail) {
        await sendEmail({
          to: candidateEmail,
          subject: `🎉 You've been shortlisted for ${jobTitle}!`,
          text: `Hi ${candidateName},\n\nGreat news! Your application for "${jobTitle}" at ${companyName} has been shortlisted.\n\nThe employer will review next steps and may reach out to schedule an interview soon.\n\nBest regards,\nZestHire Team`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px;">
              <h2 style="color: #8cc63f;">Congratulations, ${candidateName}! 🎉</h2>
              <p>Great news! Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been moved to the <strong>Shortlisted</strong> stage.</p>
              <p>Keep an eye on your inbox for upcoming interview details.</p>
              <br />
              <p>Best regards,<br/><strong>ZestHire Team</strong></p>
            </div>
          `,
        });
      } else {
        console.warn("⚠️ Candidate shortlisted, but no email address found on application:", id);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Application marked as ${status} successfully.`,
      application,
    });
  } catch (error) {
    console.error("Update Application Status Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// EXPORT ROUTER
// ==========================================
module.exports = router;