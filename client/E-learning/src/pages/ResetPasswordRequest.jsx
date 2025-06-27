"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForgotPasswordMutation, useResetPasswordMutation } from "@/features/api/authApi";
import { useNavigate } from "react-router-dom";




export default function ResetPasswordFlow() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const [forgotPassword] = useForgotPasswordMutation();
  const [resetPassword] = useResetPasswordMutation();
  const navigate = useNavigate();

  // Initialize timer from localStorage on load
  useEffect(() => {
    const expiry = localStorage.getItem("otp-expiry");
    if (expiry) {
      const remaining = Math.floor((+expiry - Date.now()) / 1000);
      if (remaining > 0) setTimer(remaining);
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSendOtp = async () => {
    try {
      const res = await forgotPassword({ email }).unwrap();
      setOtpSent(true);

      const expiry = Date.now() + 60000; // 60 seconds from now
      localStorage.setItem("otp-expiry", expiry.toString());
      setTimer(60);
      console.log("OTP sent successfully:", res);
      toast.success(res.message || "OTP sent successfully!");
    } catch (err) {
      toast.error(res.message |" Failed to send OTP. Please try again.");
      console.log(err);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await resetPassword({
        email,
        otpCode: otp,
        newPassword,
      }).unwrap();

      toast.success(res.message || "Password have been reset!");
      setTimeout(() => navigate("/"), 1500); // redirect after short delay
    } catch (err) {
      toast.error("Failed to reset password. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 p-4 border rounded-xl shadow">
      <h2 className="text-xl font-semibold">Reset Password</h2>

      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={otpSent}
        required
      />

      <Button onClick={handleSendOtp} disabled={timer > 0 || !email} className="w-full">
        {timer > 0 ? `Resend in ${timer}s` : "Send OTP"}
      </Button>

      {otpSent && (
        <>
          <Input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button onClick={handleResetPassword} className="w-full">
            Reset Password
          </Button>
        </>
      )}
    </div>
  );
}
