const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const printToken = require('./printer');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Order Schema
const orderSchema = new mongoose.Schema({
  token: String,
  items: [{
    name: String,
    qty: Number,
    price: Number
  }],
  total: Number,
  date: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Routes
app.get('/', (req, res) => {
  res.send('Thermal Printer Server is Running');
});

// GET /orders - Fetch all orders with Date Filtering
app.get('/orders', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    console.log(startDate, endDate);

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of day
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        query.date.$lte = end;
      }
    }

    const orders = await Order.find(query).sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /stats - Sales statistics with Date Filtering
app.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = {};

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchStage.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.date.$lte = end;
      }
    }

    const pipeline = [];

    // Add Match stage if filters exist
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalQty: { $sum: "$items.qty" },
          totalRevenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } }
        }
      },
      { $sort: { totalQty: -1 } }
    );

    const stats = await Order.aggregate(pipeline);
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.post('/place-order', async (req, res) => {
  const orderData = req.body;

  try {
    // Get today's date range (start and end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's orders to generate next token number
    const todayOrderCount = await Order.countDocuments({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Generate token: token1, token2, token3, etc.
    const tokenNumber = todayOrderCount + 1;
    orderData.token = `token${tokenNumber}`;

    // Save to MongoDB
    const newOrder = new Order(orderData);
    await newOrder.save();
    console.log('✅ Order saved to database');

    // Print token
    printToken(orderData);

    res.json({
      success: true,
      message: 'Order placed, saved & token printed',
      order: newOrder
    });
  } catch (err) {
    console.error('Error processing order:', err);
    res.status(500).json({ success: false, message: 'Failed to process order' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🖨️ Thermal Printer Server running on port ${PORT}`);
});