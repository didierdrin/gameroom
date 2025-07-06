import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CreateGameRoomPage } from './pages/CreateGameRoomPage';
import { MyGameRoomsPage } from './pages/MyGameRoomsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { TournamentsPage } from './pages/TournamentsPage';
import { LiveGameRoomPage } from './pages/LiveGameRoomPage';
import { UsernameLoginPage } from './pages/UsernameLoginPage';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { MainLayout } from './components/Layout/MainLayout';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    errorElement: <ErrorBoundary><div>Page not found</div></ErrorBoundary>,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/create-game-room',
        element: <CreateGameRoomPage onGameCreated={() => {}} />,
      },
      {
        path: '/my-game-rooms',
        element: <MyGameRoomsPage onJoinRoom={[]} />,
      },
      {
        path: '/leaderboard',
        element: <LeaderboardPage />,
      },
      {
        path: '/profile',
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
        path: '/login',
        element: <UsernameLoginPage />,
      },
    ],
  },
]); 