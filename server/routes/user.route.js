import express from "express";
import { getUserProfile, login, logout, register,updateProfile,sendOtp, verifyEmail, forgotPassword, resetPassword} from "../controllers/user.controller.js";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../utils/multer.js";
const router =express.Router();
router.route("/register").post(register) ;
router.route("/login").post(login) ;
router.post('/send-otp', sendOtp);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword); 
router.post('/reset-password', resetPassword);   
router.route("/logout").get(logout);
router.route("/profile").get(isAuthenticated,getUserProfile);



router.route("/profile/update").put(isAuthenticated,upload.single("profilePhoto"),updateProfile);

export default router;
