import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AccountClient from "@/components/member/account-form";

export default async function AccountPage() {
  const { user, profile } = await getSession();
  if (!user || !profile) redirect("/login?next=/member/account");
  return <AccountClient email={profile.email} name={profile.name} phone={profile.phone} />;
}
