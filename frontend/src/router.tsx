import React from "react";
import { RouterProvider, createBrowserRouter, type RouteObject } from "react-router-dom";

type RouteModule = {
  default: React.ComponentType;
};

const routeModules = import.meta.glob("./routes/**/*.tsx", { eager: true }) as Record<string, RouteModule>;

const toRoutePath = (filePath: string) => {
  const withoutPrefix = filePath.replace("./routes", "");
  const withoutExt = withoutPrefix.replace(/\.tsx$/, "");

  if (withoutExt === "/index") {
    return "/";
  }

  const segments = withoutExt
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment === "index") {
        return "";
      }

      if (segment.startsWith("$")) {
        return `:${segment.slice(1)}`;
      }

      return segment;
    })
    .filter(Boolean);

  return `/${segments.join("/")}`;
};

const routes: RouteObject[] = Object.entries(routeModules).map(([filePath, module]) => ({
  path: toRoutePath(filePath),
  element: React.createElement(module.default)
}));

const router = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
