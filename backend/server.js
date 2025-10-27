const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kart2kitchen';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
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
  service: { type: String, required: true, default: "General" },
  scannerCode: {
    type: String,
    unique: true,
    default: () => 'SCAN-' + Math.random().toString(36).slice(2, 11).toUpperCase()
  },
  vegetables: { type: [VegetableSchema], default: [] }
}, { timestamps: true });
const Vendor = mongoose.model('Vendor', VendorSchema);

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);
app.post('/vendor_register', async (req, res) => {
  try {
    let { name, phone, password, locality, service } = req.body;
    if (!name || !phone || !password || !locality) {
      return res.status(400).json({ error: 'All fields (name, phone, password, locality) are required' });
    }
    if (!service || service.trim() === "") service = "General";

    const existing = await Vendor.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Phone number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const vendor = new Vendor({ name, phone, password: hashedPassword, locality, service });
    await vendor.save();

    res.status(201).json({
      message: 'Vendor registered successfully',
      scannerCode: vendor.scannerCode
    });
  } catch (err) {
    console.error('Vendor registration error:', err);
    if (err.code === 11000 && err.keyPattern && err.keyPattern.scannerCode) {
      return res.status(500).json({ error: 'Scanner code collision. Please retry registration.' });
    }
    res.status(500).json({ error: err.message });
  }
});
app.post('/vendor_login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'All fields are required' });

    const vendor = await Vendor.findOne({ phone });
    if (!vendor) return res.status(400).json({ error: 'Vendor not found' });

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    res.status(200).json({
      message: 'Vendor logged in successfully',
      vendor: {
        name: vendor.name,
        phone: vendor.phone,
        locality: vendor.locality,
        service: vendor.service || "General",
        scannerCode: vendor.scannerCode
      }
    });
  } catch (err) {
    console.error('Vendor login error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.post('/vendor_add_vegetable', async (req, res) => {
  try {
    const { phone, vegetable } = req.body;
    if (!phone || !vegetable || !vegetable.name || vegetable.rate == null || !vegetable.area) {
      return res.status(400).json({ error: 'phone and vegetable {name, rate, area} are required' });
    }
    const rateNum = Number(vegetable.rate);
    if (Number.isNaN(rateNum) || rateNum < 0) {
      return res.status(400).json({ error: 'rate must be a non-negative number' });
    }

    const vendor = await Vendor.findOne({ phone });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    vendor.vegetables.push({ name: vegetable.name.trim(), rate: rateNum, area: vegetable.area.trim() });
    await vendor.save();

    res.json({ message: 'Vegetable added', vegetables: vendor.vegetables });
  } catch (err) {
    console.error('Add vegetable error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/vendor/:phone/vegetables', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ phone: req.params.phone }, 'vegetables');
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor.vegetables || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/vendor/:phone/vegetables/:vegId', async (req, res) => {
  try {
    const { phone, vegId } = { phone: req.params.phone, vegId: req.params.vegId };
    const { name, rate, area } = req.body;
    const vendor = await Vendor.findOne({ phone });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const veg = vendor.vegetables.id(vegId);
    if (!veg) return res.status(404).json({ error: 'Vegetable not found' });

    if (name != null) veg.name = name;
    if (rate != null) {
      const rateNum = Number(rate);
      if (Number.isNaN(rateNum) || rateNum < 0) return res.status(400).json({ error: 'rate must be a non-negative number' });
      veg.rate = rateNum;
    }
    if (area != null) veg.area = area;

    await vendor.save();
    res.json({ message: 'Vegetable updated', vegetable: veg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/vendor/:phone/vegetables/:vegId', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ phone: req.params.phone });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    const veg = vendor.vegetables.id(req.params.vegId);
    if (!veg) return res.status(404).json({ error: 'Vegetable not found' });

    veg.deleteOne();
    await vendor.save();
    res.json({ message: 'Vegetable deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/user_register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const existing = await User.findOne({ phone });
    if (existing)
      return res.status(400).json({ error: 'Phone number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, phone, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('User registration error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.post('/user_login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    const vendors = await Vendor.find({}, 'name phone locality service scannerCode');

    res.status(200).json({
      message: 'User logged in successfully',
      user: { name: user.name, phone: user.phone },
      vendors
    });
  } catch (err) {
    console.error('User login error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find({}, 'name phone locality service scannerCode');
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/vegetables', async (req, res) => {
  try {
    const vendors = await Vendor.find({}, 'name phone locality scannerCode vegetables');
    const items = [];
    vendors.forEach(v => {
      (v.vegetables || []).forEach(veg => {
        items.push({
          _id: veg._id,
          name: veg.name,
          rate: veg.rate,
          area: veg.area,
          vendor: {
            name: v.name,
            phone: v.phone,
            locality: v.locality,
            scannerCode: v.scannerCode
          }
        });
      });
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('Backend running '));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
