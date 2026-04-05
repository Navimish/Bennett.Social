import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser } from "@clerk/clerk-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Loader2, GraduationCap, Users, ExternalLink, Code2, Briefcase, 
  Globe, ArrowLeft, FileText, Users2, GitBranch, MessageSquare
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/PostCard";

function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useUser(); 
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [userCommunities, setUserCommunities] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      const searchUsername1 = username;
      const searchUsername2 = `@${username}`;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${searchUsername1},username.eq.${searchUsername2}`)
        .single();

      if (error) throw error;
      setProfileData(data);
      if (data?.id) fetchUserActivity(data.id);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async (targetUserId) => {
    setLoadingTabs(true);
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });
      setUserPosts(postsData || []);

      const { data: commData } = await supabase
        .from("community_members")
        .select(`community_id, communities (*)`)
        .eq("user_id", targetUserId);
      setUserCommunities(commData?.map((m) => m.communities).filter(Boolean) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTabs(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[calc(100vh-100px)] bg-[#f8fafc]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!profileData) return (
    <div className="max-w-3xl mx-auto p-6 mt-20 text-center bg-[#f8fafc]">
      <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Student Not Found</h2>
      <Link to="/network"><Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-8">Back to Network</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 mt-4">
        
        <Link to="/network" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Network
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <Card className="overflow-hidden border-slate-200/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
              <div className="h-32 bg-slate-900 relative">
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
                  <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${profileData.status?.includes('Looking') ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`} />
                    {profileData.status || "Just Browsing"}
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-8">
                <div className="flex justify-between items-end -mt-12 mb-6">
                  <Avatar className="w-24 h-24 border-[4px] border-white shadow-xl bg-white">
                    <AvatarImage src={profileData.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-3xl font-black bg-blue-50 text-blue-600">{profileData.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-6">
                  {/* FIXED HEADER LAYOUT: Flex column on mobile, row on desktop with better spacing */}
                  <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        {profileData.full_name}
                      </h1>
                      <p className="text-blue-600 font-bold text-sm">
                        {profileData.username}
                      </p>
                    </div>
                    
                    {user?.id && user.id !== profileData.id && (
                      <Button 
                        onClick={() => navigate(`/messages/${profileData.username.replace('@', '')}`)}
                        className="bg-slate-900 hover:bg-blue-600 text-white rounded-full px-6 py-5 shadow-lg shadow-slate-100 transition-all active:scale-95 text-sm font-black w-full"
                      >
                        <MessageSquare className="w-4 h-4 mr-2 fill-current" /> Message
                      </Button>
                    )}
                  </div>

                  {profileData.bio && (
                    <p className="text-slate-600 leading-relaxed text-sm font-medium">{profileData.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-2.5">
                    {profileData.github_url && (
                      <a href={profileData.github_url} target="_blank" className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all flex-1 justify-center min-w-[80px] group/link">
                        <GitBranch className="w-4 h-4 text-slate-400 group-hover/link:text-slate-900 transition-colors" />
                        <span className="text-[10px] font-black uppercase text-slate-400">GitHub</span>
                      </a>
                    )}
                    {profileData.linkedin_url && (
                      <a href={profileData.linkedin_url} target="_blank" className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all flex-1 justify-center min-w-[80px] group/link">
                        <Users className="w-4 h-4 text-slate-400 group-hover/link:text-blue-600 transition-colors" />
                        <span className="text-[10px] font-black uppercase text-slate-400">LinkedIn</span>
                      </a>
                    )}
                  </div>

                  {profileData.skills?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Briefcase className="w-3 h-3" /> Expertise
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profileData.skills.map((skill, idx) => (
                          <div key={idx} className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl text-[11px] font-bold">
                            {skill}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Program</p>
                      <p className="text-xs font-bold text-slate-800">{profileData.major || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</p>
                      {profileData.bennett_email ? (
                        <a href={`mailto:${profileData.bennett_email}`} className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1">
                          Email <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : <p className="text-xs font-bold text-slate-800">N/A</p>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="flex bg-slate-100/50 p-1 rounded-2xl h-14 border border-slate-200/40">
                <TabsTrigger value="posts" className="flex-1 rounded-xl text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 shadow-none transition-all uppercase tracking-tight">Posts</TabsTrigger>
                <TabsTrigger value="communities" className="flex-1 rounded-xl text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 shadow-none transition-all uppercase tracking-tight">Communities</TabsTrigger>
              </TabsList>

              <div className="mt-8 animate-in fade-in duration-500">
                <TabsContent value="posts">
                  {loadingTabs ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                  ) : userPosts.length > 0 ? (
                    <div className="space-y-6">
                      {userPosts.map((p) => (
                        <PostCard key={p.id} id={p.id} author={p.author || profileData.full_name} postUserId={p.user_id} content={p.content} timestamp={new Date(p.created_at).toLocaleString()} imageUrl={p.image_url} initialLikesCount={p.likes_count || 0} />
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 border-dashed border-2 border-slate-200 bg-white/50 flex flex-col items-center justify-center text-center rounded-[2.5rem] min-h-[300px]">
                      <FileText className="w-7 h-7 text-blue-400 mb-4" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">No posts yet</h3>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="communities">
                  {userCommunities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {userCommunities.map((c) => (
                        <Link key={c.id} to={`/communities/${c.slug || c.id}`}>
                          <Card className="p-5 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all group rounded-[2rem] flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-50 group-hover:scale-110 transition-transform rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl border border-blue-100">{c.name?.charAt(0)}</div>
                            <div>
                              <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{c.name}</h4>
                              <p className="text-[11px] text-slate-400 font-bold uppercase line-clamp-1">{c.description || "Member"}</p>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 border-dashed border-2 border-slate-200 bg-white/50 flex flex-col items-center justify-center text-center rounded-[2.5rem] min-h-[300px]">
                      <Users2 className="w-7 h-7 text-green-400 mb-4" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">No tribes found</h3>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

        </div>
      </div>
    </div>
  );
}

export default UserProfile;