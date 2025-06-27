import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import {
  useSendOtpMutation,
  useVerifyEmailMutation,
} from "@/features/api/authApi";

const EmailVerification = () => {
  const email = useSelector((state) => state.auth.user?.email);
  console.log("Email for verification:", email);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const inputRefs = useRef([]);

  const [sendOtp, { isLoading: otpLoading }] = useSendOtpMutation();
  const [verifyEmail, { isLoading: verifyLoading }] = useVerifyEmailMutation();

  // Restore countdown from localStorage
  useEffect(() => {
    const sentAt = localStorage.getItem("lastOtpSentAt");
    if (sentAt) {
      const elapsed = Math.floor((Date.now() - Number(sentAt)) / 1000);
      const remaining = 60 - elapsed;
      if (remaining > 0) {
        setTimer(remaining);
      } else {
        localStorage.removeItem("otpSentAt");
      }
    }
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) localStorage.removeItem("lastOtpSentAt");
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async () => {
    if (!email) return toast.error("Email not found. Try logging in again.");
    try {
      await sendOtp({ email, purpose: "verify_email" }).unwrap();
      toast.success("OTP sent successfully!");
      localStorage.setItem("otpSentAt", Date.now().toString());
      setTimer(60);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to send OTP.");
    }
  };

  const handleVerifyOtp = async () => {
    const joinedOtp = otp.join("");
    if (joinedOtp.length !== 6) return toast.error("Enter the full 6-digit OTP.");
    try {
      await verifyEmail({ email, otpCode: joinedOtp }).unwrap();
      toast.success("Email verified successfully!");
      localStorage.removeItem("lastOtpSentAt");
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      toast.error(err?.data?.message || "Verification failed.");
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-20 p-6 border rounded-xl shadow-md space-y-6">
      <div className="text-sm text-muted-foreground">
        Verifying for email: <span className="font-medium">{email}</span>
      </div>

      <div className="space-y-2">
        <Label>Enter OTP</Label>
        <div className="flex justify-between gap-2">
          {otp.map((digit, idx) => (
            <Input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="text-center text-lg"
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button onClick={handleVerifyOtp} disabled={verifyLoading}>
          {verifyLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
            </>
          ) : (
            "Verify OTP"
          )}
        </Button>
        <Button
          onClick={handleSendOtp}
          disabled={timer > 0 || otpLoading}
          variant="secondary"
        >
          {otpLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
            </>
          ) : timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
        </Button>
      </div>
    </div>
  );
};

export default EmailVerification;
