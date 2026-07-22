"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Armchair,
  BookOpen,
  Building2,
  Calendar,
  ChartLine,
  CreditCard,
  FileChartColumn,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Link2,
  Menu,
  PartyPopper,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Armchair,
  BookOpen,
  Building2,
  Calendar,
  ChartLine,
  CreditCard,
  FileChartColumn,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Link2,
  PartyPopper,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
};

export type NavGroupData = {
  title: string;
  items: Array<{ label: string; icon: string; href: string }>;
};

function NavLinks({
  groups,
  onNavigate,
}: {
  groups: NavGroupData[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu interno"
      className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
    >
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            {group.title}
          </p>
          <ul className="mt-2 space-y-1">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              const active =
                item.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${
                      active
                        ? "border-l-2 border-accent bg-white/10 font-semibold text-white"
                        : "text-white/75 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon aria-hidden className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar({ groups }: { groups: NavGroupData[] }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-primary-dark lg:flex">
      <div className="px-5 py-5">
        <Link href="/app" aria-label="Visão geral">
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="Hub Digital"
            width={150}
            height={40}
          />
        </Link>
      </div>
      <NavLinks groups={groups} />
    </aside>
  );
}

export function MobileNav({ groups }: { groups: NavGroupData[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="rounded-md p-2 text-foreground-inverse hover:bg-white/10"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="relative flex w-72 max-w-[85vw] flex-col bg-primary-dark"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <Image
                src="/brand/logo-horizontal-white.png"
                alt="Hub Digital"
                width={130}
                height={34}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-md p-2 text-white/80 hover:bg-white/10"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
