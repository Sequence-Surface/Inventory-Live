import mongoose from 'mongoose';

// Key/value store that mirrors what the original app kept in localStorage
// (inventoryMasterOverride, inventoryReorderEdits, inventoryFolderZones, etc.).
// The frontend hydrates localStorage from here on load and writes back on change,
// so edits now persist in MongoDB instead of only the browser.
const StateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('State', StateSchema);
