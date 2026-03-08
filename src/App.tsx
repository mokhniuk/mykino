import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import Layout from "@/components/Layout";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import WatchedPage from "./pages/WatchedPage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import SettingsPage from "./pages/SettingsPage";
import FavouritesPage from "./pages/FavouritesPage";
import RecoSectionPage from "./pages/RecoSectionPage";
import AchievementsTop100Page from "./pages/AchievementsTop100Page";
import AchievementsDirectorPage from "./pages/AchievementsDirectorPage";
import AchievementsMilestonesPage from "./pages/AchievementsMilestonesPage";
import TVShowPage from "./pages/TVShowPage";
import DirectorPage from "./pages/DirectorPage";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";

import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/app" element={<Layout />}>
                  <Route index element={<Index />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="watchlist" element={<WatchlistPage />} />
                  <Route path="watched" element={<WatchedPage />} />
                  <Route path="movie/:id" element={<MovieDetailsPage />} />
                  <Route path="tv/:id" element={<TVShowPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="favourites" element={<FavouritesPage />} />
                  <Route path="section/:slug" element={<RecoSectionPage />} />
                  <Route path="achievements/top100" element={<AchievementsTop100Page />} />
                  <Route path="director/:slug" element={<DirectorPage />} />
                  <Route path="achievements/director/:slug" element={<AchievementsDirectorPage />} />
                  <Route path="achievements/milestones" element={<AchievementsMilestonesPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
