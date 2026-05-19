import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  case_id: number;
  user_id: string | null;
  message: string;
  created_at: string;
  user_name?: string | null;
  attachments?: Array<{ id: number; file_name: string; file_url: string; file_type?: string; size?: number }>;
}

export function CaseChat({ caseId }: { caseId: number | string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [pageSize] = useState<number>(30);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const topObserverRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [attachmentsFiles, setAttachmentsFiles] = useState<File[]>([]);
  const [participants, setParticipants] = useState<Array<{ id: string; full_name?: string | null; avatar_url?: string | null }>>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; user_name?: string; last_typing_at: string }>>([]);

  // Normalize caseId to a number when possible. Many projects use numeric case ids,
  // and Supabase realtime filters and .eq comparisons are sensitive to type.
  const numericCaseId = typeof caseId === 'string' && /^\d+$/.test(caseId) ? Number(caseId) : caseId;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = (data as any)?.user ?? (data as any);
      setUserId(user?.id ?? null);
    })();

    let mounted = true;
    // initial load: fetch most recent pageSize messages (descending), then reverse to show oldest->newest
  async function loadRecent() {
      try {
        // try join with related profiles and attachments using explicit aliases
        const { data, error } = await (supabase.from as any)('chat_messages')
          .select('id, case_id, user_id, message, created_at, profiles:profiles(id, full_name, avatar_url), message_attachments:message_attachments(id, file_name, file_url, file_type, size)')
          .eq('case_id', numericCaseId as any)
          .order('created_at', { ascending: false })
          .limit(pageSize as any);

        if (error) {
          console.warn('primary load (joined) failed, falling back:', error.message || error);
        }

        let rows = (data || []) as any[];

        // fallback: try a simple select if joined select failed or returned empty
        if ((!rows || rows.length === 0) && (!data || error)) {
          const { data: fallback, error: fallbackErr } = await (supabase.from as any)('chat_messages')
            .select('id, case_id, user_id, message, created_at')
            .eq('case_id', numericCaseId as any)
            .order('created_at', { ascending: false })
            .limit(pageSize as any);
          if (fallbackErr) throw fallbackErr;
          rows = (fallback || []) as any[];
        }

        if (!mounted) return;
        const normalized = rows.map((d: any) => ({
          id: String(d.id),
          case_id: d.case_id,
          user_id: d.user_id,
          message: d.message,
          created_at: d.created_at,
          user_name: d.profiles?.full_name ?? null,
          attachments: (d.message_attachments || []).map((a: any) => ({ id: a.id, file_name: a.file_name, file_url: a.file_url, file_type: a.file_type, size: a.size })),
        })).reverse();

        setMessages(normalized);
        setHasMore(rows.length === pageSize);

        // build participants list from distinct user_ids and then fetch profiles in one query
        try {
          const ids = Array.from(new Set(normalized.map(m => m.user_id).filter(Boolean)));
          if (ids.length > 0) {
            const { data: profs } = await (supabase.from as any)('profiles').select('id, full_name, email, username, avatar_url').in('id', ids).limit(200);
            const profsArr = (profs || []) as any[];
            setParticipants(profsArr);
            // update any messages that lack user_name using fetched profiles
            const byId: Record<string, any> = {};
            profsArr.forEach(p => { byId[p.id] = p; });
            setMessages((prev) => prev.map(m => {
              if (!m.user_id || m.user_name) return m;
              const p = byId[m.user_id];
              if (!p) return m;
              const name = [p.full_name, p.username, p.email?.split('@')[0]].filter(Boolean).find(Boolean) ?? null;
              return { ...m, user_name: name };
            }));
          } else {
            setParticipants([]);
          }
        } catch (err) {
          console.warn('participants fetch failed', err);
        }
      } catch (err) {
        console.warn('load chat error', err);
      }
    }
    loadRecent();

        const subscription = supabase.channel(`public:chat_messages:${numericCaseId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `case_id=eq.${numericCaseId}` }, (payload) => {
        const d: any = payload.new;
        // Realtime payloads don't include JOIN data, so user_name starts null
        const normalized = { id: String(d.id), case_id: d.case_id, user_id: d.user_id, message: d.message, created_at: d.created_at, user_name: null as string | null, attachments: [] };
        setMessages((m) => [...m, normalized]);
        // Resolve the sender's name: check participants cache first, then fetch
        if (d.user_id) {
          (async () => {
            try {
              const { data: prof } = await (supabase.from as any)('profiles')
                .select('id, full_name, email, username, avatar_url')
                .eq('id', d.user_id)
                .limit(1)
                .single();
              if (prof) {
                const name = [prof.full_name, prof.username, prof.email?.split('@')[0]]
                  .filter(Boolean)
                  .find((s: string) => s?.trim()) ?? null;
                // Update the message with the resolved name
                setMessages((prev) => prev.map((m) =>
                  m.id === String(d.id) ? { ...m, user_name: name } : m
                ));
                // Update participants cache
                setParticipants((prev) => {
                  if (prev.find(p => p.id === prof.id)) return prev;
                  return [...prev, prof];
                });
              }
            } catch (e) { /* ignore */ }
          })();
        }
      })
      .subscribe();

    // subscribe to typing state
    const typingChannel = supabase.channel(`public:chat_typing:${numericCaseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_typing', filter: `case_id=eq.${numericCaseId}` }, (payload: any) => {
        const d: any = payload.new ?? payload.old;
        if (!d) return;
        const ev = (payload && (payload.event || payload.type)) || 'INSERT';
        setTypingUsers((prev) => {
          const copy = prev.filter(t => t.user_id !== d.user_id);
          if (ev !== 'DELETE') copy.push({ user_id: d.user_id, user_name: undefined, last_typing_at: d.last_typing_at });
          return copy;
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      try { supabase.removeChannel(subscription); supabase.removeChannel(typingChannel); } catch (e) { /* ignore */ }
    };
  }, [caseId]);


  const uploadFileToStorage = async (file: File) => {
    const bucket = import.meta.env.VITE_CHAT_FILES_BUCKET || 'message-attachments';
  const path = `${numericCaseId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData?.publicUrl ?? null;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachmentsFiles.length === 0) return;
    try {
  const payload: any = { case_id: numericCaseId, user_id: userId, message: inputText || null };
      const { data: insertData, error: insertErr } = await (supabase.from as any)('chat_messages').insert(payload).select().single();
      if (insertErr) throw insertErr;
      const inserted: any = insertData;
      const messageId = inserted.id;
      // upload attachments and insert into message_attachments
      const attached: any[] = [];
      for (const file of attachmentsFiles) {
        try {
          const publicUrl = await uploadFileToStorage(file);
          const { error: attachErr } = await (supabase.from as any)('message_attachments').insert({ message_id: messageId, uploaded_by: userId, file_name: file.name, file_url: publicUrl, file_type: file.type, size: file.size });
          if (attachErr) console.warn('attachment insert failed', attachErr);
          else attached.push({ file_name: file.name, file_url: publicUrl, file_type: file.type, size: file.size });
        } catch (err) {
          console.warn('upload attachment error', err);
        }
      }
      setInputText('');
      setAttachmentsFiles([]);
      // append message locally (realtime will also add it)
  const newMsg = { id: String(messageId), case_id: (typeof numericCaseId === 'number' ? numericCaseId : Number(numericCaseId)), user_id: userId, message: inputText, created_at: new Date().toISOString(), user_name: undefined, attachments: attached };
      setMessages(prev => [...prev, newMsg]);
      if (userId) {
        (async () => {
          try {
            const { data: prof } = await (supabase.from as any)('profiles').select('id, full_name, avatar_url').eq('id', userId).limit(1).single();
            if (prof) setParticipants(prev => prev.find(p => p.id === prof.id) ? prev : [...prev, prof]);
          } catch (e) { /* ignore */ }
        })();
      }
    } catch (err) {
      console.warn('send chat error', err);
      alert('Error enviando mensaje');
    }
  };

  // typing indicator: upsert last_typing_at
  const typingTimeout = useRef<number | null>(null);
  const sendTyping = useCallback(async () => {
    if (!userId) return;
    try {
      await (supabase.from as any)('chat_typing').upsert({ case_id: numericCaseId, user_id: userId, last_typing_at: new Date().toISOString() });
    } catch (err) { /* ignore */ }
  }, [numericCaseId, userId]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl ghost-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-surface-container-low flex items-center gap-2 bg-surface-container-low">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-headline font-bold text-sm">Chat del Caso</h3>
        <span className="ml-auto text-[10px] font-label text-stone-400 uppercase tracking-widest font-bold">{messages.length} mensajes</span>
      </div>

      <div className="p-4 border-b border-surface-container-low flex items-center gap-2 bg-surface-container-low">
        <div className="flex -space-x-2">
          {participants.slice(0,5).map(p => (
            <img key={p.id} src={p.avatar_url || `/api/avatar/${p.id}`} className="w-7 h-7 rounded-full border-2 border-white" alt={p.full_name ?? 'U'} />
          ))}
        </div>
        <div className="ml-3 text-sm text-stone-600">Participantes: {participants.length}</div>
        <div className="ml-auto text-[10px] font-label text-stone-400 uppercase tracking-widest font-bold">{messages.length} mensajes</div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4" onScroll={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        if (el.scrollTop === 0 && hasMore && !isLoadingMore) {
          // load older
          (async () => {
            setIsLoadingMore(true);
            try {
              const oldest = messages[0];
              const before = oldest?.created_at;
              const { data } = await (supabase.from as any)('chat_messages')
                .select('id, case_id, user_id, message, created_at, profiles:profiles(id, full_name, avatar_url), message_attachments:message_attachments(id, file_name, file_url, file_type, size)')
                .eq('case_id', caseId)
                .lt('created_at', before)
                .order('created_at', { ascending: false })
                .limit(pageSize as any);
              const rows = (data || []) as any[];
              const normalized = rows.map((d: any) => ({ id: String(d.id), case_id: d.case_id, user_id: d.user_id, message: d.message, created_at: d.created_at, user_name: d.profiles?.full_name ?? null, attachments: (d.message_attachments || []).map((a: any) => ({ id: a.id, file_name: a.file_name, file_url: a.file_url, file_type: a.file_type, size: a.size })) })).reverse();
              setMessages(prev => [...normalized, ...prev]);
              setHasMore(rows.length === pageSize);
              // fetch profiles for newly loaded messages to populate user_name and participants
              try {
                const ids = Array.from(new Set(normalized.map(m => m.user_id).filter(Boolean)));
                if (ids.length > 0) {
                  const { data: profs } = await (supabase.from as any)('profiles').select('id, full_name, email, username, avatar_url').in('id', ids).limit(200);
                  const profsArr = (profs || []) as any[];
                  setParticipants(prev => {
                    const map: Record<string, any> = {};
                    prev.forEach(p => { map[p.id] = p; });
                    profsArr.forEach(p => { map[p.id] = p; });
                    return Object.values(map);
                  });
                  const byId: Record<string, any> = {};
                  profsArr.forEach(p => { byId[p.id] = p; });
                  setMessages(prev => prev.map(m => {
                    if (!m.user_id || m.user_name) return m;
                    const p = byId[m.user_id];
                    if (!p) return m;
                    const name = [p.full_name, p.username, p.email?.split('@')[0]].filter(Boolean).find(Boolean) ?? null;
                    return { ...m, user_name: name };
                  }));
                }
              } catch (err) { console.warn('load older participants fetch failed', err); }
            } catch (err) { console.warn('load older error', err); }
            setIsLoadingMore(false);
          })();
        }
      }}>
        {messages.map((msg) => {
          const isOwn = msg.user_id === userId;
          // Resolve display name: prefer user_name from message, then participants cache, then fallback
          const cachedProfile = participants.find(p => p.id === msg.user_id);
          const displayName = msg.user_name
            ?? (cachedProfile as any)?.full_name
            ?? (cachedProfile as any)?.username
            ?? (cachedProfile as any)?.email?.split('@')[0]
            ?? (msg.user_id ? `Usuario (${msg.user_id.substring(0, 6)})` : 'Anónimo');

          return (
          <div key={msg.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-[11px] font-bold tracking-wide",
                isOwn ? "text-primary" : "text-stone-500"
              )}>
                {isOwn ? 'Tú' : displayName}
              </span>
              <span className="text-[9px] text-stone-300">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={cn(
              "max-w-[80%] p-3 rounded-2xl text-sm",
              isOwn
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-surface-container-high text-on-surface rounded-tl-none"
            )}>
              {msg.message}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.attachments.map(a => (
                    <div key={a.id} className="text-xs text-stone-500">
                      <a href={a.file_url} target="_blank" rel="noreferrer" className="underline text-primary">{a.file_name}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-surface-container-low bg-surface-container-low space-y-2">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => { setInputText(e.target.value); if (typingTimeout.current) window.clearTimeout(typingTimeout.current); sendTyping(); typingTimeout.current = window.setTimeout(() => { /* allow typing to expire server-side */ }, 6000); }}
            placeholder="Escribe un mensaje..."
            className="flex-1 pl-4 pr-12 py-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none"
          />
          <input type="file" multiple onChange={(e) => { const f = e.target.files; if (f) setAttachmentsFiles(prev => [...prev, ...Array.from(f)]); e.currentTarget.value = ''; }} />
          <button 
            type="submit"
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {attachmentsFiles.length > 0 && (
          <div className="text-xs text-stone-500">
            Archivos adjuntos: {attachmentsFiles.map(f => f.name).join(', ')}
          </div>
        )}
        {typingUsers.length > 0 && (
          <div className="text-xs text-stone-400">{typingUsers.map(t => participants.find(p=>p.id===t.user_id)?.full_name ?? 'Alguien').join(', ')} está escribiendo...</div>
        )}
      </form>
    </div>
  );
}
