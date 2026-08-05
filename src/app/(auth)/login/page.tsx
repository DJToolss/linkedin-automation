import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { LoginForm } from "@/app/(auth)/_components/auth-form";

export default async function LoginPage() {
  if ((await auth())?.user?.id) redirect("/dashboard");
  return <AuthShell title="Welcome back"><LoginForm /></AuthShell>;
}
