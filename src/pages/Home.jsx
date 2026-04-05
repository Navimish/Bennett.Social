import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from "react-router-dom" 
import PostCard from '@/components/PostCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { createClient } from "@supabase/supabase-js" 
import { Loader2, Users, Compass } from 'lucide-react'
import { useUser, useSession } from "@clerk/clerk-react" 
import { toast } from "sonner" 

const POSTS_PER_PAGE = 5; 

function Home() {
  const { user, isSignedIn, isLoaded } = useUser(); 
  const { session } = useSession(); 
  const navigate = useNavigate(); 
  
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [suggestedCommunities, setSuggestedCommunities] = useState([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true); 
  const [isJoining, setIsJoining] = useState(null);

  const fetchPosts = async (currentPage) => {
    try {
      if (currentPage === 0) setIsLoading(true);
      else setIsFetchingMore(true);

      const from = currentPage * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to); 

      if (error) throw error;

      if (data) {
        if (data.length < POSTS_PER_PAGE) setHasMore(false); 
        if (currentPage === 0) setPosts(data);
        else setPosts((prev) => [...prev, ...data]); 
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const fetchSuggestedCommunities = async () => {
    setIsLoadingCommunities(true); 
    try {
      let joinedCommunityIds = [];
      if (isSignedIn && user?.id) {
        const { data: myMemberships } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id);
        if (myMemberships) joinedCommunityIds = myMemberships.map(m => m.community_id);
      }

      let query = supabase.from('communities').select('id, name, slug, community_members(count)');
      if (joinedCommunityIds.length > 0) {
        query = query.not('id', 'in', `(${joinedCommunityIds.join(',')})`);
      }

      const { data, error } = await query.limit(5);
      if (error) throw error;

      if (data) {
        setSuggestedCommunities(data.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          memberCount: c.community_members[0]?.count || 0
        })));
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setIsLoadingCommunities(false); 
    }
  };

  useEffect(() => { fetchPosts(page); }, [page]);
  useEffect(() => { if (isLoaded) fetchSuggestedCommunities(); }, [isLoaded, isSignedIn, user?.id]);

  const handleJoinCommunity = async (community) => {
    if (!isSignedIn) {
      toast.error("Please sign in to join communities!");
      return;
    }
    setIsJoining(community.id);
    try {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
      );

      const { error } = await authSupabase.from('community_members').insert({
        community_id: community.id,
        user_id: user.id
      });

      if (error) throw error;
      toast.success(`Welcome to ${community.name}!`);
      setSuggestedCommunities(prev => prev.filter(c => c.id !== community.id));
      navigate(`/communities/${community.slug}`);
    } catch (error) {
      console.error(error)
      toast.error("Failed to join.");
    } finally {
      setIsJoining(null);
    }
  };

  const observer = useRef();
  const lastPostElementRef = useCallback((node) => {
    if (isLoading || isFetchingMore) return; 
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage((prev) => prev + 1);
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* TIGHTENED: Changed pt-6 md:pt-10 to pt-4 md:pt-6 */}
      <main className="flex max-w-6xl mx-auto w-full pt-4 md:pt-6 px-4 gap-6">
        
        {/* Left Feed Section */}
        {/* TIGHTENED: Reduced flex gap from 6 to 4 for posts */}
        <div className="w-full lg:w-[65%] flex flex-col gap-4 pb-20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
               <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
               <p className="text-slate-400 font-medium animate-pulse">Loading Bennett Social...</p>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <div key={post.id} ref={posts.length === index + 1 ? lastPostElementRef : null}>
                  <PostCard
                    id={post.id}
                    author={post.author || "Bennett Student"}
                    postUserId={post.user_id}
                    content={post.content}
                    timestamp={new Date(post.created_at).toLocaleString()}
                    imageUrl={post.image_url}
                    initialLikesCount={post.likes_count || 0}
                  />
                </div>
              ))}

              {isFetchingMore && (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-500/50" />
                </div>
              )}
              
              {!hasMore && posts.length > 0 && (
                <div className="text-center py-10 px-6 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                    <Compass className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">End of the road</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">You're all caught up with the latest at Bennett.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar */}
        {/* TIGHTENED: Reduced top sticky offset to top-20 */}
        <aside className="hidden lg:flex lg:w-[35%] flex-col sticky top-20 h-fit gap-4">
          <Card className="p-6 bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden relative">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-100/50">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-black text-slate-900 text-[13px] uppercase tracking-wider">Tribe Suggestions</h3>
            </div>
            
            <ul className="flex flex-col gap-5">
              {isLoadingCommunities ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 w-full bg-slate-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : suggestedCommunities.length === 0 ? (
                <div className="text-center py-6">
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">All tribes joined!</p>
                </div>
              ) : (
                suggestedCommunities.map((community) => (
                  <li key={community.id} className="flex justify-between items-center group">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-sm text-slate-900 font-bold truncate group-hover:text-blue-600 transition-colors cursor-pointer">
                        {community.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                        {community.memberCount} members
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isJoining === community.id}
                      onClick={() => handleJoinCommunity(community)} 
                      className="h-8 px-4 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-blue-600 rounded-full transition-all active:scale-90 shadow-md shadow-slate-200"
                    >
                      {isJoining === community.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join"}
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </Card>

          {/* Footer inside sidebar */}
          <div className="px-6 flex flex-wrap gap-x-4 gap-y-1 opacity-60">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">© 2026 Bennett Social</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 cursor-pointer">Guidelines</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 cursor-pointer">Privacy</p>
          </div>
        </aside>
        
      </main>
    </div>
  )
}

export default Home;