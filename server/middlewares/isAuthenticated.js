import jwt from "jsonwebtoken";
import{ User }from "../models/user.model.js"; // Make sure this path is correct for your User model

const isAuthenticated = async (req, res, next) => {
    try {
        console.log("isAuthenticated middleware called");
        const token = req.cookies.token;

        if (!token) {
            console.log("No token found in cookies");
            return res.status(401).json({
                message: "User not authenticated",
                success: false,
            });
        }

        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        if (!decode) {
            console.log("Token verification failed: Invalid token");
            return res.status(401).json({
                message: "Invalid token",
                success: false,
            });
        }

        // --- CRUCIAL CHANGE START ---
        // Fetch the user from the database using the ID from the decoded token
        // Assuming decode.userId contains the user's MongoDB _id
        const user = await User.findById(decode.userId).select('-password'); // Exclude password for security
        
        if (!user) {
            console.log("User not found for decoded ID:", decode.userId);
            return res.status(401).json({
                message: "User not authorized, user not found",
                success: false,
            });
        }
        req.id = decode.userId; // Set the user ID on the request object
        // Attach the full user object to req.user
        req.user = user;
        console.log("Token verified successfully. req.user set with ID:", req.user._id);
        // --- CRUCIAL CHANGE END ---

        next(); // Proceed to the next middleware or controller
    } catch (error) {
        // This catch block will now also catch errors from jwt.verify or User.findById
        console.error('Authentication error:', error.message);
        return res.status(401).json({
            message: "Authentication failed",
            success: false,
            error: error.message // Provide more detail in development for debugging
        });
    }
};

export default isAuthenticated;