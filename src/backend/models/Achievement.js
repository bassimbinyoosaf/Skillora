// models/Achievement.js
const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
  {
    // User identifier (consistent with Overview model)
    userEmail: {
      type: String,
      required: true,
      unique: true,
    },

    // List of all user achievements
    achievements: [
      {
        title: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["academic", "achievement", "certification", "skill"],
          default: "skill",
        },
        description: {
          type: String,
          default: "",
        },
        relatedCareer: {
          type: String,
          default: "", // optional — which career this skill was linked to
        },
        skillName: {
          type: String,
          default: "", // exact skill name
        },
        date: {
          type: Date,
          default: Date.now,
        },
        icon: {
          type: String,
          default: "", // optional icon for UI display
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster lookups by userEmail
achievementSchema.index({ userEmail: 1 });

module.exports = mongoose.model("Achievement", achievementSchema);
