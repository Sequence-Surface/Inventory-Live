import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Dataset from '../models/Dataset.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build an EMPTY dataset — the reference label sets only (status/mover/priority/ABC codes,
// variants, month placeholders), with NO products, vendors, categories, or demo numbers.
// The dashboard runs purely on the user's uploaded-and-cleaned data; a fresh database shows a
// blank dashboard until the first Product Master is uploaded. (No synthetic/demo data is served.)
export function buildEmptyDataset() {
  const jsonPath = path.join(__dirname, '..', 'seed', 'dataset.json');
  // Reference label sets are stable — take them from the shipped file if present, else hardcode.
  let ref = {};
  try { if (fs.existsSync(jsonPath)) ref = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch (e) {}
  const months = Array.isArray(ref.months) && ref.months.length === 24 ? ref.months
    : ['May-24','Jun-24','Jul-24','Aug-24','Sep-24','Oct-24','Nov-24','Dec-24','Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26','Apr-26'];
  return {
    months,
    variants: ref.variants || ['Standard','Glossy','Matte','Textured','Premium','Eco'],
    statusCodes: ref.statusCodes || ['Adequate','Critical','Dead Stock','Healthy','Inactive','Low Stock','Overstocked'],
    moverCodes: ref.moverCodes || ['Active','No Stock','Non-Moving (12m+)','Slow (6-12m)','Sluggish (3-6m)'],
    priorityCodes: ref.priorityCodes || ['D - Liquidate','D - Reduce','OK','P1 - URGENT','P2 - High','P3 - Medium'],
    abcCodes: ref.abcCodes || ['A','B','C'],
    cats: [], folders: [], subCats: [], vendors: [], folderSummary: [],
    aggP: new Array(24).fill(0),
    aggS: new Array(24).fill(0),
    kpi: {
      totalProducts: 0, totalChildren: 0, totalFolders: 0, totalCategories: 0,
      annualSales: 0, totalStock: 0, inTransitTotal: 0, pendingTotal: 0,
      classACount: 0, classBCount: 0, classCCount: 0, classASales: 0,
      netReorderQty: 0, netReorderProducts: 0, reorderSavedByPipeline: 0,
      criticalCount: 0, criticalImprovedCount: 0,
      bulkAnomalyCount: 0, slowMoverCount: 0, nonMovingUnits: 0,
    },
    products: [],
    __empty: true,
  };
}

// Ensures the Dataset collection has a 'main' document. Safe to call on every boot: it only writes
// when the data is missing (unless force=true). Seeds an EMPTY dataset — never demo data.
export async function ensureSeeded({ force = false } = {}) {
  const existing = await Dataset.findOne({ key: 'main' }).lean();
  if (existing && !force) return { seeded: false };
  const data = buildEmptyDataset();
  await Dataset.findOneAndUpdate(
    { key: 'main' },
    { key: 'main', data },
    { upsert: true, new: true }
  );
  return { seeded: true, products: 0, empty: true };
}
