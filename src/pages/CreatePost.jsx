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

function CreatePost() {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null); 
  const [isSubmitting, setIssubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const { session } = useSession(); 

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() || !isSignedIn) return

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
        console.log("File object:", imageFile);
        console.log("File size:", imageFile?.size);

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
          console.error("STORAGE ERROR:", uploadError);
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
        ])

      if (dbError) {
        console.error("DATABASE ERROR:", dbError);
        throw new Error(`Database: ${dbError.message}`);
      }

      setContent('')
      setImageFile(null) 
      toast.success('Post created successfully!')
      navigate('/')

    } catch (error) {
      console.error("DETAILED ERROR LOG:", error);
      toast.error(error.message || 'Failed to create post. Please try again.');
    } finally {
      setIssubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto w-full pt-12 px-4">
      <Card className="p-6 bg-white border border-zinc-200 shadow-sm rounded-xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-900">Create Post</h2>
          <p className="text-sm text-zinc-500">Share what's happening at Bennett University</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[120px] text-sm resize-y focus-visible:ring-1 focus-visible:ring-blue-500 border-zinc-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Upload Image (Optional)</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])} 
              className="text-sm focus-visible:ring-1 focus-visible:ring-blue-500 border-zinc-200 cursor-pointer file:cursor-pointer file:border-0 file:bg-zinc-100 file:text-zinc-700 file:px-2 file:rounded-md file:mr-2"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isSignedIn}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-8 font-semibold transition-all active:scale-95"
            >
              {isSubmitting ? "Uploading..." : "Post to Feed"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default CreatePost;