// routes/overview.js
const express = require("express");
const router = express.Router();
const Overview = require("../models/Overview");

// ✅ Save or update career goals for a user
router.post("/save", async (req, res) => {
  try {
    const { userEmail, careers } = req.body;

    if (!userEmail || !careers || !Array.isArray(careers)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing data. 'userEmail' and 'careers' are required."
      });
    }

    let userOverview = await Overview.findOne({ userEmail });

    if (!userOverview) {
      // Create new overview doc
      userOverview = new Overview({ userEmail, careers });
    } else {
      // Append new careers without duplicates
      careers.forEach((career) => {
        if (!userOverview.careers.some((c) => c.title === career.title)) {
          userOverview.careers.push(career);
        }
      });
    }

    await userOverview.save();
    res.json({ success: true, overview: userOverview });
  } catch (error) {
    console.error("❌ Error saving overview:", error);
    res.status(500).json({ success: false, message: "Server error while saving overview", error: error.message });
  }
});

// ✅ Fetch goals for a specific user
router.get("/:email", async (req, res) => {
  try {
    const userOverview = await Overview.findOne({ userEmail: req.params.email });
    res.json({ success: true, overview: userOverview || { careers: [] } });
  } catch (error) {
    console.error("❌ Error fetching overview:", error);
    res.status(500).json({ success: false, message: "Server error while fetching overview", error: error.message });
  }
});

// ✅ Delete a specific career from overview
router.delete("/:email/:title", async (req, res) => {
  try {
    const { email, title } = req.params;
    const userOverview = await Overview.findOneAndUpdate(
      { userEmail: email },
      { $pull: { careers: { title } } },
      { new: true }
    );
    res.json({ success: true, overview: userOverview });
  } catch (error) {
    console.error("❌ Error deleting career:", error);
    res.status(500).json({ success: false, message: "Server error while deleting career", error: error.message });
  }
});

module.exports = router;
