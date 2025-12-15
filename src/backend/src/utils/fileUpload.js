const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToDrive(file, folderType = 'documents') {
  let safePath = file.path;

  try {
    // Detect resource type
    let resourceType = 'auto';
    if (file.mimetype.startsWith('image/')) resourceType = 'image';
    else if (file.mimetype.startsWith('video/')) resourceType = 'video';
    else resourceType = 'raw';

    // Build folder path: year / month-year / day-month-year
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const datePath = `${year}/${month}-${year}/${day}-${month}-${year}`;

    let baseFolder = 'forum-uploads/documents';
    switch (folderType) {
      case 'avatar':
        baseFolder = 'forum-uploads/avatars';
        break;
      case 'chat':
        baseFolder = 'forum-uploads/chat';
        break;
      default:
        baseFolder = 'forum-uploads/documents';
        break;
    }

    const folder = `${baseFolder}/${datePath}`;

    // Sanitize file name - giữ extension cho raw files
    const fileExtension = file.originalname.split('.').pop();
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .split('.')[0];

    // Upload options
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      public_id: `${Date.now()}-${safeName}`,
      type: 'upload',  // Explicitly set type to 'upload' (public by default)
    };

    // Đối với raw files (PDF, docs...), thêm format để giữ extension
    if (resourceType === 'raw') {
      uploadOptions.format = fileExtension;
      // Không dùng access_mode cho raw vì có thể gây 401
      // Thay vào đó dùng type: 'upload' (default public)
    }

    const result = await cloudinary.uploader.upload(file.path, uploadOptions);

    console.log(`✅ Uploaded to Cloudinary [${folder}]`);
    console.log(`📄 File URL: ${result.secure_url}`);

    // Tạo URL phù hợp cho PDF và documents
    let viewUrl = result.secure_url;
    let downloadUrl = result.secure_url;
    
    // Với PDF và raw files, tạo signed URL nếu cần
    if (resourceType === 'raw') {
      // Tạo signed URL để tránh 401 error
      const signedUrl = cloudinary.utils.private_download_url(
        result.public_id,
        result.format || fileExtension,
        {
          resource_type: 'raw',
          type: 'upload'
        }
      );
      
      // URL tải xuống với attachment flag
      downloadUrl = cloudinary.url(result.public_id, {
        resource_type: 'raw',
        type: 'upload',
        flags: 'attachment',
        secure: true,
        sign_url: true  // Signed URL để tránh 401
      });
      
      // Nếu secure_url bị 401, dùng signed URL
      viewUrl = signedUrl || result.secure_url;
    }

    return {
      fileId: result.public_id,
      link: viewUrl,  // URL xem (hoặc tải cho raw)
      downloadUrl: downloadUrl,  // URL tải xuống
      resourceType,
      uploadDate: `${year}-${month}-${day}`,
      filename: file.originalname,
      mimetype: file.mimetype
    };

  } catch (error) {
    console.error("❌ Error uploading:", error.message);
    throw new Error(`Failed to upload: ${error.message}`);
  } finally {
    // ALWAYS delete local file
    if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
  }
}

async function deleteFromDrive(fileId, resourceType = null) {
  try {
    if (resourceType) {
      try {
        await cloudinary.uploader.destroy(fileId, { resource_type: resourceType });
        console.log(`✅ Deleted [${resourceType}]`);
        return;
      } catch { }
    }

    for (const type of ['image', 'video', 'raw']) {
      try {
        await cloudinary.uploader.destroy(fileId, { resource_type: type });
        console.log(`✅ Deleted [${type}]`);
        return;
      } catch { }
    }

    console.error("❌ Cannot delete:", fileId);
  } catch (err) {
    console.error("❌ Delete error:", err.message);
  }
}

module.exports = { uploadToDrive, deleteFromDrive };
