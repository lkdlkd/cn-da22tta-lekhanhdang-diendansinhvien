require('dotenv').config();
require('module-alias/register');
const connectDB = require('@/src/config/connection');
const { seedCategories } = require('./src/utils/seedCategories');

/**
 * Script để tạo danh mục mặc định
 * Chạy: node src/backend/seedCategoriesScript.js
 */
const runSeed = async () => {
  try {
    // Kết nối database
    await connectDB();
    console.log('✅ Đã kết nối database\n');

    // Chạy seed
    const result = await seedCategories();

    if (result.success) {
      console.log('🎉 Hoàn thành seed categories!');
      process.exit(0);
    } else {
      console.error('❌ Seed thất bại:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

// Chạy script
runSeed();
