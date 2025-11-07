const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToDrive(file, folderType = 'documents') {
  try {
    // Xác định resource_type dựa vào mimetype
    let resourceType = 'auto';
    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw'; // PDF, documents, etc.
    }

    // Xác định folder dựa vào folderType
    let folder = 'forum-uploads/documents'; // Mặc định cho bài viết/comment
    
    switch (folderType) {
      case 'avatar':
        folder = 'forum-uploads/avatars';
        break;
      case 'chat':
        folder = 'forum-uploads/chat';
        break;
      case 'post':
      case 'comment':
      case 'documents':
      default:
        folder = 'forum-uploads/documents';
        break;
    }

    // Upload file lên Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder, // Folder riêng theo loại
      resource_type: resourceType,
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`, // Tên file unique
      access_mode: 'public', // Cho phép public access
    });

    // Xoá file local sau khi upload thành công
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    console.log(`✅ Uploaded to Cloudinary [${folder}]: ${file.originalname} (Type: ${resourceType})`);

    // Tạo URL phù hợp với loại file
    let viewUrl = result.secure_url;
    
    // Với file raw (PDF, docs), sử dụng URL gốc để có thể xem trong browser
    // Cloudinary sẽ tự động set Content-Type phù hợp
    // Nếu muốn force download thì thêm: flags: 'attachment'

    // Trả về format giống Google Drive để không phải sửa code khác
    return {
      fileId: result.public_id, // ID để xóa sau này
      link: viewUrl, // Link HTTPS để hiển thị/download
      resourceType: resourceType // Loại file để lưu vào DB
    };
  } catch (error) {
    // Xóa file local nếu có lỗi
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    console.error('❌ Error uploading to Cloudinary:', error.message);
    throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
  }
}

async function deleteFromDrive(fileId, resourceType = null) {
  try {
    // Nếu có resourceType từ DB, dùng luôn để xóa nhanh
    if (resourceType) {
      try {
        await cloudinary.uploader.destroy(fileId, { resource_type: resourceType });
        console.log(`✅ Deleted from Cloudinary [${resourceType}]: ${fileId}`);
        return;
      } catch (err) {
        console.warn(`⚠️ Không xóa được với resourceType ${resourceType}, thử các loại khác...`);
      }
    }
    
    // Fallback: Thử xóa với từng resource type (cho trường hợp không có resourceType)
    const types = ['image', 'video', 'raw'];
    for (const type of types) {
      try {
        await cloudinary.uploader.destroy(fileId, { resource_type: type });
        console.log(`✅ Deleted from Cloudinary [${type}]: ${fileId}`);
        return;
      } catch (err) {
        // Thử type tiếp theo
      }
    }
    
    console.error("❌ Không thể xóa file với bất kỳ resource type nào:", fileId);
  } catch (err) {
    console.error("❌ Lỗi khi xoá file trên Cloudinary:", err.message);
    // Không throw error để không làm gián đoạn quá trình xóa bài viết/comment
  }
}

module.exports = { uploadToDrive, deleteFromDrive };
