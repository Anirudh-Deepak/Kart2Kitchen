const express = require('express');
const bcrypt = require('bcryptjs');
const Vendor = require('../models/Vendor');
const router = express.Router();
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, locality, service } = req.body;

    if (!name || !phone || !password || !locality || !service) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await Vendor.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Phone number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const vendor = new Vendor({ name, phone, password: hashedPassword, locality, service });
    await vendor.save();

    res.status(201).json({ message: 'Vendor registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'All fields required' });

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
        service: vendor.service
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
