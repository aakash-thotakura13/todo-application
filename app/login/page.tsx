import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Welcome back
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          Log in to your shared task board.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
