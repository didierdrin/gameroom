import React, { useState } from 'react';
import { SectionTitle } from '../components/UI/SectionTitle';
import { CalendarIcon, UsersIcon, TrophyIcon, ClockIcon, PlusCircleIcon } from 'lucide-react';
import { TournamentRegistrationModal } from '../components/Tournament/TournamentRegistrationModal';
const MOCK_ACTIVE_TOURNAMENTS = [{
  id: 101,
  name: 'ALU Chess Masters',
  gameType: 'Chess',
  participants: 32,
  maxParticipants: 32,
  startDate: '2023-11-20',
  endDate: '2023-11-25',
  prize: '500 ALU Points',
  status: 'registering',
  banner: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=2071',
  organizer: 'Chess Club'
}, {
  id: 102,
  name: 'Trivia Tournament',
  gameType: 'Trivia',
  participants: 28,
  maxParticipants: 48,
  startDate: '2023-11-25',
  endDate: '2023-11-26',
  prize: '300 ALU Points',
  status: 'registering',
  banner: 'https://images.unsplash.com/photo-1606167668584-78701c57f90d?auto=format&fit=crop&q=80&w=2070',
  organizer: 'Knowledge Hub'
}, {
  id: 103,
  name: 'UNO Championship',
  gameType: 'UNO',
  participants: 16,
  maxParticipants: 16,
  startDate: '2023-11-15',
  endDate: '2023-11-18',
  prize: '250 ALU Points',
  status: 'in_progress',
  banner: 'https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&q=80&w=2072',
  organizer: 'Gaming Society'
}];
const MOCK_PAST_TOURNAMENTS = [{
  id: 201,
  name: 'Pictionary Challenge',
  gameType: 'Pictionary',
  participants: 24,
  winner: 'Emma Davis',
  endDate: '2023-11-01',
  prize: '200 ALU Points',
  banner: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&q=80&w=2070'
}, {
  id: 202,
  name: 'Kahoot Sprint',
  gameType: 'Kahoot',
  participants: 56,
  winner: 'Michael Johnson',
  endDate: '2023-10-25',
  prize: '350 ALU Points',
  banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2071'
}];
export const TournamentsPage = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const handleRegisterClick = (tournament:any) => {
    setSelectedTournament(tournament);
    setShowRegistrationModal(true);
  };
  const handleRegisterSubmit = () => {
    setShowRegistrationModal(false);
  };
  const renderTournamentCard = (tournament:any) => {
    const isActive = activeTab === 'active';
    return <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="h-40 relative">
          <img src={tournament.banner} alt={tournament.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-4 w-full">
            <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
            <div className="flex items-center mt-1">
              <div className="bg-purple-600/70 text-white text-xs py-1 px-2 rounded">
                {tournament.gameType}
              </div>
              {isActive && tournament.status === 'registering' && <div className="ml-2 bg-green-600/70 text-white text-xs py-1 px-2 rounded flex items-center">
                  <ClockIcon size={12} className="mr-1" />
                  Registration Open
                </div>}
              {isActive && tournament.status === 'in_progress' && <div className="ml-2 bg-yellow-600/70 text-white text-xs py-1 px-2 rounded flex items-center">
                  <ClockIcon size={12} className="mr-1" />
                  In Progress
                </div>}
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-sm text-gray-400">
              <CalendarIcon size={16} className="mr-1" />
              <span>
                {isActive ? `${tournament.startDate} to ${tournament.endDate}` : `Ended ${tournament.endDate}`}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <UsersIcon size={16} className="mr-1" />
              <span>
                {isActive ? `${tournament.participants}/${tournament.maxParticipants}` : `${tournament.participants} participants`}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-sm">
              <TrophyIcon size={16} className="mr-1 text-yellow-500" />
              <span className="text-yellow-500">{tournament.prize}</span>
            </div>
            {!isActive && <div className="text-sm">
                <span className="text-gray-400">Winner: </span>
                <span className="font-medium">{tournament.winner}</span>
              </div>}
            {isActive && <div className="text-sm text-gray-400">
                Organized by: {tournament.organizer}
              </div>}
          </div>
          {isActive && <button onClick={() => handleRegisterClick(tournament)} className={`w-full py-2 rounded-lg font-medium ${tournament.status === 'registering' && tournament.participants < tournament.maxParticipants ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`} disabled={tournament.status !== 'registering' || tournament.participants >= tournament.maxParticipants}>
              {tournament.status === 'registering' && tournament.participants < tournament.maxParticipants ? 'Register Now' : tournament.status === 'registering' && tournament.participants >= tournament.maxParticipants ? 'Registration Full' : 'View Bracket'}
            </button>}
          {!isActive && <button className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">
              View Results
            </button>}
        </div>
      </div>;
  };
  return <div className="p-4 sm:p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="Tournaments" subtitle="Compete with other students in organized tournaments and win prizes" />
      <div className="flex justify-end mb-6">
        <button className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center">
          <PlusCircleIcon size={18} className="mr-2" />
          <span className="hidden sm:inline">Create Tournament</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>
      <div className="flex mb-6 border-b border-gray-700 overflow-x-auto">
        <button onClick={() => setActiveTab('active')} className={`px-4 sm:px-6 py-3 font-medium whitespace-nowrap transition-colors ${activeTab === 'active' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Active
        </button>
        <button onClick={() => setActiveTab('past')} className={`px-4 sm:px-6 py-3 font-medium whitespace-nowrap transition-colors ${activeTab === 'past' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Past
        </button>
        <button onClick={() => setActiveTab('my')} className={`px-4 sm:px-6 py-3 font-medium whitespace-nowrap transition-colors ${activeTab === 'my' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          My Tournaments
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {activeTab === 'active' && MOCK_ACTIVE_TOURNAMENTS.map(tournament => <div key={tournament.id}>{renderTournamentCard(tournament)}</div>)}
        {activeTab === 'past' && MOCK_PAST_TOURNAMENTS.map(tournament => <div key={tournament.id}>{renderTournamentCard(tournament)}</div>)}
        {activeTab === 'my' && <div className="col-span-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
            <p className="text-gray-400 mb-4">
              You haven't joined any tournaments yet.
            </p>
            <button className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
              Browse Tournaments
            </button>
          </div>}
      </div>
      {showRegistrationModal && selectedTournament && <TournamentRegistrationModal tournament={selectedTournament} onClose={() => setShowRegistrationModal(false)} onRegister={handleRegisterSubmit} />}
    </div>;
};