import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { sendMessageToGemini, isGeminiAvailable } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  activeComponent?: string | null;
}

export function AIChat({ activeComponent = null }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI racing analyst powered by Gemini. I can help you analyze telemetry data, understand vehicle performance, and provide insights about the race. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check API key availability on mount and when chat opens
    const checkApiKey = () => {
      const available = isGeminiAvailable();
      setGeminiAvailable(available);
      
      // Debug logging
      if (!available) {
        console.warn('⚠️ Gemini API key not detected');
        console.log('Environment check:', {
          hasEnv: !!import.meta.env.VITE_GEMINI_API_KEY,
          envLength: import.meta.env.VITE_GEMINI_API_KEY?.length || 0,
          envPreview: import.meta.env.VITE_GEMINI_API_KEY?.substring(0, 10) + '...' || 'not set'
        });
      } else {
        console.log('✅ Gemini API key detected');
      }
    };
    
    checkApiKey();
    
    // Re-check when chat opens (in case env was updated)
    if (isOpen) {
      checkApiKey();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !geminiAvailable) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let assistantResponse = '';
      
      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      // Stream response with page context
      await sendMessageToGemini(userMessage.content, (chunk) => {
        assistantResponse += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantResponse }
              : msg
          )
        );
      }, activeComponent);
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorContent = `Sorry, I encountered an error: ${error.message || 'Unknown error'}.`;
      
      // Provide more specific error messages
      if (error.message?.includes('API key') || error.message?.includes('not initialized')) {
        errorContent = `❌ API Key Issue: ${error.message}\n\nPlease:\n1. Create a .env file in the race-frontend directory\n2. Add: VITE_GEMINI_API_KEY=your_api_key_here\n3. Restart the dev server (npm run dev)`;
      } else if (error.message?.includes('model')) {
        errorContent = `❌ Model Error: ${error.message}\n\nThe model might not be available. Please check your API key has access to gemini-2.5-flash.`;
      } else {
        errorContent = `❌ Error: ${error.message || 'Unknown error'}\n\nPlease check:\n1. Your API key is correct\n2. You have internet connection\n3. The Gemini API service is available`;
      }
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50
          w-16 h-16 rounded-full
          bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700
          shadow-2xl shadow-blue-500/50
          flex items-center justify-center
          transition-all duration-300
          hover:scale-110 hover:shadow-blue-400/70
          active:scale-95
          ${isOpen ? 'rotate-90' : ''}
        `}
        aria-label="Open AI Chat"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <MessageCircle className="w-7 h-7 text-white" />
            <Sparkles className="absolute w-4 h-4 text-yellow-300 top-1 right-1 animate-pulse" />
          </>
        )}
        {!geminiAvailable && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] flex flex-col bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <h3 className="text-white font-semibold text-lg">AI Racing Analyst</h3>
            </div>
            {!geminiAvailable && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">API Key Missing</span>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg px-4 py-2
                    ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-100 border border-gray-700'
                    }
                  `}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-100 rounded-lg px-4 py-2 border border-gray-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-700 p-4 bg-gray-800">
            {!geminiAvailable && (
              <div className="mb-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-200 space-y-1">
                <div className="font-semibold">⚠️ API Key Not Detected</div>
                <div className="text-yellow-300">
                  Please ensure:
                  <ol className="list-decimal list-inside ml-2 mt-1 space-y-0.5">
                    <li>VITE_GEMINI_API_KEY is set in .env file</li>
                    <li>Dev server has been restarted after adding the key</li>
                    <li>Check browser console (F12) for details</li>
                  </ol>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={geminiAvailable ? "Ask about telemetry, performance, or race insights..." : "API key required..."}
                disabled={!geminiAvailable || isLoading}
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !geminiAvailable}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

