import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Cpu } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const ChatbotPanel = () => {
  const [messages, setMessages] = useState([
    { text: "System Online. PulseGuard AI ready to assist. Please describe your symptoms.", sender: "bot" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, { message: userMsg });
      setMessages(prev => [...prev, { text: response.data.reply, sender: 'bot' }]);
    } catch {
      setMessages(prev => [...prev, { text: "Connection error. Unable to reach AI core.", sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-panel neon-border flex flex-col h-[600px] w-full max-w-4xl mx-auto overflow-hidden"
      id="chatbot-section"
    >
      <div className="bg-[var(--color-dark-surface)] p-4 border-b border-white/10 flex items-center gap-3">
        <Cpu className="text-[var(--color-neon-blue)]" />
        <h2 className="text-xl font-bold tracking-wide">PulseGuard AI Terminal</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={idx} 
            className={`flex items-start gap-3 max-w-[80%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
          >
            <div className={`p-2 rounded-full flex-shrink-0 ${msg.sender === 'user' ? 'bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)]' : 'bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)]'}`}>
              {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className={`p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-[var(--color-neon-purple)]/10 border border-[var(--color-neon-purple)]/30' : 'bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30'} backdrop-blur-sm`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start flex gap-2 p-4">
            <span className="w-2 h-2 bg-[var(--color-neon-blue)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-[var(--color-neon-blue)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-[var(--color-neon-blue)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </motion.div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-[var(--color-dark-surface)]">
        <div className="flex gap-2 relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Initialize query... (e.g. Fever and joint pain)"
            disabled={loading}
            className="flex-1 bg-black/50 border border-white/20 rounded-full px-6 py-4 outline-none focus:border-[var(--color-neon-blue)] transition-colors text-white placeholder-gray-500"
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 bg-[var(--color-neon-blue)] text-black rounded-full px-6 flex items-center justify-center font-bold hover:bg-white transition-colors disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatbotPanel;
