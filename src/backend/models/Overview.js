// models/overview.js
const mongoose = require("mongoose");

const overviewSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  careers: [
    {
      title: { type: String, required: true },
      description: { type: String },
      relevance_score: { type: Number },
      required_skills: [String],
      sector: { type: String },
      addedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Overview", overviewSchema);
