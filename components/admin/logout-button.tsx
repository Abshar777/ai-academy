"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="font-noi-grotesk text-[14px] text-neutral-50 transition-colors duration-150 hover:text-neutral-90"
    >
      Log out
    </button>
  );
}
