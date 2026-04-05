import React, { useEffect, useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase'
import { useUser, useSession } from "@clerk/clerk-react"
import { createClient } from "@supabase/supabase-js"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Users, Plus, MessageSquare, Check, Loader2, Compass } from "lucide-react" 

function Communities() {
  const [communities, setCommunities] = useState([]);
  const [joinedIds, setJoinedIds] = useState(new Set()); 
  const [loading, setLoading] = useState(true);
  
  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    if (isSignedIn && session) {
      fetchUserMemberships();
    }
  }, [isSignedIn, session]);

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunities(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load communities");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMemberships = async () => {
    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const { data, error } = await authSupabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const myCommunityIds = new Set(data.map(membership => membership.community_id));
      setJoinedIds(myCommunityIds);
    } catch (error) {
      console.error(error);
    }
  };

  const handleJoin = async (communityId, slug) => {
    if (!user || !session) {
      toast.error("Please login to join communities");
      return;
    }

    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authenticatedSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const { error } = await authenticatedSupabase
        .from('community_members')
        .insert([{ community_id: communityId, user_id: user.id }]);

      if (error) {
        if (error.code === '23505') {
          navigate(`/communities/${slug}`);
          return;
        }
        throw error;
      }

      toast.success("Joined successfully!");
      setJoinedIds(prev => new Set(prev).add(communityId));
      navigate(`/communities/${slug}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not join community");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200/60 pt-12 pb-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Communities</h1>
            <p className="text-slate-500 font-medium mt-1">Find your tribe and inner circle at Bennett University.</p>
          </div>
          <Button 
            onClick={() => navigate('/create-community')}
            className="h-12 bg-slate-900 hover:bg-blue-600 text-white rounded-full px-8 font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 group"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> Start a Community
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-white border border-slate-100 animate-pulse rounded-[2rem]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {communities.map((comm) => {
              const hasJoined = joinedIds.has(comm.id);

              return (
                <Card key={comm.id} className="group p-8 bg-white border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1.5 transition-all duration-500 rounded-[2.5rem] flex flex-col">
                  <div className="flex-1">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 border border-blue-100/50 transition-transform group-hover:scale-110">
                      <Users className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors tracking-tight">{comm.name}</h2>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-8 font-medium">
                      {comm.description || "A space for Bennett students to connect, share, and grow together."}
                    </p>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    {hasJoined ? (
                      <div className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest py-3">
                        <Check className="w-4 h-4 text-green-500" /> Joined
                      </div>
                    ) : (
                      <Button 
                        onClick={() => handleJoin(comm.id, comm.slug)}
                        variant="outline" 
                        className="flex-1 h-11 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 active:scale-95 transition-all"
                      >
                        Join
                      </Button>
                    )}
                    
                    <Button 
                      onClick={() => navigate(`/communities/${comm.slug}`)}
                      className="flex-1 h-11 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-100"
                    >
                      <MessageSquare className="w-4 h-4" /> View
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && communities.length === 0 && (
          <div className="text-center py-24 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                <Compass className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-900 font-black uppercase tracking-widest text-sm">No communities yet</p>
            <p className="text-slate-500 text-sm mt-1">Be the pioneer and start the first one!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Communities;