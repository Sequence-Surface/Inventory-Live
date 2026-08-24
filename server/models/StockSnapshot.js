import mongoose from 'mongoose';

// Append-only stock audit trail: every stock upload inserts one row per parent
// with the timestamp it was taken. Product.k/it/po always mirrors the latest.
const StockSnapshotSchema = new mongoose.Schema(
  {
    codeKey: { type: String, required: true },
    k: { type: Number, default: 0 },
    it: { type: Number, default: 0 },
    po: { type: Number, default: 0 },
    takenAt: { type: Date, required: true },
    uploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
  },
  { minimize: false }
);

StockSnapshotSchema.index({ codeKey: 1, takenAt: -1 });
StockSnapshotSchema.index({ uploadId: 1 });

export default mongoose.model('StockSnapshot', StockSnapshotSchema);
