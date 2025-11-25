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

    // Sanitize file name
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .split('.')[0];

    // Upload
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: resourceType,
      public_id: `${Date.now()}-${safeName}`,
      access_mode: 'public',
    });

    console.log(`✅ Uploaded to Cloudinary [${folder}]`);

    return {
      fileId: result.public_id,
      link: result.secure_url,
      resourceType,
      uploadDate: `${year}-${month}-${day}`
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
