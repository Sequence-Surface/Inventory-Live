import mongoose from 'mongoose';

// One document per (parent product, calendar month). Unbounded — the 24-month
// dashboard window is just a view; rows are NEVER trimmed, so history survives
// forever regardless of what the current window shows.
// `sales`/`purchases`: null = never reported, 0 = a genuine reported zero.
// The two sides merge independently so a sales upload can never clobber
// purchases for the same month (and vice versa).
const MonthlyHistorySchema = new mongoose.Schema(
  {
    codeKey: { type: String, required: true },
    ym: { type: String, required: true }, // 'yyyy-mm'
    sales: { type: Number, default: null },
    purchases: { type: Number, default: null },
    salesUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
    purchUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
    salesUpdatedAt: { type: Date, default: null },
    purchUpdatedAt: { type: Date, default: null },
  },
  { minimize: false }
);

MonthlyHistorySchema.index({ codeKey: 1, ym: 1 }, { unique: true });
MonthlyHistorySchema.index({ ym: 1 });

export default mongoose.model('MonthlyHistory', MonthlyHistorySchema);
