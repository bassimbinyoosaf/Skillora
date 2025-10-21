const express = require("express");
const router = express.Router();
const Overview = require("../models/Overview");

// Save new goals (from Tracker.jsx)
router.post("/save", async (req, res) => {
  try {
    const { email, careers } = req.body;
    if (!email || !careers) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    let userOverview = await Overview.findOne({ userEmail: email });
    if (!userOverview) {
      userOverview = new Overview({ userEmail: email, careers });
    } else {
      // Add only new ones (avoid duplicates)
      careers.forEach(career => {
        if (!userOverview.careers.some(c => c.title === career.title)) {
          userOverview.careers.push(career);
        }
      });
    }

    await userOverview.save();
    res.json({ success: true, overview: userOverview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch goals for a user
router.get("/:email", async (req, res) => {
  try {
    const userOverview = await Overview.findOne({ userEmail: req.params.email });
    res.json({ success: true, overview: userOverview || { careers: [] } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove a specific career
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
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
