import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AuthPage } from '@/features/auth/AuthPage';
import { AppShell } from '@/features/layout/AppShell';
import { TodayPage } from '@/features/today/TodayPage';
import { AddFoodPage } from '@/features/add-food/AddFoodPage';
import { QuickAddPage } from '@/features/add-food/QuickAddPage';
import { RecipeBuilderPage } from '@/features/recipes/RecipeBuilderPage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<TodayPage />} />
              <Route path="foods" element={<AddFoodPage />} />
              <Route path="foods/quick" element={<QuickAddPage />} />
              <Route path="foods/recipe" element={<RecipeBuilderPage />} />
              <Route path="recipes" element={<RecipeBuilderPage />} />
              <Route path="add" element={<Navigate to="/foods" replace />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
