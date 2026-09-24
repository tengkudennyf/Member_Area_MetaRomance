import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import NotificationsClient from "@/components/member/notifications";

export default async function NotificationsPage() {
  const { user, profile } = await getSession();
  if (!user || !profile) redirect("/login?next=/member/notifications");
  return <NotificationsClient />;
}
