const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverLetter: {
      type: String,
      default: '',
      trim: true,
    },
    resumeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Shortlisted', 'Rejected'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate applications from the same candidate for the same job
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports =
  mongoose.models.Application ||
  mongoose.model('Application', applicationSchema);