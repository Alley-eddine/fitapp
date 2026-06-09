import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg bg-cyan-400 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-6 ${className}`}>
      {children}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  coach: "Coach",
  student: "Élève",
  user: "Autonome",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-sm font-medium text-cyan-300">
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}
