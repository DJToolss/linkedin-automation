import Link from "next/link";

export default function Home() {
  return <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16"><section className="max-w-2xl text-center"><p className="font-medium text-blue-700">LinkedIn Automation</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Plan your next LinkedIn post with confidence.</h1><p className="mt-5 text-lg text-zinc-600">Create, schedule, and publish posts from one focused workspace.</p><div className="mt-8 flex justify-center gap-3"><Link className="rounded bg-blue-700 px-4 py-2 font-medium text-white" href="/register">Create an account</Link><Link className="rounded border px-4 py-2 font-medium" href="/login">Sign in</Link></div></section></main>;
}
