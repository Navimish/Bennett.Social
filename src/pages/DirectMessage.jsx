import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser, useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, ArrowLeft, Trash2, Pencil, X, Check, ChevronDown } from "lucide-react"; 
import { toast } from "sonner";

function DirectMessage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  
  const [targetUser, setTargetUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // EDITING STATE
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  // SCROLL STATES
  const scrollRef = useRef(null);
  const feedRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const getAuthClient = async () => {
    const supabaseToken = await session.getToken({ template: 'supabase' });
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
    );
  };

  useEffect(() => {
    const fetchChatData = async () => {
      if (!user?.id || !isSignedIn || !session) return;
      setIsLoading(true);

      try {
        const rawUsername = username.replace('@', '');
        const withAt = `@${rawUsername}`;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.eq.${rawUsername},username.eq.${withAt}`)
          .single();

        if (!profileData) {
          toast.error("User not found!");
          navigate('/network');
          return;
        }

        setTargetUser(profileData);

        const authSupabase = await getAuthClient();
        const { data: msgData } = await authSupabase
          .from('direct_messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profileData.id}),and(sender_id.eq.${profileData.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        setMessages(msgData || []);

        // Initial instant jump to bottom
        setTimeout(() => scrollToBottom("auto"), 100);

        await authSupabase
          .from('direct_messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', profileData.id)
          .eq('is_read', false);

      } catch (error) {
        console.error(error);
        toast.error("Failed to load chat.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatData();
  }, [username, user?.id, isSignedIn, session]);

  useEffect(() => {
    let channel;
    const setupSocket = async () => {
      if (!targetUser?.id || !session || !user?.id) return; 

      const supabaseToken = await session.getToken({ template: 'supabase' });
      supabase.realtime.setAuth(supabaseToken);

      channel = supabase
        .channel(`dm-room-${targetUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            if ((newMsg.sender_id === user.id && newMsg.receiver_id === targetUser.id) ||
                (newMsg.sender_id === targetUser.id && newMsg.receiver_id === user.id)) {
              setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
              // Auto-scroll on new message if we are already at the bottom
              if (!showScrollButton) scrollToBottom("smooth");
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        })
        .subscribe();
    };

    setupSocket();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [targetUser?.id, session, user?.id, showScrollButton]);

  // SMART SCROLL LOGIC
  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    // Show button if user scrolls up more than 150px from the bottom
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(isScrolledUp);
  };

  const scrollToBottom = (behavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior });
    }
  };

  // Keep focus at bottom when sending a new message
  useEffect(() => {
    if (!editingId && !showScrollButton) {
      scrollToBottom("smooth");
    }
  }, [messages.length]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    try {
      const authSupabase = await getAuthClient();
      const { data } = await authSupabase.from('direct_messages').insert([{
        sender_id: user.id,
        receiver_id: targetUser.id,
        content,
        is_read: false
      }]).select().single();
      
      setMessages(prev => [...prev, data]);
      scrollToBottom("smooth"); // Always scroll down when you send a message
    } catch (error) {
      console.error(error);
      toast.error("Failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (id) => {
    try {
      const authSupabase = await getAuthClient();
      const { error } = await authSupabase.from('direct_messages').delete().eq('id', id).eq('sender_id', user.id);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success("Message deleted");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const saveEdit = async (id) => {
    if (!editContent.trim()) { setEditingId(null); return; }
    try {
      const authSupabase = await getAuthClient();
      const { data, error } = await authSupabase.from('direct_messages')
        .update({ content: editContent.trim() })
        .eq('id', id)
        .eq('sender_id', user.id)
        .select().single();
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === id ? data : m));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#f8fafc]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto bg-white border-x border-slate-200 shadow-sm overflow-hidden relative">
      
      {/* Dynamic Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-full hover:bg-slate-50 text-slate-500 active:scale-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${targetUser?.username?.replace('@', '')}`)}>
            <div className="relative">
              <Avatar className="w-10 h-10 border border-slate-100 shadow-sm transition-transform active:scale-95">
                <AvatarImage src={targetUser?.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                  {targetUser?.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
            </div>
            
            <div className="flex flex-col min-w-0">
              <h1 className="font-bold text-slate-900 leading-tight truncate max-w-[150px] sm:max-w-xs">{targetUser?.full_name}</h1>
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{targetUser?.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Feed Area */}
      <div 
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#fcfdfe]"
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"} group`}>
                
                {/* Micro-actions for my messages */}
                {isMe && !isEditing && (
                  <div className="flex gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-all scale-90 origin-bottom-right">
                    <button 
                      onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} 
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => deleteMessage(msg.id)} 
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className={`px-4 py-2.5 rounded-[1.25rem] shadow-sm text-[15px] border transition-all ${
                  isMe 
                    ? "bg-slate-900 text-white border-slate-800 rounded-tr-none" 
                    : "bg-white border-slate-100 text-slate-800 rounded-tl-none shadow-slate-200/50"
                }`}>
                  {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[200px] sm:min-w-[280px] py-1">
                      <Input 
                        value={editContent} 
                        onChange={(e) => setEditContent(e.target.value)} 
                        className="bg-white/10 text-white placeholder:text-slate-400 h-9 text-sm border-none focus-visible:ring-1 focus-visible:ring-white/50"
                        autoFocus
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') saveEdit(msg.id); 
                          if (e.key === 'Escape') setEditingId(null); 
                        }}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 text-[10px] font-black uppercase text-slate-300 hover:text-white transition-colors">Cancel</button>
                        <button onClick={() => saveEdit(msg.id)} className="px-3 py-1 bg-white text-slate-900 text-[10px] font-black uppercase rounded-lg shadow-sm active:scale-95 transition-all">Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
                
                <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isMe ? "flex-row" : "flex-row-reverse"}`}>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{formatTime(msg.created_at)}</p>
                   {isMe && msg.is_read && <Check className="w-3 h-3 text-blue-500" />}
                </div>
              </div>
            </div>
          );
        })}
        {/* Invisible div to track the bottom of the feed */}
        <div ref={scrollRef} className="h-1" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollButton && (
        <div className="absolute bottom-[90px] right-6 z-20 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Button 
            size="icon" 
            onClick={() => scrollToBottom("smooth")}
            className="rounded-full w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Input Bar Section */}
      <div className="p-4 sm:p-5 bg-white border-t border-slate-100 relative z-30">
        <form onSubmit={sendMessage} className="flex gap-3 items-center bg-slate-50 p-1.5 pl-4 rounded-[1.75rem] border border-slate-200/60 focus-within:border-blue-500/50 focus-within:bg-white transition-all shadow-sm">
          <Input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Type your message..." 
            className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none text-[15px] placeholder:text-slate-400 py-2 h-auto"
            disabled={isSending || editingId !== null}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim() || isSending} 
            className="rounded-full bg-slate-900 hover:bg-blue-600 text-white w-10 h-10 shadow-lg shadow-slate-200 transition-all active:scale-90 flex-shrink-0"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default DirectMessage;