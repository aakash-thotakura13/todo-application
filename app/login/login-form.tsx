"use client";

import { useActionState } from "react";
import { DISPLAY_NAMES, USERS } from "@/lib/users";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Who are you?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {USERS.map((u) => (
            <label
              key={u}
              className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-3 text-center font-medium text-zinc-700 has-checked:border-blue-600 has-checked:bg-blue-600 has-checked:text-white dark:border-zinc-700 dark:text-zinc-300"
            >
              <input
                type="radio"
                name="user"
                value={u}
                defaultChecked={state.user === u}
                className="sr-only"
                required
              />
              {DISPLAY_NAMES[u]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="pin"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="current-password"
          required
          placeholder="••••"
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-center text-2xl tracking-[0.5em] text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-100"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
