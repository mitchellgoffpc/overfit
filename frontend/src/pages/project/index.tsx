import type { ReactElement } from "react";
import { Redirect, Route, Switch, useParams } from "wouter";

import ProjectComparePage from "pages/project/compare";
import RunDetailPage from "pages/project/run";
import ProjectRunsPage from "pages/project/runs";
import ProjectSettingsPage from "pages/project/settings";

export default function ProjectPage(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();

  return (
    <Switch>
      <Route path="/:handle/:projectName/runs/:runName" component={RunDetailPage} />
      <Route path="/:handle/:projectName/compare" component={ProjectComparePage} />
      <Route path="/:handle/:projectName/settings" component={ProjectSettingsPage} />
      <Route path="/:handle/:projectName" component={ProjectRunsPage} />
      <Route path="/:handle/:projectName/*"><Redirect to={`/${handle}/${projectName}`} /></Route>
    </Switch>
  );
}
