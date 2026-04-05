import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser, useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Hash, Loader2, FileText, Download, Plus, X, Trash2, Pencil, Check } from "lucide-react"; 
import { toast } from "sonner";

function ChatRoom() {
  const { slug } = useParams();
  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  
  const [community, setCommunity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const scrollRef = useRef(null);

  // FIXED: Added the missing formatTime function
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchCommunityAndMessages = async () => {
    setIsLoading(true);
    try {
      const { data: commData, error: commError } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .single();

      if (commError) throw commError;

      if (commData) {
        setCommunity(commData);
        if (user) {
          const { data: memberData } = await supabase
            .from('community_members')
            .select('id')
            .eq('community_id', commData.id)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsMember(!!memberData);
        }

        const { data: msgData, error: msgError } = await supabase
          .from('community_messages')
          .select('*')
          .eq('community_id', commData.id)
          .order('created_at', { ascending: true });
        
        if (msgError) throw msgError;
        setMessages(msgData || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load chat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id || !isSignedIn) { fetchCommunityAndMessages(); }
  }, [slug, user?.id, isSignedIn]);

  useEffect(() => {
    let channel;
    const setupSocket = async () => {
      if (!community?.id || !session) return; 
      const supabaseToken = await session.getToken({ template: 'supabase' });
      supabase.realtime.setAuth(supabaseToken);

      channel = supabase.channel(`room-${community.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${community.id}` }, (payload) => {
          setMessages((prev) => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_messages', filter: `community_id=eq.${community.id}` }, (payload) => {
          const deletedId = payload.old?.id || payload.id;
          if (deletedId) setMessages((prev) => prev.filter(m => m.id !== deletedId));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_messages', filter: `community_id=eq.${community.id}` }, (payload) => {
          setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
        })
        .subscribe();
    };
    setupSocket();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [community?.id, session?.id]);

  useEffect(() => {
    if (scrollRef.current && !editingMessageId) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, editingMessageId]);

  const handleJoinCommunity = async () => {
    if (!isSignedIn) return toast.error("Please sign in to join.");
    setIsJoining(true);
    try {
      const token = await session.getToken({ template: 'supabase' });
      const authClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { error } = await authClient.from('community_members').insert([{ community_id: community.id, user_id: user.id }]);
      if (error) throw error;
      setIsMember(true);
      toast.success(`Welcome to ${community.name}!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to join.");
    } finally {
      setIsJoining(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!isSignedIn) return toast.error("Please sign in.");
    if (selectedFile && selectedFile.size > 30 * 1024 * 1024) return toast.error("File exceeds 30MB.");
    if ((!newMessage.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();
    const fileToUpload = selectedFile;
    setNewMessage("");
    setSelectedFile(null);

    try {
      let publicUrl = null, storagePath = null; 
      if (fileToUpload) {
        storagePath = `chat-files/${Math.random()}-${Date.now()}.${fileToUpload.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('post-images').upload(storagePath, fileToUpload);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('post-images').getPublicUrl(storagePath);
        publicUrl = data.publicUrl;
      }

      const token = await session.getToken({ template: 'supabase' });
      const authClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const isImage = fileToUpload?.type.startsWith('image/');
      
      const { data: newMsg, error } = await authClient.from('community_messages').insert([{
        community_id: community.id,
        user_id: user.id,
        author_name: user.fullName || "Student",
        content,
        image_url: isImage ? publicUrl : null,
        file_url: !isImage ? publicUrl : null,
        file_name: storagePath 
      }]).select().single();

      if (error) throw error;
      setMessages((prev) => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId, storagePath) => {
    try {
      const token = await session.getToken({ template: 'supabase' });
      const authClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      if (storagePath) await supabase.storage.from('post-images').remove([storagePath]);
      const { data, error } = await authClient.from('community_messages').delete().eq('id', msgId).eq('user_id', user.id).select(); 
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Permission denied.");
      setMessages((prev) => prev.filter(m => m.id !== msgId));
    } catch (error) {
      console.error(error);
      toast.error("Delete failed.");
    }
  };

  const handleSaveEdit = async (msgId) => {
    if (!editContent.trim()) { setEditingMessageId(null); return; }
    try {
      const token = await session.getToken({ template: 'supabase' });
      const authClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data, error } = await authClient.from('community_messages').update({ content: editContent.trim() }).eq('id', msgId).eq('user_id', user.id).select();
      if (error) throw error;
      setEditingMessageId(null);
      setMessages((prev) => prev.map(m => m.id === msgId ? data[0] : m));
    } catch (error) {
      console.error(error);
      toast.error("Update failed.");
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-[calc(100vh-100px)]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto border-x border-slate-200 bg-white">
      <div className="p-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl border border-blue-100/50">
            <Hash className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 tracking-tight leading-tight">{community?.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Community Chat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/40">
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const isEditing = editingMessageId === msg.id;

          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              <Avatar className="w-8 h-8 mt-1 border border-white shadow-sm flex-shrink-0">
                <AvatarFallback className="text-[10px] bg-slate-200 text-slate-600 font-bold">
                  {msg.author_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[80%] md:max-w-[70%] group`}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[11px] font-black text-slate-900 tracking-tight">{isMe ? "You" : msg.author_name}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{formatTime(msg.created_at)}</span>
                  
                  {isMe && !isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                      <button onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }} className="p-1 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-white transition-colors"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDeleteMessage(msg.id, msg.file_name)} className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                
                <div className={`px-4 py-2.5 rounded-[1.25rem] text-[14px] shadow-sm transition-all border ${
                  isMe ? "bg-slate-900 text-white border-slate-800 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border-slate-100"
                }`}>
                  {msg.image_url && <img src={msg.image_url} alt="Sent" className="mb-2 max-h-72 w-full object-cover rounded-xl cursor-zoom-in" onClick={() => window.open(msg.image_url, '_blank')} />}
                  {msg.file_url && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 border ${isMe ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                        <FileText className="w-5 h-5 text-blue-500" />
                        <p className={`text-[11px] font-bold truncate flex-1 ${isMe ? "text-slate-200" : "text-slate-700"}`}>{msg.file_name?.split('/').pop() || "Attached File"}</p>
                        <a href={msg.file_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors"><Download className="w-4 h-4" /></a>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[220px] py-1">
                      <Input 
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="h-8 text-xs bg-white text-slate-900 rounded-lg border-slate-200"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(msg.id); if (e.key === 'Escape') setEditingMessageId(null); }}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditingMessageId(null)} className="px-2 py-1 text-[9px] font-black uppercase text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={() => handleSaveEdit(msg.id)} className="px-3 py-1 bg-blue-600 text-[9px] font-black uppercase text-white rounded-lg flex items-center gap-1">
                          <Check className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        {isMember ? (
          <form onSubmit={sendMessage} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-200/60 focus-within:border-blue-500/50 focus-within:bg-white transition-all shadow-sm">
            <label className="p-2 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
              <Plus className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setSelectedFile(e.target.files[0])} />
            </label>
            <Input 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              placeholder={`Message #${community?.name || 'chat'}`} 
              className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-slate-400" 
              disabled={isSending || editingMessageId !== null} 
            />
            <Button type="submit" size="icon" disabled={(!newMessage.trim() && !selectedFile) || isSending} className="rounded-full bg-slate-900 hover:bg-blue-600 w-9 h-9 transition-all active:scale-90">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </Button>
          </form>
        ) : (
          <Button onClick={handleJoinCommunity} disabled={isJoining} className="w-full h-12 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200">
            {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Community to Chat"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ChatRoom;