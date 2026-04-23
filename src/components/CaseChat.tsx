import React, { useState } from 'react';
import { Send, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

const initialMessages: Message[] = [
  { id: '1', user: 'Dr. Méndez', text: 'Hola a todos, ¿ya revisaron los laboratorios del paciente?', timestamp: '10:30 AM', isMe: false },
  { id: '2', user: 'Dra. García', text: 'Sí, el pro-BNP está muy elevado. Sugiere falla cardíaca aguda.', timestamp: '10:32 AM', isMe: false },
  { id: '3', user: 'Yo', text: 'Concuerdo. ¿Deberíamos iniciar con el bolo de furosemida?', timestamp: '10:35 AM', isMe: true },
];

export function CaseChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      user: 'Yo',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface rounded-2xl ghost-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-stone-100 dark:border-outline-variant flex items-center gap-2 bg-stone-50 dark:bg-surface-container-low">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-headline font-bold text-sm">Chat del Caso</h3>
        <span className="ml-auto text-[10px] font-label text-stone-400 uppercase tracking-widest font-bold">4 Participantes</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col", msg.isMe ? "items-end" : "items-start")}>
            <div className="flex items-center gap-2 mb-1">
              {!msg.isMe && <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{msg.user}</span>}
              <span className="text-[9px] text-stone-300">{msg.timestamp}</span>
            </div>
            <div className={cn(
              "max-w-[80%] p-3 rounded-2xl text-sm",
              msg.isMe 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-surface-container-high text-on-surface rounded-tl-none"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-stone-100 dark:border-outline-variant bg-stone-50 dark:bg-surface-container-low">
        <div className="relative">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="w-full pl-4 pr-12 py-3 bg-white dark:bg-surface border-none rounded-xl text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
