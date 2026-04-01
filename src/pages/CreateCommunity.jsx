import React, { useState } from 'react'
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUser, useSession } from "@clerk/clerk-react"
import { createClient } from "@supabase/supabase-js"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Users, Info, Hash } from "lucide-react"

function CreateCommunity() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSignedIn) {
      toast.error("Please sign in to create a community");
      return;
    }

    setIsSubmitting(true);
    
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authenticatedSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const { data: newCommunity, error } = await authenticatedSupabase
        .from('communities')
        .insert([{
          name: name.trim(),
          description: description.trim(),
          slug: slug,
          creator_id: user.id
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error("A community with this name already exists!");
        throw error;
      }

      if (newCommunity) {
        await authenticatedSupabase
          .from('community_members')
          .insert([{ community_id: newCommunity.id, user_id: user.id }]);
      }

      toast.success(`${name} has been created!`);
      navigate(`/communities/${slug}`); 
      
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to create community.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pt-10 px-4 pb-20">
      <Card className="p-8 border-zinc-200 shadow-xl rounded-2xl bg-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Start a Community</h1>
            <p className="text-sm text-zinc-500">Create a space for your club, hostel, or interest group.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Hash className="w-4 h-4 text-zinc-400" /> Community Name
            </label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Web Dev Club, Hostel-9, Football" 
              required
              className="rounded-xl border-zinc-200 focus:ring-blue-500"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-zinc-400" /> Description
            </label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What is this community for? Tell other students why they should join." 
              className="min-h-[120px] rounded-xl border-zinc-200 focus:ring-blue-500 resize-none"
              maxLength={200}
            />
            <p className="text-[10px] text-right text-zinc-400">{description.length}/200</p>
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex-1 rounded-xl text-zinc-500 hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button 
              disabled={isSubmitting || !name.trim()} 
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              {isSubmitting ? "Generating Space..." : "Create Community"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default CreateCommunity;