export default function ConnectionStatus({ status }) {
  const statusText = {
    'connecting': 'Connecting...',
    'connected': 'Connected',
    'media-error': 'Media Error',
    'disconnected': 'Disconnected'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${
        status === 'connected' ? 'bg-green-500' : 
        status === 'connecting' ? 'bg-yellow-500' : 
        'bg-red-500'
      }`}></div>
      <span className="text-sm">{statusText[status] || status}</span>
    </div>
  );
}