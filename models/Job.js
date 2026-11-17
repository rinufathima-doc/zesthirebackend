
const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    // Employer Reference
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Job Basic Information
    title: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    jobType: {
      type: String,
      enum: [
        "Full Time",
        "Part Time",
        "Full-time",
        "Part-time",
        "Remote",
        "Internship",
        "Freelance",
      ],
      default: "Full Time",
      required: true,
    },

    // Salary Information
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // Skills and Requirements
    requiredSkills: {
      type: [String],
      default: [],
    },

    experience: {
      type: String,
      default: "Fresher",
      trim: true,
    },

    qualifications: {
      type: String,
      default: "",
      trim: true,
    },

    requirements: {
      type: String,
      default: "",
      trim: true,
    },

    // Job Description
    description: {
      type: String,
      required: true,
      trim: true,
    },

    applicationDeadline: {
      type: Date,
      default: null,
    },

    // Job Status
    status: {
      type: String,
      enum: ["Active", "Closed", "Expired", "Draft"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Synchronize employerId and createdBy
JobSchema.pre("validate", function () {
  if (!this.employerId && this.createdBy) {
    this.employerId = this.createdBy;
  }

  if (!this.createdBy && this.employerId) {
    this.createdBy = this.employerId;
  }
});

// Indexes for faster job searching
JobSchema.index({ employerId: 1 });
JobSchema.index({ createdBy: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ title: 1 });
JobSchema.index({ location: 1 });

// Export Model
module.exports =
  mongoose.models.Job || mongoose.model("Job", JobSchema);
