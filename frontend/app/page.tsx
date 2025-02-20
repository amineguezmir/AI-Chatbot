"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaGoogle } from "react-icons/fa";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogin = async () => {
    const result = await signIn("google");
    if (result?.error) {
      console.log("Error logging in", result.error);
    }
  };

  useEffect(() => {
    if (session) {
      router.push("/chat");
    }
  }, [session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to AI Chatbot
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : session ? (
            <p className="text-center text-lg">Redirecting to chat...</p>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-gray-600">
                Sign in to start chatting with our AI
              </p>
              <Button
                onClick={handleLogin}
                className="w-full max-w-xs flex items-center justify-center space-x-2"
              >
                <FaGoogle className="w-5 h-5" />
                <span>Sign in with Google</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
