// models/Overview.js
const mongoose = require("mongoose");

const overviewSchema = new mongoose.Schema(
  {
    // 🔹 Match Achievements model
    userEmail: {
      type: String,
      required: true,
      index: true, // index for faster lookup, NOT unique (multiple users allowed)
    },

    // 🔹 List of saved career goals
    careers: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        relevance_score: { type: Number, default: 0 },
        required_skills: { type: [String], default: [] },
        sector: { type: String, default: "" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ✅ Optional cleanup: Ensure no leftover unique indexes cause issues
// This runs once on model init and drops the old 'userId' unique index if it exists
overviewSchema.on('index', async function (error) {
  if (error && error.message.includes('userId_1')) {
    console.warn('Dropping old unique index on userId...');
    try {
      await this.collection.dropIndex('userId_1');
      console.log('✅ Dropped stale userId index');
    } catch (dropError) {
      console.error('⚠️ Failed to drop userId index:', dropError.message);
    }
  }
});

module.exports = mongoose.model("Overview", overviewSchema);
