import mongoose from 'mongoose';

// The full inventory dataset (the original inline `const D`) lives in a single
// document. Mongoose's Mixed type stores the object verbatim so the shape the
// frontend expects is preserved exactly.
const DatasetSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('Dataset', DatasetSchema);
