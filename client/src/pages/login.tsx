import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  // Get role from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get("role") || "gate-operator";
  const storeId = urlParams.get("storeId");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(formData.username, formData.password, role);
      if (!success) {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-metro-blue to-metro-deep-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-metro-blue rounded-lg flex items-center justify-center">
                <Building className="text-white h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {role === "admin" ? "Admin Login" : "Gate Operator Login"}
            </CardTitle>
            <p className="text-center text-gray-600">
              Metro Cash & Carry Vehicle Tracking System
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter your password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-2 top-[38px] text-gray-500 hover:text-gray-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-metro-blue hover:bg-metro-deep-blue text-white"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
                className="text-metro-blue hover:text-metro-deep-blue"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>

            {role === "gate-operator" && (
              <div className="text-center text-sm text-gray-600">
                <p>Demo credentials:</p>
                <p>Username: op11, Password: 123</p>
              </div>
            )}

            {role === "admin" && (
              <div className="text-center text-sm text-gray-600">
                <p>Demo credentials:</p>
                <p>Username: admin, Password: admin123</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
