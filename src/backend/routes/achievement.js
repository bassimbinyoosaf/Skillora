// routes/achievement.js
const express = require("express");
const router = express.Router();
const Overview = require("../models/Overview");
const Achievement = require("../models/Achievement");
/**
 * ✅ Route: POST /api/achievements/complete-skill
 * Marks a skill as completed:
 * - Adds the skill as an achievement
 * - Removes related careers from Overview
 */
router.post("/complete-skill", async (req, res) => {
  try {
    const { email, skill } = req.body;

    if (!email || !skill) {
      return res.status(400).json({ success: false, message: "Missing email or skill" });
    }

    const overview = await Overview.findOne({ userEmail: email });
    if (!overview) {
      return res.status(404).json({ success: false, message: "Overview not found for this user" });
    }

    // Find all careers that required this skill
    const matchedCareers = overview.careers.filter((career) =>
      career.required_skills.includes(skill)
    );

    if (matchedCareers.length === 0) {
      return res.json({ success: false, message: `No careers found with skill "${skill}"` });
    }

    // ✅ Create achievement entries
    const achievementEntries = matchedCareers.map((career) => ({
      title: `${skill} Skill Mastered`,
      type: "skill",
      skillName: skill,
      relatedCareer: career.title,
      description: `Successfully mastered ${skill}, required for career: ${career.title}.`,
      date: new Date(),
      icon: "Award",
    }));

    // ✅ Upsert into Achievement collection
    await Achievement.updateOne(
      { email },
      { $push: { achievements: { $each: achievementEntries } } },
      { upsert: true }
    );

    // ✅ Remove careers using this skill from Overview
    overview.careers = overview.careers.filter(
      (career) => !career.required_skills.includes(skill)
    );
    await overview.save();

    return res.json({
      success: true,
      message: `Skill "${skill}" marked as completed.`,
      remainingCareers: overview.careers,
    });
  } catch (error) {
    console.error("Error completing skill:", error);
    res.status(500).json({ success: false, message: "Server error while completing skill" });
  }
});

/**
 * ✅ Route: GET /api/achievements/:email
 * Fetch all user achievements
 */
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const achievementDoc = await Achievement.findOne({ email });

    if (!achievementDoc) {
      return res.json({ success: true, achievements: [] });
    }

    res.json({
      success: true,
      achievements: achievementDoc.achievements.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      ),
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ success: false, message: "Server error while fetching achievements" });
  }
});

/**
 * ✅ Route: DELETE /api/achievements/:email/:title
 * Remove a specific achievement
 */
router.delete("/:email/:title", async (req, res) => {
  try {
    const { email, title } = req.params;

    const achievementDoc = await Achievement.findOneAndUpdate(
      { email },
      { $pull: { achievements: { title } } },
      { new: true }
    );

    if (!achievementDoc) {
      return res.status(404).json({ success: false, message: "Achievement not found" });
    }

    res.json({
      success: true,
      message: `Achievement "${title}" removed successfully`,
      achievements: achievementDoc.achievements,
    });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    res.status(500).json({ success: false, message: "Server error while deleting achievement" });
  }
});

module.exports = router;
