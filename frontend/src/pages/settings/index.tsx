import type { ReactElement } from "react";
import { Redirect } from "wouter";

export default function SettingsIndexRoute(): ReactElement {
  return <Redirect to="/settings/profile" />;
}
