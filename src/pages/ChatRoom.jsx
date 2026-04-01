import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser, useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Hash, Loader2, FileText, Download, Plus, X, Paperclip, Trash2, Pencil } from "lucide-react"; 
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

  // EDIT STATE
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const scrollRef = useRef(null);

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

  // 1. FETCH DATA ON LOAD
  useEffect(() => {
    if (user?.id || !isSignedIn) { 
      fetchCommunityAndMessages();
    }
  }, [slug, user?.id, isSignedIn]);

  // 2. AUTHENTICATED REALTIME SUBSCRIPTION
  useEffect(() => {
    let channel;

    const setupSocket = async () => {
      if (!community?.id || !session) return; 

      const supabaseToken = await session.getToken({ template: 'supabase' });
      supabase.realtime.setAuth(supabaseToken);

      channel = supabase
        .channel(`room-${community.id}`)
        // HANDLE NEW MESSAGES
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'community_messages',
          filter: `community_id=eq.${community.id}`
        }, (payload) => {
          setMessages((prev) => {
              const exists = prev.find(m => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
          });
        })
        // HANDLE DELETIONS (Real-time fix)
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'community_messages',
          filter: `community_id=eq.${community.id}`
        }, (payload) => {
          const deletedId = payload.old?.id || payload.id;
          if (deletedId) {
            setMessages((prev) => prev.filter(m => m.id !== deletedId));
          }
        })
        // HANDLE EDITS
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'community_messages',
          filter: `community_id=eq.${community.id}`
        }, (payload) => {
          setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
        })
        .subscribe();
    };

    setupSocket();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [community?.id, session?.id]);

  useEffect(() => {
    if (scrollRef.current && !editingMessageId) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, editingMessageId]);

  const handleJoinCommunity = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to join.");
      return;
    }
    
    setIsJoining(true);
    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const { error } = await authSupabase
        .from('community_members')
        .insert([{ community_id: community.id, user_id: user.id }]);

      if (error) throw error;
      setIsMember(true);
      toast.success(`Welcome to ${community.name}!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to join community.");
    } finally {
      setIsJoining(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!isSignedIn) { toast.error("Please sign in."); return; }
    if (selectedFile && selectedFile.size > 30 * 1024 * 1024) { toast.error("File exceeds 30MB."); return; }
    if ((!newMessage.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    const fileToUpload = selectedFile;
    setNewMessage("");
    setSelectedFile(null);

    try {
      let publicUrl = null;
      let storagePath = null; 
      
      if (fileToUpload) {
        const fileExt = fileToUpload.name.split('.').pop();
        storagePath = `chat-files/${Math.random()}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('post-images').upload(storagePath, fileToUpload);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('post-images').getPublicUrl(storagePath);
        publicUrl = data.publicUrl;
      }

      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const isImage = fileToUpload?.type.startsWith('image/');
      const { error } = await authSupabase.from('community_messages').insert([{
        community_id: community.id,
        user_id: user.id,
        author_name: user.fullName || user.firstName || "Student",
        content: messageContent,
        image_url: isImage ? publicUrl : null,
        file_url: !isImage ? publicUrl : null,
        file_name: storagePath 
      }]);

      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId, storagePath) => {
    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      if (storagePath) {
        await supabase.storage.from('post-images').remove([storagePath]);
      }

      // SELECT() verifies that RLS allowed the deletion
      const { data, error } = await authSupabase
        .from('community_messages')
        .delete()
        .eq('id', msgId)
        .eq('user_id', user.id)
        .select(); 

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Permission denied.");

      toast.success("Message deleted");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Delete failed.");
    }
  };

  const handleSaveEdit = async (msgId) => {
    if (!editContent.trim()) { setEditingMessageId(null); return; }

    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const { data, error } = await authSupabase
        .from('community_messages')
        .update({ content: editContent.trim() })
        .eq('id', msgId)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Permission denied.");
      
      setEditingMessageId(null);
      toast.success("Message updated");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Update failed.");
    }
  };

  const startEditing = (msg) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content || "");
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto border-x border-zinc-200 bg-white">
      <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Hash className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-zinc-900">{community?.name}</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Official Chat</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-200 bg-zinc-50/30">
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const displayFileName = msg.file_name?.includes('/') ? msg.file_name.split('/').pop() : msg.file_name;
          const isEditing = editingMessageId === msg.id;

          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
              <Avatar className="w-8 h-8 mt-1">
                <AvatarFallback className="text-[10px] bg-zinc-100 text-zinc-600">
                  {msg.author_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%] group`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-zinc-700">{msg.author_name}</span>
                  <span className="text-[10px] text-zinc-400">{formatTime(msg.created_at)}</span>
                  
                  {isMe && !isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button onClick={() => startEditing(msg)} className="p-1 text-zinc-400 hover:text-blue-500 rounded-full hover:bg-zinc-100"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDeleteMessage(msg.id, msg.file_name)} className="p-1 text-zinc-400 hover:text-red-500 rounded-full hover:bg-zinc-100"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                
                <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${
                  isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-zinc-800 rounded-tl-none border border-zinc-200"
                }`}>
                  {msg.image_url && <img src={msg.image_url} alt="Sent" className="mb-2 max-h-72 w-full object-cover rounded-lg cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />}
                  {msg.file_url && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 border ${isMe ? "bg-blue-700 border-blue-500" : "bg-zinc-50 border-zinc-200"}`}>
                        <FileText className={`w-5 h-5 ${isMe ? "text-white" : "text-blue-600"}`} />
                        <p className={`text-xs font-medium truncate flex-1 ${isMe ? "text-white" : "text-zinc-900"}`}>{displayFileName}</p>
                        <a href={msg.file_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-blue-500"><Download className="w-4 h-4" /></a>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex flex-col gap-2 mt-1 min-w-[200px]">
                      <Input 
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="h-8 text-xs text-zinc-900 bg-white"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(msg.id); if (e.key === 'Escape') setEditingMessageId(null); }}
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)} className="h-6 text-[10px]">Cancel</Button>
                        <Button size="sm" onClick={() => handleSaveEdit(msg.id)} className="h-6 text-[10px] bg-white text-blue-600">Save</Button>
                      </div>
                    </div>
                  ) : (
                    msg.content && <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t">
        {isMember ? (
          <form onSubmit={sendMessage} className="flex gap-2 items-center bg-zinc-100 p-1.5 rounded-full border">
            <label className="p-2 text-zinc-500 hover:text-blue-600 cursor-pointer">
              <Plus className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setSelectedFile(e.target.files[0])} />
            </label>
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm" disabled={isSending || editingMessageId !== null} />
            <Button type="submit" size="icon" disabled={(!newMessage.trim() && !selectedFile) || isSending} className="rounded-full bg-blue-600 w-9 h-9">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </Button>
          </form>
        ) : (
          <Button onClick={handleJoinCommunity} disabled={isJoining} className="w-full bg-blue-600 rounded-full">Join Community</Button>
        )}
      </div>
    </div>
  );
}

export default ChatRoom;