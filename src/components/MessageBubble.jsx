import TypingIndicator from './TypingIndicator';

/**
 * MessageBubble Component
 * Displays individual chat messages (tutor or user)
 */
const MessageBubble = ({ message }) => {
  // Check if this is a typing indicator message
  const isTyping = message.text === '...' && message.type === 'tutor';
  
  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          message.type === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {message.type === 'user' && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold opacity-90">You</span>
          </div>
        )}
        {message.type === 'tutor' && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-600">InsightLoop</span>
          </div>
        )}
        
        {/* Show typing indicator or regular text */}
        {isTyping ? (
          <TypingIndicator />
        ) : (
          <p
            className={`text-sm ${
              message.type === 'user' ? 'text-white' : 'text-gray-800'
            } ${message.type === 'tutor' ? 'whitespace-pre-line' : ''}`}
          >
            {message.text}
          </p>
        )}
        
        {message.timestamp && !isTyping && (
          <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;

