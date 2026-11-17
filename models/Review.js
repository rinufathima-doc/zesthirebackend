const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // or 'Company' depending on your schema structure
      required: true,
      index: true,
    },
    jobseeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      default: 'Candidate Review',
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevent a job seeker from reviewing the same employer multiple times (optional, or allow multiple)
reviewSchema.index({ employer: 1, jobseeker: 1 }, { unique: true });

module.exports =
  mongoose.models.Review || mongoose.model('Review', reviewSchema);