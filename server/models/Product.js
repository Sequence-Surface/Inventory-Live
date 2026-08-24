import mongoose from 'mongoose';

// One document per PARENT product. Identity/merge key is `codeKey` (UPPER-trimmed
// parent code, which is the ERP Product Name). Products are never deleted by a
// master re-upload — ones missing from the latest file are flagged `active:false`
// so their history and stock snapshots stay intact and auditable.
const ChildSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' },
    productId: { type: Number, default: null },
    launchDateRaw: { type: String, default: '' },
    folder: { type: String, default: '' },
    variant: { type: String, default: 'Standard' },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    parentCode: { type: String, required: true },
    codeKey: { type: String, required: true, unique: true, index: true },
    parentId: { type: Number, default: null },
    vendorName: { type: String, default: '' },
    categoryName: { type: String, default: '' },
    productType: { type: String, default: '' },
    launchDateRaw: { type: String, default: '' },
    launchDate: { type: Date, default: null },
    masterStock: { type: Number, default: 0 },
    children: { type: [ChildSchema], default: [] },
    active: { type: Boolean, default: true },
    // Current stock — denormalized head of the StockSnapshot history.
    k: { type: Number, default: 0 },
    it: { type: Number, default: 0 },
    po: { type: Number, default: 0 },
    stockAsOf: { type: Date, default: null },
    stockUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
    firstUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
    lastMasterUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('Product', ProductSchema);
