import { useState } from "react";
import { Link } from "react-router";
import { Eye, EyeOff, ArrowRight, Mail, Check, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";
import { AuthFooter } from "../components/auth/AuthFooter";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  hint: string;
} {
  if (!password) return { score: 0, label: "", hint: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: "Weak", hint: "Add uppercase letters and numbers." };
  if (score === 2) return { score: 2, label: "Moderate", hint: "Add a symbol." };
  if (score === 3) return { score: 3, label: "Good", hint: "Almost there." };
  return { score: 4, label: "Strong", hint: "Great password!" };
}

const STRENGTH_COLORS = ["", "bg-red-400", "bg-amber-400", "bg-blue-500", "bg-green-500"];

export function RegisterPage() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const strength = getPasswordStrength(password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("success");
    }, 800);
  }

  return (
    <div className="flex flex-col min-h-screen w-full font-sans">

      {/* ── Main - Auth Shell Wrapper ── */}
      <div className="flex flex-1">

        {/* Section - Brand Panel (Left/Top) */}
        <AuthBrandPanel />

        {/* Right content area — switches between form and success */}
        {step === "form" ? (
          <div className="flex flex-1 items-center justify-center bg-surface-base px-6 py-12 lg:px-40 overflow-y-auto">
            <div className="w-full max-w-[448px]">

              <div className="flex flex-col gap-2 mb-10">
                <h2 className="text-[30px] font-semibold text-foreground font-display leading-[36px]">
                  Create your account
                </h2>
                <p className="text-base text-[#434655]">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[--val-primary-dark] hover:underline">
                    Log in
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-text-secondary">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-sm font-medium text-text-secondary">
                    Work Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="text-sm font-medium text-text-secondary">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors ${
                          password && i < strength.score
                            ? STRENGTH_COLORS[strength.score]
                            : "bg-surface-tint"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-tertiary leading-[18px]">
                    {password
                      ? `Strength: ${strength.label}. ${strength.hint}`
                      : "Strength: —"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <label className="flex items-start gap-3 py-2 cursor-pointer select-none">
                  <div className="flex items-center h-5 shrink-0">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="size-4 rounded border-border-default accent-interactive-primary cursor-pointer"
                    />
                  </div>
                  <span className="text-xs text-[#434655] leading-[18px]">
                    I agree to the{" "}
                    <a href="#" className="text-[--val-primary-dark] hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-[--val-primary-dark] hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-md flex items-center justify-center gap-2 shadow-[0px_1px_2px_0px_rgba(0,74,198,0.2)]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Creating account…"
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="size-3" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* Section - Success Content Area (Right) */
          <div className="flex flex-1 items-center justify-center bg-val-bg-tint px-6 py-12 overflow-y-auto">
            <div className="flex flex-col gap-8 w-full max-w-[480px]">

              {/* Success Card */}
              <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-12 py-12 flex flex-col items-center">

                {/* Envelope Icon Container */}
                <div className="relative size-20 mb-8 shrink-0">
                  {/* Background */}
                  <div className="size-20 rounded-full bg-[#e4efff] flex items-center justify-center">
                    <Mail className="size-8 text-[--val-primary-dark]" />
                  </div>
                  {/* Background+Border — green check badge */}
                  <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-[#10b981] border-4 border-white flex items-center justify-center">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </div>
                </div>

                {/* Heading 2 - Typography */}
                <h2 className="text-[30px] font-bold text-val-heading font-display leading-[36px] text-center mb-4">
                  Check your inbox
                </h2>

                {/* Paragraph */}
                <div className="text-center text-base leading-[26px] mb-8">
                  <p className="text-[#434655]">We've sent a verification link to</p>
                  <p>
                    <span className="font-semibold text-val-heading">
                      {email || "alex.doe@example.com"}
                    </span>
                    <span className="text-[#434655]">
                      . Click the link to activate your account.
                    </span>
                  </p>
                </div>

                {/* Primary Action (Visual weight) */}
                <div className="w-full flex flex-col gap-4">

                  {/* Verification Help */}
                  <div className="w-full bg-val-bg-tint rounded-lg px-6 py-4 flex items-center justify-center gap-3">
                    <span className="text-sm font-medium text-[#434655]">
                      Didn't receive it?
                    </span>
                    {/* Button → Resend the email */}
                    <button
                      type="button"
                      className="text-sm font-semibold text-[--val-primary-dark] hover:underline"
                    >
                      Resend the email
                    </button>
                    {/* Countdown background */}
                    <div className="bg-[#d8e3f4] rounded px-2 py-0.5">
                      <span className="text-xs text-[#737686] font-mono">0:45</span>
                    </div>
                  </div>

                  {/* Margin / Horizontal Divider */}
                  <div className="w-full h-px bg-[#c3c6d7]" />

                  {/* Button - Back Action */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setStep("form")}
                      className="flex items-center gap-2 text-sm font-medium text-[#434655] hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="size-3" />
                      Wrong email? Go back
                    </button>
                  </div>
                </div>
              </div>

              {/* Assistance Note */}
              <p className="text-sm text-[#737686] text-center">
                Having trouble? Contact our{" "}
                <a href="#" className="text-[--val-primary-dark] hover:underline">
                  Support Team
                </a>{" "}
                for assistance.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Simple Footer (Legal only for auth screens) */}
      <AuthFooter />
    </div>
  );
}
