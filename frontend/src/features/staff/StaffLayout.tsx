import { ReactNode, useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileHeart,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiGet } from "../../lib/api";
import { getSession } from "../../lib/auth";
import {
  moduleForPath,
  useCabinetModules,
} from "../../lib/subscriptionModules";
import { WorkspaceNavButton } from "../../components/WorkspaceNavButton";

const links = [
  ["dashboard", "/staff/dashboard", LayoutDashboard, ""],
  ["appointments", "/staff/appointments", CalendarDays, "appointments"],
  ["team", "/staff/team", UsersRound, "manage_staff"],
  ["patients", "/staff/patients", UsersRound, "patients"],
  ["payments", "/staff/payments", CreditCard, "payments"],
  ["fees", "/staff/honoraires", WalletCards, "honoraires"],
  ["cnss", "/staff/cnss", ClipboardList, "cnss"],
  ["documents", "/staff/documents", FileText, "documents"],
  ["prescriptions", "/staff/prescriptions", FileHeart, "prescriptions"],
  ["unpaidReminders", "/staff/reminders", MessageCircle, "whatsapp_reminders"],
  ["myProfile", "/staff/profile", UserRound, ""],
] as const;

export function StaffLayout({
  children,
  cabinetName,
  onNavigate,
  onLogout,
}: {
  children: ReactNode;
  cabinetName: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const session = getSession();
  const cabinetModules = useCabinetModules();
  const [permissions, setPermissions] = useState<Record<string, string>>({});
  useEffect(() => {
    if (session?.accessToken)
      apiGet<{ permissions: Record<string, string> }>(
        "/staff/me/permissions",
        session.accessToken,
      )
        .then((data) => setPermissions(data.permissions))
        .catch(() => undefined);
  }, [session?.accessToken]);
  const currentPath = window.location.pathname;
  return (
    <main className="min-h-screen bg-atlas-cloud text-atlas-ink">
      <header className="sticky top-0 z-40 border-b border-atlas-line bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src="/images/fadaa-logo.svg"
                alt="FADAA Santé"
                className="h-11 w-32 shrink-0 object-contain"
              />
              <span className="hidden h-7 w-px bg-atlas-line sm:block" />
              <div className="hidden min-w-0 sm:block">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {t("staffSpace")}
                </p>
                <p className="truncate text-sm font-bold text-atlas-petrol">
                  {cabinetName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex shrink-0 items-center gap-2 rounded-[9px] px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={17} />
                <span className="hidden sm:inline">{t("logout")}</span>
              </button>
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto scroll-smooth border-t border-atlas-line/70 px-4 py-2 [scrollbar-width:thin] md:px-6">
            {links
              .filter(([, path]) => {
                const required = moduleForPath(path);
                return (
                  !required ||
                  !cabinetModules ||
                  cabinetModules.includes(required)
                );
              })
              .filter(([, , , module]) =>
                !module || ["read", "write", "admin"].includes(permissions[module]),
              )
              .map(([label, path, Icon]) => {
                return (
                  <WorkspaceNavButton
                    key={path}
                    title={t(label)}
                    onClick={() => onNavigate(path)}
                    active={
                      currentPath === path || currentPath.startsWith(`${path}/`)
                    }
                    icon={Icon}
                    layoutId="staff-active-nav"
                  >
                    {t(label)}
                  </WorkspaceNavButton>
                );
              })}
          </nav>
        </div>
      </header>
      <section className="min-w-0">{children}</section>
    </main>
  );
}
