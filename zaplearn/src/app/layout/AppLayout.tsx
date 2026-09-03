import { GraduationCap, Menu, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/manage", label: "Manage decks" },
];

export function AppLayout() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const showOnline = () => setOnline(true);
    const showOffline = () => setOnline(false);
    window.addEventListener("online", showOnline);
    window.addEventListener("offline", showOffline);
    return () => {
      window.removeEventListener("online", showOnline);
      window.removeEventListener("offline", showOffline);
    };
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"
          aria-label="Main navigation"
        >
          <Link
            className="flex items-center gap-2 font-semibold tracking-tight"
            to="/"
          >
            <GraduationCap className="text-primary" /> ZapLearn
          </Link>
          <div className="flex items-center gap-1">
            <div className="hidden gap-1 sm:flex">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                      isActive && "bg-accent",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <GraduationCap className="text-primary" /> ZapLearn
                  </SheetTitle>
                </SheetHeader>
                <nav className="grid gap-2 px-4" aria-label="Mobile navigation">
                  {links.map((link) => (
                    <SheetClose asChild key={link.to}>
                      <NavLink
                        to={link.to}
                        className={({ isActive }) =>
                          cn(
                            "rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent",
                            isActive && "bg-accent text-accent-foreground",
                          )
                        }
                      >
                        {link.label}
                      </NavLink>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      {!online && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 border-b bg-muted px-4 py-2 text-sm"
        >
          <WifiOff className="size-4" /> Offline — locally saved decks are still
          available.
        </p>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
