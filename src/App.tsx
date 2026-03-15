import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { config } from "@/lib/config";

import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";

import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import WatchedPage from "./pages/WatchedPage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import SettingsPage from "./pages/SettingsPage";
// import FavouritesPage from "./pages/FavouritesPage";
import RecoSectionPage from "./pages/RecoSectionPage";
import AchievementsTop100Page from "./pages/AchievementsTop100Page";
import AchievementsDirectorPage from "./pages/AchievementsDirectorPage";
import AchievementsMilestonesPage from "./pages/AchievementsMilestonesPage";
import TVShowPage from "./pages/TVShowPage";
import DirectorPage from "./pages/DirectorPage";
import HistoryPage from "./pages/HistoryPage";
import NotFound from "./pages/NotFound";
import Community from "./pages/Community";
import CollectionPage from "./pages/CollectionPage";
import CollectionsBrowsePage from "./pages/CollectionsBrowsePage";

// Lazy load production-only pages
const Landing = lazy(() => import("./pages/Landing"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));

const IS_COMMUNITY = import.meta.env.VITE_IS_COMMUNITY_BUILD === 'true';

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <Routes>
                  {/* For community build, redirect root to app */}
                  <Route path="/" element={IS_COMMUNITY ? <Navigate to="/app" replace /> : <Landing />} />
                  
                  {/* Only show these if managed service or not community build */}
                  {config.hasManagedAI && (
                    <>
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/contact" element={<Contact />} />
                    </>
                  )}
                  
                  <Route path="/community" element={<Community />} />
                  <Route path="/app" element={<Layout />}>
                    <Route index element={<Index />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="watchlist" element={<WatchlistPage />} />
                    <Route path="watched" element={<WatchedPage />} />
                    <Route path="movie/:id" element={<MovieDetailsPage />} />
                    <Route path="tv/:id" element={<TVShowPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    {/* <Route path="favourites" element={<FavouritesPage />} /> */}
                    <Route path="section/:slug" element={<RecoSectionPage />} />
                    <Route path="achievements/top100" element={<AchievementsTop100Page />} />
                    <Route path="director/:slug" element={<DirectorPage />} />
                    <Route path="achievements/director/:slug" element={<AchievementsDirectorPage />} />
                    <Route path="achievements/milestones" element={<AchievementsMilestonesPage />} />
                    <Route path="collection/:slug" element={<CollectionPage />} />
                    <Route path="collections" element={<CollectionsBrowsePage />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
