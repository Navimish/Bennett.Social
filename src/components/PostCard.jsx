import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from './ui/card'
import { Textarea } from './ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { useUser, useSession } from "@clerk/clerk-react"
import { createClient } from "@supabase/supabase-js"
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { 
  Heart, MessageCircle, Share2, Trash2, Send, Loader2, 
  Copy, Mail, MessageSquare 
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function PostCard({ 
  id,
  author, 
  authorUsername, 
  postUserId,     
  content, 
  timestamp,
  imageUrl,
  initialLikesCount = 0
}) {
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const { session } = useSession();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading]  = useState(false);
  // NEW: Add a subtle loading state for the initial check to prevent UI flashing
  const [isCheckingContext, setIsCheckingContext] = useState(true);
  
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [authorProfile, setAuthorProfile] = useState(null);

  // Sharing Logic
  const postUrl = `${window.location.origin}/?postId=${id}`;
  const shareText = `Check out this post by ${authorProfile?.full_name || author} on BennettSocial!`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(postUrl);
    toast.success("Link copied to clipboard!");
  };

  const shareViaWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + " " + postUrl)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const url = `mailto:?subject=BennettSocial Post&body=${encodeURIComponent(shareText + "\n\n" + postUrl)}`;
    window.location.href = url;
  };

  // FAST LOAD: Run queries in parallel to eliminate the 2-second delay
  useEffect(() => {
    const fetchPostContext = async () => {
      try {
        // 1. Prepare Profile Promise
        const profilePromise = supabase
          .from('profiles')
          .select('username, avatar_url, full_name')
          .eq('id', postUserId)
          .single();

        // 2. Prepare Exact Count Promise
        const countPromise = supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', id);

        // 3. Prepare User Like Status Promise
        const likePromise = isSignedIn && user?.id
          ? supabase
              .from('likes')
              .select('id')
              .eq('post_id', id)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

        // EXECUTE ALL AT ONCE (Parallel fetching)
        const [profileRes, countRes, likeRes] = await Promise.all([
          profilePromise,
          countPromise,
          likePromise
        ]);
        
        // Apply results instantly
        if (!profileRes.error && profileRes.data) setAuthorProfile(profileRes.data);
        if (!countRes.error && countRes.count !== null) setLikeCount(countRes.count);
        if (!likeRes.error) setIsLiked(!!likeRes.data);

      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingContext(false); // Stop the initial loading state
      }
    };
    
    fetchPostContext();
  }, [id, postUserId, user?.id, isSignedIn]);

  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't load comments");
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!isSignedIn) return toast.error("Sign in to like posts");
    setIsLoading(true);
    try {
      const token = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      if (isLiked) {
        const { error } = await authSupabase.from('likes').delete().match({ post_id: id, user_id: user.id });
        if (error) throw error;
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        const { error } = await authSupabase.from('likes').insert([{ post_id: id, user_id: user.id }]);
        if (error) throw error;
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        
        if (postUserId !== user.id) {
          await authSupabase.from('user_notifications').insert({
            user_id: postUserId,
            actor_id: user.id,
            actor_name: user.fullName || "A student",
            post_id: id,
            type: 'like'
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const token = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const { data, error } = await authSupabase.from('comments').insert([{ 
        post_id: id, 
        user_id: user.id, 
        author_name: user.fullName || "Bennett Student",
        content: commentText.trim()
      }]).select().single();

      if (error) throw error;
      setComments(prev => [...prev, data]);
      setCommentText("");
      
      if (postUserId !== user.id) {
        await authSupabase.from('user_notifications').insert({
          user_id: postUserId,
          actor_id: user.id,
          actor_name: user.fullName || "A student",
          post_id: id,
          type: 'comment'
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Comment failed");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      const token = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { error } = await authSupabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setIsDeleted(true);
      toast.success("Post deleted");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  if (isDeleted) return null;

  return (
    <Card className="group mb-6 bg-white border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group/author" 
          onClick={() => {
            const target = authorUsername || authorProfile?.username;
            if (target) navigate(`/user/${target.replace('@', '')}`);
          }}
        >
          <Avatar className="w-10 h-10 border border-slate-100 shadow-sm transition-transform group-hover/author:scale-105">
            <AvatarImage src={authorProfile?.avatar_url} />
            <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-xs">
              {author?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover/author:text-blue-600 transition-colors">
              {authorProfile?.full_name || author}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{timestamp}</p>
          </div>
        </div>

        {user?.id === postUserId && (
          <Button onClick={handleDelete} variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Post Text */}
      <div className="px-5 pb-3 text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      {/* Image Gallery Look */}
      {imageUrl && (
        <div className="px-4 pb-2">
          <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
            <img 
              src={imageUrl} 
              alt="Post" 
              className="w-full h-auto object-cover max-h-[500px] transition-transform duration-500 hover:scale-[1.01] cursor-zoom-in"
              onClick={() => window.open(imageUrl, '_blank')}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-2 flex items-center gap-1 sm:gap-2 border-t border-slate-50">
        <Button
          onClick={handleLike}
          disabled={isLoading || isCheckingContext}
          variant="ghost" 
          size="sm" 
          className={`flex-1 rounded-full px-4 h-9 transition-all active:scale-90 ${
            isCheckingContext ? "opacity-50 cursor-not-allowed" : ""
          } ${
            isLiked ? "text-rose-600 bg-rose-50 hover:bg-rose-100" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Heart className={`w-4 h-4 mr-2 transition-colors ${isLiked ? "fill-current text-rose-600" : ""}`} />
          <span className="font-bold text-xs">{likeCount > 0 ? likeCount : "Like"}</span>
        </Button>

        <Button 
          onClick={() => { if(!showCommentBox) fetchComments(); setShowCommentBox(!showCommentBox); }}
          variant="ghost" 
          size="sm" 
          className="flex-1 rounded-full px-4 h-9 text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          <span className="font-bold text-xs">Comment</span>
        </Button>

        {/* --- SHARE DROPDOWN --- */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 rounded-full px-4 h-9 text-slate-500 hover:bg-slate-50 transition-all"
            >
              <Share2 className="w-4 h-4 mr-2" />
              <span className="font-bold text-xs">Share</span>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56 p-2 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            <DropdownMenuItem 
              onClick={copyToClipboard}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-100 focus:bg-slate-100 transition-colors group/item"
            >
              <div className="p-1.5 bg-slate-50 rounded-lg group-hover/item:bg-white transition-colors">
                <Copy className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <span className="text-xs font-bold text-slate-700">Copy Link</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={shareViaWhatsApp}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-green-50 focus:bg-green-50 transition-colors group/item"
            >
              <div className="p-1.5 bg-green-50 rounded-lg group-hover/item:bg-white transition-colors">
                <MessageSquare className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-xs font-bold text-slate-700">WhatsApp</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={shareViaEmail}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-blue-50 focus:bg-blue-50 transition-colors group/item"
            >
              <div className="p-1.5 bg-blue-50 rounded-lg group-hover/item:bg-white transition-colors">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-slate-700">Send via Mail</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Comment Section */}
      {showCommentBox && (
        <div className="bg-slate-50/50 border-t border-slate-100 p-4 sm:p-5 animate-in fade-in slide-in-from-top-1">
          <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4 pr-2 custom-scrollbar">
            {isLoadingComments ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-medium text-center py-2">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0 border border-white shadow-sm">
                    <AvatarFallback className="bg-slate-200 text-slate-600 text-[10px] font-bold">
                      {c.author_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm max-w-[85%]">
                    <span className="font-bold text-slate-900 text-[11px] mb-0.5">{c.author_name}</span>
                    <p className="text-sm text-slate-700 leading-snug">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="relative flex items-center gap-2">
            <Textarea 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..." 
              className="min-h-[44px] max-h-[100px] py-3 pr-12 text-sm bg-white border-slate-200 rounded-2xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 resize-none shadow-sm"
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); }}}
            />
            <Button 
              onClick={handlePostComment}
              disabled={!commentText.trim() || isSubmittingComment}
              size="icon" 
              className="absolute right-1.5 bottom-1.5 h-8 w-8 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all active:scale-90"
            >
              {isSubmittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default PostCard;