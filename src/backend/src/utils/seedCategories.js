const Category = require('../models/Category');

const categories = [
  { title: "Thảo luận học tập", slug: "thao-luan-hoc-tap", description: "Nơi trao đổi bài tập, tài liệu, kinh nghiệm học tốt giữa sinh viên." },
  { title: "Chia sẻ tài liệu", slug: "chia-se-tai-lieu", description: "Upload và chia sẻ các file bài giảng, đồ án, code, sách." },
  { title: "Hoạt động ngoại khóa", slug: "hoat-dong-ngoai-khoa", description: "Thảo luận các hoạt động CLB, đội nhóm, tình nguyện, sự kiện sinh viên." },
  { title: "Hỏi đáp – Tư vấn", slug: "hoi-dap-tu-van", description: "Nơi đặt câu hỏi và được mọi người giải đáp liên quan đến học tập, cuộc sống sinh viên." },
  { title: "Trao đổi – Mua bán", slug: "trao-doi-mua-ban", description: "Mua bán, trao đổi sách, đồ dùng, laptop, xe, phòng trọ. Không đăng spam." },
  { title: "Tìm trọ / Tìm người ở ghép", slug: "tim-tro", description: "Đăng thông tin tìm phòng trọ, ghép phòng, chia sẻ review chủ trọ." },
  { title: "Tìm đồ thất lạc", slug: "tim-do-that-lac", description: "Đăng thông báo mất đồ và tìm chủ nhân đồ nhặt được." },
  { title: "Góc tâm sự", slug: "goc-tam-su", description: "Tâm sự chuyện học hành, tình cảm, áp lực cuộc sống sinh viên." },
  { title: "Bốc phốt / Cảnh báo lừa đảo", slug: "boc-phot-canh-bao", description: "Cảnh báo các trường hợp scam, dịch vụ kém uy tín (giữ văn minh, có bằng chứng)." },
  { title: "Tuyển dụng – Việc làm thêm", slug: "tuyen-dung-viec-lam", description: "Chia sẻ cơ hội làm thêm, thực tập, tuyển cộng tác viên." },
  { title: "Công nghệ – Lập trình", slug: "cong-nghe-lap-trinh", description: "Chia sẻ kiến thức dev, phần mềm, tool, kỹ thuật, hỏi đáp lập trình." },
  { title: "CLB – Đoàn – Hội", slug: "clb-doan-hoi", description: "Đăng tin hoạt động đoàn trường, hội sinh viên, các câu lạc bộ." },
  { title: "Game – Giải trí", slug: "game-giai-tri", description: "Chia sẻ tin tức game, phim, âm nhạc, meme, giải trí." },
  { title: "Thông báo của Admin", slug: "thong-bao-admin", description: "Nơi Admin đăng quy định, cập nhật hệ thống và hướng dẫn sử dụng diễn đàn." }
];

/**
 * Tạo nhanh các danh mục nếu chưa có
 */
const seedCategories = async () => {
  try {
    console.log('🌱 Bắt đầu tạo danh mục...');
    
    let createdCount = 0;
    let existedCount = 0;
    let errorCount = 0;

    for (const categoryData of categories) {
      try {
        // Kiểm tra xem danh mục đã tồn tại chưa (theo slug)
        const existingCategory = await Category.findOne({ slug: categoryData.slug });
        
        if (existingCategory) {
          console.log(`⏭️  Đã có: ${categoryData.title} (${categoryData.slug})`);
          existedCount++;
          continue;
        }

        // Tạo mới danh mục
        const newCategory = new Category({
          title: categoryData.title,
          slug: categoryData.slug,
          description: categoryData.description,
          postsCount: 0
        });

        await newCategory.save();
        console.log(`✅ Tạo mới: ${categoryData.title} (${categoryData.slug})`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Lỗi khi tạo ${categoryData.title}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Tổng kết:');
    console.log(`   ✅ Tạo mới: ${createdCount} danh mục`);
    console.log(`   ⏭️  Đã tồn tại: ${existedCount} danh mục`);
    console.log(`   ❌ Lỗi: ${errorCount} danh mục`);
    console.log(`   📦 Tổng cộng: ${categories.length} danh mục\n`);

    return {
      success: true,
      created: createdCount,
      existed: existedCount,
      errors: errorCount,
      total: categories.length
    };

  } catch (error) {
    console.error('❌ Lỗi khi seed categories:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Xóa tất cả danh mục (dùng để reset - CẨN THẬN!)
 */
const clearAllCategories = async () => {
  try {
    const result = await Category.deleteMany({});
    console.log(`🗑️  Đã xóa ${result.deletedCount} danh mục`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Lỗi khi xóa categories:', error);
    throw error;
  }
};

/**
 * Reset và tạo lại tất cả danh mục
 */
const resetAndSeedCategories = async () => {
  try {
    console.log('🔄 Bắt đầu reset và tạo lại danh mục...\n');
    
    // Xóa tất cả
    await clearAllCategories();
    
    // Tạo lại
    const result = await seedCategories();
    
    return result;
  } catch (error) {
    console.error('❌ Lỗi khi reset categories:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  seedCategories,
  clearAllCategories,
  resetAndSeedCategories,
  categories
};
