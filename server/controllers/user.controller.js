import { User } from "../models/user.model.js";
import bcrypt from 'bcryptjs'; 
import {generateToken}  from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";
import { OTP } from '../models/otp.model.js';
import { generateOTP } from '../utils/otpGenerator.js';
import { sendEmail } from '../utils/emailService.js';
export const register = async (req,res) => {
    try{
        const{name,email,password}=req.body;
        if(!name || !email || !password){
            return res.status(400).json({
                success:false,
                message:"All fields are required."
            })
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format.",
            });
        }
        console.log("email",email);
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long.",
            });
        }
        //display it using toast
        const user=await User.findOne({email});
        if(user){
            return res.status(400).json({
                success:false,
                message:"user already exist with this email."
            })
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const newUser = await User.create({
            name,
            email,
            password:hashedPassword
        });
        generateToken(res, newUser, `Check email to verify your account ${newUser.name}`);
        

        }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Failed to register"
        })

    }
}
export const login = async(req,res)=>{
    try{
        const{email,password}=req.body;
        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:"All fields are required."
            })
        }
        {console.log("email",email);}
        const user=await User.findOne({email});
        console.log("user",user);
        if(!user){
            return res.status(400).json({
                success:false,
                message:"Incorrect email or password"
            })
        }
        if(!user.isEmailVerified){
                return res.status(400).json({
                    success:false,
                    message:"Please verify your email before logging in."
                });
        }
        const isPasswordMatch=await bcrypt.compare(password,user.password);
        if(!isPasswordMatch){
            return res.status(400).json({
                success:false,
                message:"Incorrect email or password"
            });
        }
        generateToken(res, user, `Welcome back ${user.name}`);

        
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Failed to register"
        })
    }   
}
 export const logout=async(req,res)=>{
    try{
        return res.status(200).cookie("token","",{maxAge:0}).json({
            message:"Logged out successfully",
            success:true
        })

    } catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Failed to logout"
        })

    }
 }
 export const sendOtp = async (req, res, next) => {
    try {
        const { email,_purpose } = req.body;
        console.log("Email for OTP:", email);
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        // Delete any existing unused OTPs for this user and purpose
        await OTP.deleteMany({ userId: user._id, purpose: _purpose, isUsed: false, expiresAt: { $gt: new Date() } });

        const newOtp = new OTP({
            userId: user._id,
            code: otpCode,
            purpose: 'email_verification',
            expiresAt: expiresAt
        });
        await newOtp.save();

        // Send the email
        const emailHtml = `
            <p>Hello ${user.name},</p>
            <p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address:</p>
            <h3>${otpCode}</h3>
            <p>This OTP is valid for the next 10 minutes.</p>
            <p>If you did not request this code, please ignore this email.</p>
        `;
        await sendEmail(user.email, 'Your Email Verification Code', emailHtml);

        res.status(200).json({ message: 'Verification OTP sent to your email.' });

    } catch (error) {
        console.error('Error in sendOtp controller:', error);
        next(error); // Pass the error to the centralized error handler
    }
};

// Verify Email function
export const verifyEmail = async (req, res, next) => {
    try {
        const { email, otpCode } = req.body;
        console.log("Email for verification:", email);
        console.log("OTP Code for verification:", otpCode);
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified.' });
        }

        const otpDoc = await OTP.findOneAndUpdate(
            {
                userId: user._id,
                code: otpCode,
                purpose: 'email_verification',
                isUsed: false,
                expiresAt: { $gt: new Date() }
            },
            { $set: { isUsed: true } },
            { new: true }
        );

        if (!otpDoc) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
        }

        user.isEmailVerified = true;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully!' });

    } catch (error) {
        console.error('Error in verifyEmail controller:', error);
        next(error); // Pass the error to the centralized error handler
    }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // For security, always send a generic success message
            // to avoid revealing if an email exists in the system.
            return res.status(200).json({ message: 'If an account with that email exists, a password reset OTP has been sent.' });
        }

        // Generate a new OTP for password reset
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes for password reset

        // Invalidate any active password reset OTPs for this user
        await OTP.deleteMany({ userId: user._id, purpose: 'password_reset', isUsed: false, expiresAt: { $gt: new Date() } });

        const newOtp = new OTP({
            userId: user._id,
            code: otpCode,
            purpose: 'password_reset',
            expiresAt: expiresAt
        });
        await newOtp.save();

        // Construct the password reset email
        const emailHtml = `
            <p>Hello ${user.name},</p>
            <p>You have requested to reset your password. Please use the following One-Time Password (OTP) to proceed:</p>
            <h3>${otpCode}</h3>
            <p>This OTP is valid for the next 15 minutes.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>For security, we recommend you change your password immediately if you did not initiate this request.</p>
        `;

        await sendEmail(user.email, 'Your Password Reset Request', emailHtml);

        res.status(200).json({ message: 'If an account with that email exists, a password reset OTP has been sent.' });

    } catch (error) {
        console.error('Error in forgotPassword controller:', error);
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { email, otpCode, newPassword } = req.body;

        if (!email || !otpCode || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find and invalidate the OTP
        const otpDoc = await OTP.findOneAndUpdate(
            {
                userId: user._id,
                code: otpCode,
                purpose: 'password_reset',
                isUsed: false,
                expiresAt: { $gt: new Date() } // Check if not expired
            },
            { $set: { isUsed: true } }, // Mark as used
            { new: true }
        );

        if (!otpDoc) {
            return res.status(400).json({ message: 'Invalid or expired OTP for password reset. Please request a new one.' });
        }

        // Hash the new password and save it
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Error in resetPassword controller:', error);
        next(error);
    }
};
 export const getUserProfile=async(req,res)=>{
    try{
    const userId=req.id;
    const user = await User.findById(userId).select("-password").populate("enrolledCourses");
   
    
    if(!user){
        return res.status(404).json({
            message:"Profile not found",
            success:false
        })
    }
    return res.status(200).json({
        success:true,
        user
    })
    
    
        
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Failed to logout"
        })
    }
}
    export const updateProfile = async (req,res) => {
        try {
            const userId = req.id;
            const {name} = req.body;
            const profilePhoto = req?.file;
    
            const user = await User.findById(userId);


            if(!user){
                return res.status(404).json({
                    message:"User not found",
                    success:false
                }) 
                
            }
            // extract public id of the old image from the url is it exists;
            if(user.photoUrl){
                const publicId = user.photoUrl.split("/").pop().split(".")[0]; // extract public id
                deleteMediaFromCloudinary(publicId);
            }
    
            // upload new photo
            let updatedData;
            if(profilePhoto){ const cloudResponse = await uploadMedia(profilePhoto.path);
                const photoUrl = cloudResponse.secure_url;
                updatedData = {name, photoUrl};
            }
            
            const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {new:true}).select("-password");
    
            return res.status(200).json({
                success:true,
                user:updatedUser,
                message:"Profile updated successfully."
            })
    
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success:false,
                message:"Failed to update profile"
            })
        }
    }
