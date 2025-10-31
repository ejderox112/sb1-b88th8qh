
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { ChatMessage } from '../types';

// SVG icon for the chat bubble
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

// A simple loading indicator
const LoadingIndicator = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
    </div>
);


interface ChatBotProps {
  lineColor: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ lineColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!process.env.API_KEY) {
      console.error("Gemini API key is missing. Chatbot will be disabled.");
      setMessages([{ role: 'model', text: 'Sorry, the chat service is not configured.' }]);
      return;
    }
    // Initialize the Gemini chat instance
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are a helpful assistant integrated into the "Corridor Pathfinder" web application. Keep your responses concise and relevant to a user exploring this virtual space.',
        },
      });
      setMessages([{ role: 'model', text: 'Hello! How can I help you explore the Corridor Pathfinder?' }]);
    } catch (error) {
        console.error("Failed to initialize Gemini:", error);
        setMessages([{ role: 'model', text: 'Sorry, the chat service is currently unavailable.' }]);
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to the latest message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage.text });
      const modelMessage: ChatMessage = { role: 'model', text: response.text };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Gemini API error:', error);
      const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gray-800 border border-gray-600 text-white hover:bg-gray-700 transition-all shadow-lg"
        style={{ borderColor: lineColor }}
        aria-label="Toggle Chatbot"
      >
        <ChatIcon />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
            className="fixed bottom-24 right-6 w-96 h-[32rem] bg-gray-900/80 backdrop-blur-md rounded-lg shadow-2xl flex flex-col z-50 border border-gray-700 overflow-hidden"
            style={{ borderColor: lineColor, animation: 'fade-in 0.3s ease-out' }}
        >
          <header className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0" style={{ borderColor: lineColor }}>
            <h2 className="font-bold text-lg" style={{ color: lineColor }}>Corridor Assistant</h2>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
          </header>

          <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-800/60 text-white' : 'bg-gray-700/60 text-gray-200'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                 <div className="max-w-xs lg:max-w-sm px-4 py-2 rounded-lg bg-gray-700/60 text-gray-200">
                    <LoadingIndicator />
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 shrink-0" style={{ borderColor: lineColor }}>
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                className="w-full p-2 bg-gray-800 rounded border border-gray-600 focus:ring-2 focus:outline-none focus:border-current"
                style={{color: lineColor, '--tw-ring-color': lineColor} as React.CSSProperties}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="p-2 bg-blue-800/70 hover:bg-blue-700 rounded text-white font-bold disabled:opacity-50" 
                disabled={isLoading}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        .animate-bounce { animation: bounce 1s infinite; }
      `}</style>
    </>
  );
};

export default ChatBot;
