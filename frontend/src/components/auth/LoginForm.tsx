import React, { useState } from "react";
import { useSupabase } from "../../supabase/SupabaseProvider";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

interface LoginFormProps {
  onSuccess?: () => void;
  showSignupLink?: boolean;
}

export default function LoginForm({
  onSuccess,
  showSignupLink = true,
}: LoginFormProps) {
  const { client } = useSupabase();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const signInWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const redirectTo = `${window.location.origin}`;
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false, // Only allow existing users to login
        },
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for the login link.",
        duration: 5000,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      const redirectTo = `${window.location.origin}`;
      await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      });

      toast({
        title: "Magic link resent!",
        description: "Check your email again.",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md mx-auto rounded-xl shadow-lg border-gray-200/50 dark:border-white/10 bg-white/95 dark:bg-[#010613]/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#38BDF8]/10 dark:bg-[#38BDF8]/20 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-[#38BDF8]" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            We've sent a magic link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Click the link in your email to sign in. The link will expire in 1
            hour.
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={isLoading}
              variant="outline"
              className="w-full border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:bg-gray-100/50 dark:hover:bg-white/5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend magic link
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              variant="ghost"
              className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Use a different email
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto rounded-xl shadow-lg border-gray-200/50 dark:border-white/10 bg-white/95 dark:bg-[#010613]/95 backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-[#38BDF8]/10 dark:bg-[#38BDF8]/20 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-[#38BDF8]" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300">
          Sign in to your account with a magic link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={signInWithOtp} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
                className="pl-10 w-full border-gray-300/40 dark:border-white/20 text-gray-900 dark:text-white bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8]/50"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We'll send you a secure link to sign in instantly
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-[#38BDF8]/20 hover:shadow-[#38BDF8]/30"
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                Send magic link
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        {showSignupLink && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
