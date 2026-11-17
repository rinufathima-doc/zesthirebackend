const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Adjust path to your User/Employer model if needed

// @route   GET /api/companies
// @desc    Get all registered employers with search, location, industry, and sorting filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, location, industry, sort } = req.query;

    // Match users registered as employers
    let query = {
      $or: [
        { role: "employer" },
        { userType: "employer" }
      ]
    };

    let andConditions = [];

    // Keyword search (matches companyName or name)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      andConditions.push({
        $or: [
          { companyName: searchRegex },
          { name: searchRegex }
        ]
      });
    }

    // Location filter
    if (location && location.trim() !== "") {
      andConditions.push({
        location: new RegExp(location.trim(), "i")
      });
    }

    // Industry filter
    if (industry && industry.trim() !== "") {
      andConditions.push({
        industry: new RegExp(industry.trim(), "i")
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Sorting order (Ascending A-Z or Descending Z-A)
    const sortVal = sort === "desc" ? -1 : 1;

    const companies = await User.find(query).sort({
      companyName: sortVal,
      name: sortVal
    });

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching companies"
    });
  }
});

module.exports = router;