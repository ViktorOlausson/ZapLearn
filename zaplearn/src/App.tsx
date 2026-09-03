import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "@/app/layout/AppLayout";

const Home = lazy(() =>
  import("@/pages/Home").then((module) => ({ default: module.Home })),
);
const Train = lazy(() =>
  import("@/pages/Train").then((module) => ({ default: module.Train })),
);
const Edit = lazy(() =>
  import("@/pages/Edit").then((module) => ({ default: module.Edit })),
);
const Manage = lazy(() =>
  import("@/pages/Manage").then((module) => ({ default: module.Manage })),
);

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      {children}
    </Suspense>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <Page>
              <Home />
            </Page>
          }
        />
        <Route
          path="/train/:deckId"
          element={
            <Page>
              <Train />
            </Page>
          }
        />
        <Route
          path="/edit/:deckId"
          element={
            <Page>
              <Edit />
            </Page>
          }
        />
        <Route
          path="/manage"
          element={
            <Page>
              <Manage />
            </Page>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
