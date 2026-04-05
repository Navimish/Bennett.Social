import React, { useState } from 'react'
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUser, useSession } from "@clerk/clerk-react"
import { createClient } from "@supabase/supabase-js"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Users, Info, Hash, Loader2, Globe, ArrowLeft } from "lucide-react"

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
      console.error(error); // Keep VS Code happy
      toast.error(error.message || "Failed to create community.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-12 pb-20 px-4">
      <Card className="max-w-xl mx-auto bg-white border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden">
        
        {/* Subtle top decoration */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-500 w-full opacity-80" />
        
        <div className="p-8 sm:p-10">
          {/* Header Section */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="p-4 bg-blue-50 rounded-2xl mb-4 shadow-sm border border-blue-100/50">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Start a Community</h1>
            <p className="text-slate-500 text-sm font-medium mt-2 max-w-[280px]">
              Create a hub for your club, hostel, or interest group.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Community Name Field */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                <Hash className="w-3 h-3" /> Community Name
              </label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Web Dev Club, Hostel-9" 
                required
                maxLength={30}
                className="h-12 text-[15px] bg-slate-50/30 border-slate-100 rounded-2xl focus-visible:ring-blue-500/10 focus-visible:border-blue-400 transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Description Field */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <Info className="w-3 h-3" /> Description
                </label>
                <span className="text-[10px] font-bold text-slate-300">
                  {description.length}/200
                </span>
              </div>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Tell other students why they should join your circle..." 
                className="min-h-[120px] text-[15px] bg-slate-50/30 border-slate-100 rounded-2xl focus-visible:ring-blue-500/10 focus-visible:border-blue-400 transition-all resize-none p-5 text-slate-800 placeholder:text-slate-400"
                maxLength={200}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="flex-1 h-12 rounded-full text-slate-500 font-bold hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel
              </Button>
              <Button 
                disabled={isSubmitting || !name.trim()} 
                className="flex-[2] h-12 rounded-full bg-slate-900 hover:bg-blue-600 text-white font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-30 group"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span>Create Community</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default CreateCommunity;