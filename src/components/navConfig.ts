/** Sidebar sub-menus for the Super Admin portal. `built: false` entries open a "coming soon" page until the real page exists. */
export type NavChild = { label: string; to: string; built: boolean };

export const navGroups: Record<string, NavChild[]> = {
  Users: [
    { label: "All Users", to: "/users", built: true },
    { label: "Add User", to: "/users/new", built: true },
    { label: "Roles & Permissions", to: "/users/roles", built: false },
    { label: "Pending Approvals", to: "/users/approvals", built: false },
  ],
  "Subscription & Billing": [
    { label: "Overview", to: "/subscriptions", built: true },
    { label: "Subscription Plans", to: "/subscriptions/plans", built: false },
    { label: "Institution Subscriptions", to: "/subscriptions/institutions", built: false },
    { label: "Invoices & Payments", to: "/subscriptions/invoices", built: false },
    { label: "Billing Settings", to: "/subscriptions/settings", built: false },
  ],
  "Modules & Features": [
    { label: "All Modules", to: "/modules", built: true },
    { label: "Custom Configurations", to: "/modules/custom", built: false },
  ],
  "Content Library": [
    { label: "All Content", to: "/content", built: false },
    { label: "Categories", to: "/content/categories", built: false },
    { label: "Media Library", to: "/content/media", built: false },
  ],
  Communications: [
    { label: "All Communications", to: "/communications", built: true },
    { label: "Announcements", to: "/communications?tab=ANNOUNCEMENT", built: true },
    { label: "Email", to: "/communications?tab=EMAIL", built: true },
    { label: "SMS", to: "/communications?tab=SMS", built: true },
    { label: "Push Notifications", to: "/communications?tab=PUSH", built: true },
    { label: "Scheduled", to: "/communications?tab=SCHEDULED", built: true },
  ],
  "Reports & Analytics": [
    { label: "Overview", to: "/reports", built: false },
    { label: "Institution Reports", to: "/reports/institutions", built: false },
    { label: "Financial Reports", to: "/reports/financial", built: false },
    { label: "Usage Reports", to: "/reports/usage", built: false },
  ],
  "Support & Tickets": [
    { label: "All Tickets", to: "/support", built: false },
    { label: "Knowledge Base", to: "/support/knowledge-base", built: false },
  ],
  "System Management": [
    { label: "System Health", to: "/system", built: false },
    { label: "Backup & Restore", to: "/system/backup", built: false },
    { label: "Maintenance", to: "/system/maintenance", built: false },
  ],
};

/** Routes to register for sub-items that have no page yet. */
export const placeholderRoutes = Object.entries(navGroups).flatMap(([section, kids]) =>
  kids.filter((k) => !k.built).map((k) => ({ section, label: k.label, path: k.to })),
);

/** True when the current URL is this sub-item. */
export function childActive(to: string, pathname: string, search: string): boolean {
  const [p, query] = to.split("?");
  if (p !== pathname) return false;
  return query ? search === `?${query}` : !search.includes("tab=");
}
