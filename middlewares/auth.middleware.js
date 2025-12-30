import User from "../models/user.model.js";

export const authenticateToken = async (req, res, next) => {
    try {
        // Support token from body (POST), query (GET), or Authorization header
        const token = (req.body && req.body.token) || req.query?.token || req.headers?.authorization?.split(" ")[1];

        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        const user = await User.findOne({ token });

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Error in authenticateToken middleware:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
