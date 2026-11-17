    const express = require('express');
    const router = express.Router();
    const User = require('../models/User');
    // Uncomment the line below if you have a Job model and want to return open jobs with the company
    // const Job = require('../models/Job');

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

    // @route   GET /api/companies/:id
    // @desc    Get single company profile by ID
    // @access  Public
    router.get('/:id', async (req, res) => {
    try {
        const company = await User.findOne({
        _id: req.params.id,
        $or: [
            { role: "employer" },
            { userType: "employer" }
        ]
        }).select('-password');

        if (!company) {
        return res.status(404).json({
            success: false,
            message: "Company not found"
        });
        }

        // Optional: If you want to attach jobs posted by this employer, uncomment below:
        // const jobs = await Job.find({ postedBy: company._id }).sort({ createdAt: -1 });

        res.status(200).json({
        success: true,
        data: company,
        // jobs
        });
    } catch (err) {
        console.error("Error fetching company by ID:", err);
        if (err.kind === 'ObjectId') {
        return res.status(404).json({
            success: false,
            message: "Invalid company ID"
        });
        }
        res.status(500).json({
        success: false,
        message: "Server error while fetching company profile"
        });
    }
    });

    module.exports = router;