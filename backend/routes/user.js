const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const router = express.Router();
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Phone already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, phone, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'All fields required' });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    const vendors = await Vendor.find({}, 'name phone locality service'); // 🆕 include service

    res.status(200).json({
      message: 'User logged in successfully',
      user: { name: user.name, phone: user.phone },
      vendors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
