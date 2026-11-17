const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    role: { 
      type: String, 
      enum: ['jobseeker', 'employer', 'admin'], 
      required: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { 
      type: String, 
      required: true 
    },
    
    // Shared / Jobseeker Fields
    name: { type: String },
    fullName: { type: String },
    phone: { type: String, default: '' },
    skills: { type: [String], default: [] },
    location: { type: String, default: 'Calicut, Kerala' },
    profilePicture: { type: String, default: '' },
    resume: { type: String, default: '' },

    // Jobseeker Saved Jobs Field
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
      }
    ],

    // Jobseeker Preferences Fields
    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Remote', 'Contract'],
      default: 'Full-time',
    },
    expectedSalary: { type: String, default: '' },
    preferredLocation: { type: String, default: '' },

    // Employer & Company Profile Fields
    companyName: { type: String, default: 'Web Tech' },
    contactName: { type: String },
    industry: { type: String },
    companyWebsite: { type: String, default: '' },
    bio: { type: String, default: '' }, 
  },
  { timestamps: true }
);

// Automatically hash password before saving if modified (NO 'next' parameter or call)
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper method to compare entered password with stored hash
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);