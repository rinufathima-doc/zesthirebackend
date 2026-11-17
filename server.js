const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobseekerRoutes = require('./routes/jobseekerRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const companyRoutes = require('./routes/companyRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve uploaded resume files statically so links work
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/jobseeker', jobseekerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/companies', companyRoutes);

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.log('MongoDB connection failed:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});