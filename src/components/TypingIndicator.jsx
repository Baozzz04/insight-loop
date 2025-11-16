/**
 * TypingIndicator Component
 * Animated 3-dot typing indicator for chat (messenger style)
 */
const TypingIndicator = () => {
  return (
    <div className="flex gap-1 mt-3">
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
        
        .typing-dot {
          animation: typingBounce 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>
      
      <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
      <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
      <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
    </div>
  );
};

export default TypingIndicator;

