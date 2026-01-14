
// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CreateGameRoomPage } from './pages/CreateGameRoomPage';
import { MyGameRoomsPage } from './pages/MyGameRoomsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { TournamentsPage } from './pages/TournamentsPage';
import { LiveGameRoomPage } from './pages/LiveGameRoomPage';
import { WalletPage } from './pages/WalletPage';
import { DiscussionsPage } from './pages/DiscussionsPage';
import { UsernameLoginPage } from './pages/UsernameLoginPage';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { NotFoundPage } from './components/UI/NotFoundPage';
import { MainLayout } from './components/Layout/MainLayout';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <UsernameLoginPage />,
    errorElement: <ErrorBoundary><NotFoundPage /></ErrorBoundary>,
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary><NotFoundPage /></ErrorBoundary>,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: '/create-game-room',
        element: <CreateGameRoomPage onGameCreated={() => {}} />,
      },
      {
        path: '/my-game-rooms',
        element: <MyGameRoomsPage onJoinRoom={() => {}} />,
      },
      {
        path: '/leaderboard',
        element: <LeaderboardPage />,
      },
      {
        path: '/discussions',
        element: <DiscussionsPage />,
      },
      {
        path: '/profile/:username?',
        element: <ProfilePage />,
      },
      {
        path: '/tournaments',
        element: <TournamentsPage />,
      },
      {
        path: '/game-room/:id',
        element: <LiveGameRoomPage />,
      },
      {
        path: '/wallet',
        element: <WalletPage />,
      },
    ],
  },
  // Catch-all route for 404 pages
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
