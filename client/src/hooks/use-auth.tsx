import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  company: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  sendCodeMutation: UseMutationResult<any, Error, SendCodeData>;
  verifyCodeMutation: UseMutationResult<any, Error, VerifyCodeData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type SendCodeData = {
  phoneNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type VerifyCodeData = {
  phoneNumber?: string;
  email?: string;
  code: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem("sessionId")
  );

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      if (!sessionId) return undefined;
      
      try {
        const response = await fetch("/api/auth/user", {
          headers: {
            "X-Session-Id": sessionId,
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            setSessionId(null);
            localStorage.removeItem("sessionId");
            return undefined;
          }
          throw new Error("Failed to fetch user");
        }
        
        return await response.json();
      } catch (error) {
        setSessionId(null);
        localStorage.removeItem("sessionId");
        throw error;
      }
    },
    enabled: !!sessionId,
  });

  const sendCodeMutation = useMutation({
    mutationFn: async (data: SendCodeData) => {
      const res = await apiRequest("POST", "/api/auth/send-code", data);
      return await res.json();
    },
    onSuccess: (data, variables) => {
      const contactMethod = variables.email ? "email" : "phone";
      toast({
        title: "Code Sent",
        description: `Verification code sent to your ${contactMethod}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: VerifyCodeData) => {
      const res = await apiRequest("POST", "/api/auth/verify-code", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      localStorage.setItem("sessionId", data.sessionId);
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({
        title: "Login successful",
        description: "Welcome to Instant Plumber Connect!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (sessionId) {
        await apiRequest("POST", "/api/auth/logout", {}, {
          "X-Session-Id": sessionId,
        });
      }
    },
    onSuccess: () => {
      setSessionId(null);
      localStorage.removeItem("sessionId");
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAuthenticated: !!user,
        sendCodeMutation,
        verifyCodeMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}