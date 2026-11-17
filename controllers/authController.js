const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * @desc    Register a new user (Jobseeker or Employer)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { email, password, role, name, fullName, companyName } = req.body;

    // 1. Basic payload validation
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide email, password, and role.",
      });
    }

    // 2. Validate role casing/value matching schema enums
    const validRoles = ['jobseeker', 'employer', 'admin'];
    const normalizedRole = role.toLowerCase().trim();
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Must be 'jobseeker' or 'employer'.",
      });
    }

    // 3. Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // 4. Create new user instance (Pass plain password - pre('save') hashes it)
    const newUser = new User({
      email: email.toLowerCase().trim(),
      password,
      role: normalizedRole,
      name: name || fullName || '',
      companyName: normalizedRole === 'employer' ? (companyName || 'My Company') : undefined,
    });

    // 5. Save to database
    await newUser.save();

    // 6. Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    // 7. Send success response
    return res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name || newUser.companyName,
      },
    });

  } catch (error) {
    console.error("Error in registerUser:", error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email is already in use." });
    }

    return res.status(500).json({ success: false, message: error.message || "Server error during registration." });
  }
};

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password.",
      });
    }

    // 1. Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 2. Compare password using the schema method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3. Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    // 4. Send response
    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.companyName,
      },
    });

  } catch (error) {
    console.error("Error in loginUser:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during login.",
    });
  }
};

// Export BOTH functions so authRoutes.js can read them properly
module.exports = {
  registerUser,
  loginUser,
};