const mongoose = require("mongoose");

const jobSeekerProfileSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      unique: true 
    },
    fullName: { 
      type: String, 
      required: false, 
      default: "Candidate" 
    },
    headline: { 
      type: String, 
      default: "" 
    },
    phone: { 
      type: String, 
      default: "" 
    },
    location: { 
      type: String, 
      default: "" 
    },
    profilePicture: { 
      type: String, 
      default: "" 
    },
    preferredLocations: [{ 
      type: String 
    }],
    preferredJobTypes: [{ 
      type: String, 
      enum: ["Full Time", "Part Time", "Freelance", "Internship", "Remote"] 
    }],
    bio: { 
      type: String, 
      default: "" 
    },
    skills: [{ 
      type: String 
    }],
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    education: [
      {
        institution: String,
        degree: String,
        fieldOfStudy: String,
        startYear: String,
        endYear: String,
      },
    ],
    experience: [
      {
        company: String,
        position: String,
        startDate: String,
        endDate: String,
        current: Boolean,
        description: String,
      },
    ],
    resumeUrl: { 
      type: String, 
      default: "" 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.JobSeekerProfile || mongoose.model("JobSeekerProfile", jobSeekerProfileSchema);