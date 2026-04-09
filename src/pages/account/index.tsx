import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import OrganizationPage from "pages/account/organization";
import UserPage from "pages/account/user";
import NotFoundPage from "pages/not-found";
import { fetchAccount, useAccountsStore } from "stores/accounts";

export default function AccountsPage(): ReactElement {
  const { handle } = useParams<{ handle: string }>();
  const account = useAccountsStore((state) => state.accounts[handle]);
  const notFound = useAccountsStore((state) => state.notFoundHandles.has(handle));

  useEffect(() => {
    if (!account && !notFound) { void fetchAccount(handle); }
  }, [account, handle, notFound]);

  if (notFound) { return <NotFoundPage />; }
  if (!account) { return <div />; }

  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: account.type === "USER" ? "Profile" : "Organization" }]} />
      <NotebookShell columns="18.75rem 1fr" className="max-w-7xl">
        {account.type === "USER"
          ? <UserPage user={account} />
          : <OrganizationPage organization={account} />}
      </NotebookShell>
    </div>
  );
}
