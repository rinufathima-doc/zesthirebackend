const User = require('../models/User'); // Adjust path to your User/Employer model

exports.getCompanies = async (req, res) => {
  try {
    const { search, location, industry, sort } = req.query;

    // Match users who are registered as employers
    let query = {
      $or: [
        { role: "employer" },
        { userType: "employer" }
      ]
    };

    // Keyword search on company name or user name
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { companyName: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } }
        ]
      });
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    // Industry filter
    if (industry) {
      query.industry = { $regex: industry, $options: "i" };
    }

    // Sorting (Ascending or Descending by name)
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
};