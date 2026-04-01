import React, { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Textarea } from './ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Separator } from './ui/separator'
import { Button } from './ui/button'
import { useUser, useSession } from "@clerk/clerk-react"
import { createClient } from "@supabase/supabase-js"
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { Heart, MessageCircle, Share2, Trash2 } from "lucide-react"

function PostCard({ 
  id,
  author, 
  content, 
  timestamp,
  imageUrl,
  initialLikesCount = 0
}) {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(initialLikesCount);
    const [isLoading, setIsLoading]  = useState(false);
    const [showCommentBox, setShowCommentBox] = useState(false);
    
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [comments, setComments] = useState([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    
    const [isDeleted, setIsDeleted] = useState(false);

    const { user, isSignedIn } = useUser();
    const { session } = useSession();

    useEffect(() => {
      if (showCommentBox) {
        fetchComments();
      }
    }, [showCommentBox]);

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
      } catch (error) {
        console.error(error);
        toast.error("Failed to load comments.");
      } finally {
        setIsLoadingComments(false);
      }
    };

    const handleLike = async () => {
      if (!isSignedIn) {
        toast.error("Please log in to interact with posts!");
        return;
      }
  
      setIsLoading(true);
  
      try {
        const supabaseToken = await session.getToken({ template: 'supabase' });
        const authenticatedSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
        );
  
        if (isLiked) {
          const { error } = await authenticatedSupabase
            .from('likes')
            .delete()
            .match({ post_id: id, user_id: user.id });
  
          if (error) throw error;
  
          setLikeCount(prev => prev - 1);
          setIsLiked(false);
        } else {
          const { error } = await authenticatedSupabase
            .from('likes')
            .insert([{ post_id: id, user_id: user.id }]);
  
          if (error) {
            if (error.code === '23505') {
               setIsLiked(true); 
               return;
            }
            throw error;
          }
  
          setLikeCount(prev => prev + 1);
          setIsLiked(true);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to update like.");
      } finally {
        setIsLoading(false);
      }
    }

    const handlePostComment = async () => {
      if (!isSignedIn) {
        toast.error("Please log in to comment!");
        return;
      }

      if (!commentText.trim()) return;

      setIsSubmittingComment(true);

      try {
        const supabaseToken = await session.getToken({ template: 'supabase' });
        const authenticatedSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
        );

        const { data: newCommentData, error } = await authenticatedSupabase
          .from('comments')
          .insert([
            { 
              post_id: id, 
              user_id: user.id, 
              author_name: user?.fullName || user?.firstName || "Bennett-Student",
              content: commentText.trim()
            }
          ])
          .select()
          .single();

        if (error) throw error;

        toast.success("Comment posted!");
        setComments(prev => [...prev, newCommentData]);
        setCommentText("");

      } catch (error) {
        console.error(error);
        toast.error("Failed to post comment.");
      } finally {
        setIsSubmittingComment(false);
      }
    }

    const handleShare = async () => {
      const postUrl = `${window.location.origin}`;
      
      try {
        if (navigator.share) {
          await navigator.share({
            title: `Bennett-Social Post by ${author}`,
            text: `Check out this post by ${author} on Bennett-Social!`,
            url: postUrl,
          });
        } else {
          await navigator.clipboard.writeText(postUrl);
          toast.success("Link copied to clipboard!");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
          toast.error("Failed to share post.");
        }
      }
    };

    const handleDelete = async () => {
      if (!window.confirm("Are you sure you want to delete this post?")) return;

      try {
        const supabaseToken = await session.getToken({ template: 'supabase' });
        const authenticatedSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
        );

        const { error } = await authenticatedSupabase
          .from('posts')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success("Post deleted successfully");
        setIsDeleted(true);
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete post");
      }
    };

    if (isDeleted) return null;

  return (
    <Card className="p-5 mb-6 bg-white border border-zinc-200 shadow-sm rounded-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="cursor-pointer">
            <AvatarImage src="" />
            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
              {author?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col cursor-pointer">
            <h3 className="font-semibold text-sm text-zinc-900">{author}</h3>
            <p className="text-xs text-zinc-500">{timestamp}</p>
          </div>
        </div>

        {isSignedIn && (user?.fullName === author || user?.firstName === author) && (
          <Button 
            onClick={handleDelete}
            variant="ghost" 
            size="icon" 
            className="cursor-pointer text-zinc-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {imageUrl && (
        <div className="mb-3 rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 cursor-pointer">
          <img 
            src={imageUrl} 
            alt="Post content" 
            className="w-full h-auto object-cover max-h-[500px]"
            loading="lazy" 
          />
        </div>
      )}

      <div className="mb-4 text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
        <p>{content}</p>
      </div>

      <Separator className="my-2 bg-zinc-100" />

      <div className="flex items-center gap-2 py-1">
        
        <Button
          onClick={handleLike}
          disabled={isLoading}
          variant="ghost" 
          size="sm" 
          className={`cursor-pointer transition-all duration-300 active:scale-90 px-3 ${
            isLiked 
              ? "text-red-500 bg-red-50 hover:text-red-600 hover:bg-red-100" 
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Heart className={`w-4 h-4 mr-2 transition-transform duration-300 ${isLiked ? "fill-current scale-125" : "scale-100"}`} />
          {likeCount > 0 ? likeCount : "Like"}
        </Button>

        <Button 
          onClick={() => setShowCommentBox(!showCommentBox)}
          variant="ghost" 
          size="sm" 
          className="cursor-pointer transition-all duration-200 active:scale-95 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 px-3"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Comment
        </Button>

        <Button 
          onClick={handleShare}
          variant="ghost" 
          size="sm" 
          className="cursor-pointer transition-all duration-200 active:scale-95 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 px-3"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>

      </div>

      {showCommentBox && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <Separator className="mb-4 bg-zinc-100" />
          
          <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto mb-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-200">
            {isLoadingComments ? (
              <p className="text-xs text-zinc-500 text-center py-2">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-2">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-2 items-start">
                  <Avatar className="w-7 h-7 mt-1">
                    <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs font-medium">
                      {comment.author_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col bg-zinc-50 px-3 py-2 rounded-2xl max-w-[85%]">
                    <span className="font-semibold text-zinc-900 text-xs">{comment.author_name}</span>
                    <span className="text-sm text-zinc-800 break-words mt-0.5">{comment.content}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Textarea 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..." 
              className="min-h-[40px] max-h-[120px] text-sm resize-y focus-visible:ring-1 focus-visible:ring-blue-500 bg-zinc-50 border-transparent focus:border-zinc-200 rounded-xl"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handlePostComment}
                disabled={isSubmittingComment || !commentText.trim()}
                size="sm" 
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-full h-8 text-xs font-semibold transition-all active:scale-95"
              >
                {isSubmittingComment ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default PostCard