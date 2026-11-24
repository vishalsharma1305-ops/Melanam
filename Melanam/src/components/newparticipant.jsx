export default function ParticipantList({ 
  participants, 
  currentUserId, 
  isCreator,
  activeSpeaker 
}) {
  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="font-semibold text-lg mb-3">Participants ({participants.length})</h3>
      <ul className="space-y-2 max-h-60 overflow-y-auto">
        {participants.map(userId => (
          <li 
            key={userId} 
            className={`flex items-center p-2 rounded-md ${activeSpeaker === userId ? 'bg-blue-500/20' : 'hover:bg-gray-700/50'}`}
          >
            <div className={`w-3 h-3 rounded-full mr-3 ${
              userId === currentUserId ? 'bg-blue-500' : 
              activeSpeaker === userId ? 'bg-green-500 animate-pulse' : 
              'bg-gray-500'
            }`}></div>
            <span className="truncate">
              {userId === currentUserId ? 'You' : `User ${userId.slice(0, 5)}`}
              {userId === currentUserId && isCreator && ' (Host)'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}