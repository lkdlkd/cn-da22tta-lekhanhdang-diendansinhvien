const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware xác thực user (chỉ cần đăng nhập)
const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: "Vui lòng đăng nhập để thực hiện" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ success: false, error: "Vui lòng đăng nhập để thực hiện" });
    }
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, error: "Vui lòng đăng nhập để thực hiện" });
        }
        req.user = user;
        req.role = user.role;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: "Vui lòng đăng nhập để thực hiện" });
    }
};

// Middleware xác thực admin
const authenticateAdmin = async (req, res, next) => {
    await authenticateUser(req, res, async () => {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, error: "Bạn không có quyền truy cập" });
        }
        next();
    });
};

// Middleware xác thực MOD (moderator) - có quyền duyệt bài
const authenticateMod = async (req, res, next) => {
    await authenticateUser(req, res, async () => {
        if (req.user.role !== "mod" && req.user.role !== "admin") {
            return res.status(403).json({ success: false, error: "Bạn không có quyền truy cập. Chỉ MOD/ADMIN mới được phép." });
        }
        next();
    });
};

module.exports = {
    authenticateUser,
    authenticateAdmin,
    authenticateMod
};
