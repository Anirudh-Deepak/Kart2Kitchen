const mongoose = require('mongoose');
const VegetableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rate: { type: Number, required: true },
  area: { type: String, required: true }
}, { _id: true });
const VendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  locality: { type: String, required: true },
  service: { type: String, required: true },
  scannerCode: {
    type: String,
    unique: true,
    default: () => 'SCAN-' + Math.random().toString(36).slice(2, 11).toUpperCase()
  },
  vegetables: { type: [VegetableSchema], default: [] }
}, { timestamps: true });
module.exports = mongoose.model('Vendor', VendorSchema);
