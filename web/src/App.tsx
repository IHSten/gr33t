import "./App.css";
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthBar } from "./components/AuthBar";
import { RequireAuth } from "./auth/RequireAuth";
import { LandingPage } from "./pages/LandingPage";
import { PublicCardPage } from "./pages/PublicCardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ChunkErrorBoundary } from "./components/ChunkErrorBoundary";

// The public routes ("/", "/card/:id") stay eagerly bundled so anonymous
// visitors — the paths the Lighthouse audits hit — render without a chunk
// waterfall. The auth-only dashboard and editor are the heaviest code, never
// needed by anonymous visitors, so they split into their own chunks.
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage }))
);
const CardEditorPage = lazy(() =>
  import("./pages/CardEditorPage").then(m => ({ default: m.CardEditorPage }))
);
// Legal pages are static prose, rarely visited, and never on the hot path, so
// they split out of the main bundle.
const TermsPage = lazy(() =>
  import("./pages/legal/TermsPage").then(m => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import("./pages/legal/PrivacyPage").then(m => ({ default: m.PrivacyPage }))
);

function App() {
  return (
    <>
      <AuthBar />
      <main>
        <ChunkErrorBoundary
          fallback={
            <p style={{ padding: "2rem", textAlign: "center" }}>
              Something went wrong loading this page. <a href="/">Reload</a>
            </p>
          }
        >
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/card/:id" element={<PublicCardPage />} />
              <Route path="/legal/tos" element={<TermsPage />} />
              <Route path="/legal/privacy-policy" element={<PrivacyPage />} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <DashboardPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/cards/:id"
                element={
                  <RequireAuth>
                    <CardEditorPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </main>
    </>
  );
}

export default App;
