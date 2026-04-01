import React, { useEffect, useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase'
import { useUser, useSession } from "@clerk/clerk-react"
import { createClient } from "@supabase/supabase-js"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Users, Plus, MessageSquare, Check } from "lucide-react" 

function Communities() {
  const [communities, setCommunities] = useState([]);
  const [joinedIds, setJoinedIds] = useState(new Set()); // Tracks communities the user is in
  const [loading, setLoading] = useState(true);
  
  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommunities();
  }, []);

  // Fetch memberships whenever the user logs in or the session is ready
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

      // Store IDs in a Set for fast and easy lookups
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
      
      // Update local state instantly so the button changes to "Joined" without reloading
      setJoinedIds(prev => new Set(prev).add(communityId));
      
      navigate(`/communities/${slug}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not join community");
    }
  };

  return (
    <div className="max-w-6xl mx-auto pt-10 px-4 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Communities</h1>
          <p className="text-zinc-500">Find your tribe at Bennett University</p>
        </div>
        <Button 
          onClick={() => navigate('/create-community')}
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
        >
          <Plus className="w-4 h-4 mr-2" /> Start a Community
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-zinc-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((comm) => {
            const hasJoined = joinedIds.has(comm.id);

            return (
              <Card key={comm.id} className="p-6 hover:shadow-lg transition-shadow border-zinc-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">{comm.name}</h2>
                  <p className="text-sm text-zinc-500 line-clamp-3 mb-6">
                    {comm.description || "No description provided."}
                  </p>
                </div>

                <div className="flex gap-2 mt-auto">
                  {/* Conditional Join / Joined Button */}
                  {hasJoined ? (
                    <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 text-sm font-medium py-2">
                      <Check className="w-4 h-4 text-green-500" /> Joined
                    </div>
                  ) : (
                    <Button 
                      onClick={() => handleJoin(comm.id, comm.slug)}
                      variant="outline" 
                      className="cursor-pointer flex-1 rounded-xl border-zinc-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      Join
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => navigate(`/communities/${comm.slug}`)}
                    className="cursor-pointer flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> View
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && communities.length === 0 && (
        <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
          <p className="text-zinc-500">No communities found. Be the first to start one!</p>
        </div>
      )}
    </div>
  )
}

export default Communities;