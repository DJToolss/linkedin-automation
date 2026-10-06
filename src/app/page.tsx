import Link from "next/link";

import { ThemeSwitcher } from "@/app/_components/theme-switcher";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center bg-bg px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeSwitcher />
      </div>
      <section className="max-w-2xl text-center">
        <p className="text-[13.5px] font-semibold text-brass">LinkedIn Automation</p>
        <h1 className="mt-4 font-display text-[32px] font-medium text-text">Plan your next LinkedIn post with confidence.</h1>
        <p className="mt-5 text-[15px] text-text-muted">Create, schedule, and publish posts from one focused workspace.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="ui-btn-primary" href="/register">
            Create an account
          </Link>
          <Link className="ui-btn-secondary" href="/login">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
