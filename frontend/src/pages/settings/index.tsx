import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

export default function SettingsIndexRoute(): ReactElement {
  return <Navigate replace to="/settings/profile" />;
}
