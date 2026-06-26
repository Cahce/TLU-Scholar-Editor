import { Outlet } from "react-router";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { useAuthStore } from "../../stores/authStore";

type Role = "admin" | "teacher" | "student";

export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Role comes from the authenticated user (token / `/auth/me`), not the URL.
  // The route guards guarantee the URL space matches the user's role.
  const role: Role = useAuthStore((state) => state.user?.role) ?? "student";
  const showSidebar = role === "admin";

  return (
    <div className="h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      <Header
        role={role}
        showMenuButton={showSidebar}
        onMenuClick={() => setIsMobileMenuOpen((open) => !open)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {showSidebar && (
          <>
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            <div
              className={`
                absolute md:static inset-y-0 left-0 z-30 transform
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
                md:translate-x-0 transition-transform duration-300 ease-in-out h-full
              `}
            >
              <Sidebar role={role} onCloseMobile={() => setIsMobileMenuOpen(false)} />
            </div>
          </>
        )}

        <main className="flex-1 overflow-auto flex flex-col relative w-full">
          <div className="p-4 md:p-6 lg:p-8 flex-1 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
