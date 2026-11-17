const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');
const sendEmail = require('../routes/utils/sendEmail'); // Import your working email utility

// Helper: Find the employer ID from a job across various possible schema fields
const getEmployerId = (job) => {
  return job.postedBy ||
    job.createdBy ||
    job.employer ||
    job.employerId ||
    job.user;
};

/**
 * 1. Job Seeker applies for a job (Supports both file uploads and links)
 */
const applyForJob = async (req, res) => {
  try {
    const { jobId, coverLetter, resumeUrl } = req.body;
    
    // Safely extract the applicant ID from the token payload
    const applicantId = req.user?.userId || req.user?.id || req.user?._id;

    if (!applicantId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing user session or token ID'
      });
    }

    // Only job seekers can apply
    const userRole = (req.user?.role || '').toLowerCase().trim();
    if (!['jobseeker', 'job_seeker'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can apply for jobs'
      });
    }

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required'
      });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Determine resume source: uploaded file path or provided URL link
    const finalResumeUrl = req.file ? req.file.path : resumeUrl;

    if (!finalResumeUrl) {
      return res.status(400).json({
        success: false,
        message: 'Resume file or link is required'
      });
    }

    // Check existing application to prevent duplicates
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: applicantId
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Create application with verified fields
    const newApplication = new Application({
      job: jobId,
      applicant: applicantId,
      coverLetter: coverLetter || '',
      resumeUrl: finalResumeUrl,
      status: 'Pending'
    });

    const savedApplication = await newApplication.save();

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      application: savedApplication
    });

  } catch (error) {
    console.error('Apply Job Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job!' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * 2. Get applications (handles both job seekers and employers)
 */
const getApplications = async (req, res) => {
  try {
    let applications = [];
    const { jobId } = req.query;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const userRole = (req.user?.role || '').toLowerCase().trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing user session'
      });
    }

    if (['jobseeker', 'job_seeker'].includes(userRole)) {
      // Job seekers see their own applications
      applications = await Application.find({ applicant: userId })
        .populate('job', 'title companyName location');
    } else if (userRole === 'employer' || userRole === 'admin') {
      // Employers see applications for their posted jobs
      const jobQuery = {
        $or: [
          { postedBy: userId },
          { createdBy: userId },
          { employer: userId },
          { employerId: userId },
          { user: userId }
        ]
      };

      if (jobId) {
        jobQuery._id = jobId;
      }

      const jobs = await Job.find(jobQuery);
      const jobIds = jobs.map(job => job._id);

      applications = await Application.find({ job: { $in: jobIds } })
        .populate('job', 'title companyName location')
        .populate('applicant', 'name email phone resume skills');
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized role'
      });
    }

    return res.status(200).json({
      success: true,
      applications: applications || []
    });

  } catch (error) {
    console.error('Get Applications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * 3. Employer updates application status & sends notification email
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const employerId = req.user?.userId || req.user?.id || req.user?._id;
    const userRole = (req.user?.role || '').toLowerCase().trim();

    if (userRole !== 'employer' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can update application status'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Application status is required'
      });
    }

    // Populate both job and applicant details so we can access applicant email and name
    const application = await Application.findById(id)
      .populate('job')
      .populate('applicant');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Verify job ownership
    const jobOwnerId = getEmployerId(application.job);
    if (!jobOwnerId || jobOwnerId.toString() !== employerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this application'
      });
    }

    application.status = status;
    await application.save();

    // Dispatch Email Notification to Candidate
    const candidateEmail = application.applicant?.email;
    const candidateName = application.applicant?.name || 'Candidate';
    const jobTitle = application.job?.title || 'the position';

    if (candidateEmail) {
      let subject = `Update on your application for ${jobTitle} - ZestHire`;
      let textMessage = `Hello ${candidateName},\n\nYour application status for "${jobTitle}" has been updated to: ${status}.\n\nLog in to your ZestHire dashboard to view more details.\n\nBest regards,\nZestHire Team`;

      if (status.toLowerCase() === 'shortlisted') {
        subject = `Congratulations! You've been shortlisted for ${jobTitle} - ZestHire`;
        textMessage = `Hi ${candidateName},\n\nGreat news! The employer has reviewed your application for "${jobTitle}" and has shortlisted you for the next steps.\n\nKeep an eye out for further communication regarding interviews!\n\nBest regards,\nZestHire Team`;
      } else if (status.toLowerCase() === 'rejected') {
        subject = `Application Update: ${jobTitle} - ZestHire`;
        textMessage = `Hi ${candidateName},\n\nThank you for your interest in the "${jobTitle}" role. Unfortunately, the employer has decided to move forward with other candidates at this time.\n\nWe wish you the very best in your job search.\n\nBest regards,\nZestHire Team`;
      }

      try {
        await sendEmail({
          to: candidateEmail,
          subject: subject,
          text: textMessage
        });
        console.log(`Status update email sent successfully to ${candidateEmail}`);
      } catch (emailErr) {
        console.warn('Warning: Could not send status update email:', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Application status updated and email notification sent successfully!',
      application
    });

  } catch (error) {
    console.error('Update Status Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  applyForJob,
  getApplications,
  updateApplicationStatus
};