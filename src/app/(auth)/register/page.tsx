import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { RegisterForm } from "@/app/(auth)/_components/auth-form";

export default async function RegisterPage() {
  if ((await auth())?.user?.id) redirect("/dashboard");
  return <AuthShell title="Create your account"><RegisterForm /></AuthShell>;
}
