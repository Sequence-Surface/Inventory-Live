import mongoose from 'mongoose';

// Audit log: one row per data operation (file upload, Google Sheets sync,
// boot-time migration, reset). Powers the upload-history panel on the Data page.
const UploadSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['master', 'stock', 'sales', 'purchases', 'migration', 'reset', 'delete'],
    },
    source: { type: String, enum: ['file', 'gsheet', 'system'], default: 'file' },
    fileName: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
    counts: { type: mongoose.Schema.Types.Mixed, default: {} },
    monthsCovered: { type: [String], default: [] },
    status: { type: String, enum: ['ok', 'error'], default: 'ok' },
    error: { type: String, default: '' },
  },
  { minimize: false }
);

UploadSchema.index({ uploadedAt: -1 });

export default mongoose.model('Upload', UploadSchema);
