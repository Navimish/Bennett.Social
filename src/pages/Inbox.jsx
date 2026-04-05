import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createClient } from "@supabase/supabase-js"; 
import { useUser, useSession } from "@clerk/clerk-react"; 
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Loader2, MessageSquare, Compass, Send } from "lucide-react";

function Inbox() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { session } = useSession(); 
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInbox = async () => {
    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const { data: messages, error: msgError } = await authSupabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      if (!messages || messages.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const uniqueChats = [];
      const seenUserIds = new Set();

      messages.forEach((msg) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!seenUserIds.has(otherUserId)) {
          seenUserIds.add(otherUserId);
          uniqueChats.push({
            otherUserId,
            latestMessage: msg.content,
            timestamp: msg.created_at,
            isMine: msg.sender_id === user.id 
          });
        }
      });

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', Array.from(seenUserIds));

      if (profileError) throw profileError;

      const combinedData = uniqueChats.map(chat => {
        const profile = profiles.find(p => p.id === chat.otherUserId);
        return { ...chat, profile };
      }).filter(chat => chat.profile); 

      setConversations(combinedData);
    } catch (error) {
      console.error("Inbox fetch failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
      return;
    }
    if (isSignedIn && user?.id && session) {
      fetchInbox();
    }
  }, [isLoaded, isSignedIn, user?.id, session]);

  useEffect(() => {
    if (!isSignedIn || !user?.id || !session) return;
    let channel;
    const setupRealtime = async () => {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      supabase.realtime.setAuth(supabaseToken);
      channel = supabase
        .channel('inbox_realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            fetchInbox();
          }
        })
        .subscribe();
    };
    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user?.id, isSignedIn, session]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Encrypted Chats...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200/60 pt-12 pb-10 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100/50 shadow-sm">
            <MessageSquare className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Messages</h1>
            <p className="text-slate-500 font-medium mt-0.5">Direct connections with your Bennett peers.</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10">
        <div className="flex flex-col gap-4">
          {conversations.length === 0 ? (
            <div className="text-center py-24 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                <Compass className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Inbox is quiet</p>
              <p className="text-slate-500 text-sm mt-1 max-w-[250px] mx-auto leading-relaxed">
                Connect with students through the network to start a conversation.
              </p>
            </div>
          ) : (
            conversations.map((chat) => (
              <Link key={chat.otherUserId} to={`/messages/${chat.profile.username.replace('@', '')}`}>
                <Card className="group p-5 bg-white border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500 rounded-[2rem] flex items-center gap-5 cursor-pointer relative overflow-hidden">
                  {/* Hover indicator accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <Avatar className="w-16 h-16 border-4 border-white shadow-md group-hover:scale-105 transition-transform duration-500">
                    <AvatarImage src={chat.profile.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-black text-xl">
                      {chat.profile.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <h3 className="font-black text-slate-900 truncate pr-4 group-hover:text-blue-600 transition-colors text-lg tracking-tight">
                        {chat.profile.full_name}
                      </h3>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">
                        {formatTime(chat.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-[15px] text-slate-500 truncate flex items-center gap-2 font-medium">
                      {chat.isMine && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600/70">
                          <Send className="w-3 h-3" /> You:
                        </span>
                      )}
                      <span className={!chat.isMine ? "text-slate-700 font-bold" : ""}>
                        {chat.latestMessage}
                      </span>
                    </p>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Inbox;