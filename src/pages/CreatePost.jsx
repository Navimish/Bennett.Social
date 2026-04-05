import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Image as ImageIcon, X, Loader2, Send } from "lucide-react";

function CreatePost() {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIssubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const { session } = useSession();

  // Handle file selection and local preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !isSignedIn) return;

    setIssubmitting(true);

    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authenticatedSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      let publicUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type
          });

        if (uploadError) {
          console.error(uploadError);
          throw new Error(`Storage: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        publicUrl = data.publicUrl;
      }

      const { error: dbError } = await authenticatedSupabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            author: user?.fullName || user?.firstName || "Bennett-Student",
            content: content,
            image_url: publicUrl 
          }
        ]);

      if (dbError) {
        console.error(dbError);
        throw new Error(`Database: ${dbError.message}`);
      }

      setContent('');
      setImageFile(null);
      toast.success('Post shared to feed!');
      navigate('/');

    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create post.');
    } finally {
      setIssubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-12 pb-20 px-4">
      <Card className="max-w-2xl mx-auto bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden">
        
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 w-full" />
        
        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Post</h2>
            <p className="text-slate-500 font-medium">Share updates, questions, or campus moments.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening at Bennett?"
                className="min-h-[160px] text-base bg-slate-50/50 border-slate-200 rounded-2xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all resize-none p-4"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Media</label>
              
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Click to upload an image</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 group">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-[300px] object-cover" />
                  <button 
                    type="button"
                    onClick={clearImage}
                    className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || !isSignedIn || !content.trim()}
                className="h-12 px-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Post to Feed</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default CreatePost;