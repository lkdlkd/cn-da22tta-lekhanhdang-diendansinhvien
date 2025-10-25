require('dotenv').config();
require('module-alias/register');
const express = require('express');
// Import database connection
const connectDB = require('@/src/config/connection');
const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());
// Connect to database
connectDB();
const apiRoutes = require('./src/routers/api');

// Health check endpoint (before API routes)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Website diễn đàn sinh viên TVU By Lê Khánh Đăng DA22TTA',
  });
});

// Mount API routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});


