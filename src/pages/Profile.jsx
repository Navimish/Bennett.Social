import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser, useSession } from "@clerk/clerk-react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Loader2, Camera, GraduationCap, Edit3, GitBranch, Users, ExternalLink,
  Code2, Briefcase, UserCheck, Globe, FileText, Bookmark, Users2, Sparkles, MapPin
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/PostCard";

function Profile() {
  const { user, isSignedIn } = useUser();
  const { session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [userPosts, setUserPosts] = useState([]);
  const [userCommunities, setUserCommunities] = useState([]);
  const [userInteractedPosts, setUserInteractedPosts] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState(true);

  const [profileData, setProfileData] = useState({
    full_name: "", username: "", bio: "", major: "", grad_year: "",
    enrollment_number: "", bennett_email: "", github_url: "",
    linkedin_url: "", leetcode_url: "", portfolio_url: "",
    skills: [], status: "Just Browsing", carpool_destination: "",
  });

  const [skillInput, setSkillInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchProfile();
      fetchUserActivity();
    }
  }, [isSignedIn, user?.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name || "",
          username: data.username || "",
          bio: data.bio || "",
          major: data.major || "",
          grad_year: data.grad_year || "",
          enrollment_number: data.enrollment_number || "",
          bennett_email: data.bennett_email || "",
          github_url: data.github_url || "",
          linkedin_url: data.linkedin_url || "",
          leetcode_url: data.leetcode_url || "",
          portfolio_url: data.portfolio_url || "",
          skills: data.skills || [],
          status: data.status || "Just Browsing",
          carpool_destination: data.carpool_destination || "",
        });
        setSkillInput((data.skills || []).join(", "));
        setAvatarUrl(data.avatar_url || "");
        setHasProfile(true);
        setIsEditing(false);
      } else {
        setProfileData((prev) => ({
          ...prev,
          full_name: user.fullName || "",
          bennett_email: user.primaryEmailAddress?.emailAddress || "",
        }));
        setHasProfile(false);
        setIsEditing(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async () => {
    if (!user?.id) return;
    setLoadingTabs(true);
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setUserPosts(postsData || []);

      const { data: commData } = await supabase
        .from("community_members")
        .select(`community_id, communities (*)`)
        .eq("user_id", user.id);
      
      setUserCommunities(commData?.map((m) => m.communities).filter(Boolean) || []);

      const { data: likedData } = await supabase.from("likes").select("post_id").eq("user_id", user.id);
      const { data: commentedData } = await supabase.from("comments").select("post_id").eq("user_id", user.id);

      const postIds = new Set([...(likedData?.map(d => d.post_id) || []), ...(commentedData?.map(d => d.post_id) || [])]);
      if (postIds.size > 0) {
        const { data: interacted } = await supabase.from("posts").select("*").in("id", Array.from(postIds)).order("created_at", { ascending: false });
        setUserInteractedPosts(interacted || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTabs(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const token = await session.getToken({ template: "supabase" });
      const authSupabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await authSupabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      toast.success("Avatar updated");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const skillsArray = skillInput.split(",").map((s) => s.trim()).filter((s) => s !== "");
    try {
      const token = await session.getToken({ template: "supabase" });
      const authSupabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const finalCarpool = profileData.status === "Looking for Carpooling" ? profileData.carpool_destination : null;
      const payload = { id: user.id, ...profileData, carpool_destination: finalCarpool, skills: skillsArray, grad_year: parseInt(profileData.grad_year) || null, avatar_url: avatarUrl };
      const { error } = await authSupabase.from("profiles").upsert(payload);
      if (error) throw error;
      toast.success("Profile saved!");
      setHasProfile(true);
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error(error);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => setProfileData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8">
      {isEditing ? (
        <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-8 px-2">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Identity Setup</h1>
              <p className="text-slate-500 font-medium">Customize your student presence.</p>
            </div>
            {hasProfile && <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-full text-slate-400">Cancel</Button>}
          </div>

          <form onSubmit={handleSave} className="space-y-8 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="w-28 h-28 border-[6px] border-slate-50 shadow-inner">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="text-3xl font-black bg-blue-50 text-blue-600">{profileData.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                  {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Profile Image</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1"><UserCheck className="w-3 h-3 text-green-500" /> Campus Status</label>
                <Select value={profileData.status} onValueChange={(val) => setProfileData(p => ({ ...p, status: val }))}>
                  <SelectTrigger className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Just Browsing">👀 Just Browsing</SelectItem>
                    <SelectItem value="Looking for Hackathon Members">💻 Hackathon Team</SelectItem>
                    <SelectItem value="Looking for Project Members">🛠️ Project Team</SelectItem>
                    <SelectItem value="Looking for Startup Members">🚀 Startup Team</SelectItem>
                    <SelectItem value="Looking for Carpooling">🚗 Carpooling</SelectItem>
                    <SelectItem value="Looking for a Study Buddy">📚 Study Buddy</SelectItem>
                    <SelectItem value="Available to Mentor">🧠 Available to Mentor</SelectItem>
                  </SelectContent>
                </Select>
                {profileData.status === "Looking for Carpooling" && (
                  <Input name="carpool_destination" value={profileData.carpool_destination} onChange={handleChange} placeholder="Destination & time..." className="h-12 bg-blue-50/30 border-blue-100 rounded-2xl mt-2" />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-slate-400 px-1">Full Name</label>
                   <Input name="full_name" value={profileData.full_name} onChange={handleChange} required className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl" />
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-slate-400 px-1">Username</label>
                   <Input name="username" value={profileData.username} onChange={handleChange} placeholder="@username" required className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-slate-400 px-1">GitHub URL</label>
                   <Input name="github_url" value={profileData.github_url} onChange={handleChange} placeholder="https://github.com/..." className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl" />
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-slate-400 px-1">LinkedIn URL</label>
                   <Input name="linkedin_url" value={profileData.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl" />
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-slate-400 px-1">LeetCode URL</label>
                   <Input name="leetcode_url" value={profileData.leetcode_url} onChange={handleChange} placeholder="https://leetcode.com/..." className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl" />
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-slate-400 px-1">Portfolio/Web</label>
                   <Input name="portfolio_url" value={profileData.portfolio_url} onChange={handleChange} placeholder="https://..." className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl" />
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-black uppercase text-slate-400 px-1">Skills (Comma separated)</label>
                 <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="React, Figma, Python..." className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl" />
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-black uppercase text-slate-400 px-1">Bio</label>
                 <Textarea name="bio" value={profileData.bio} onChange={handleChange} className="min-h-[100px] bg-slate-50/50 border-slate-100 rounded-2xl resize-none" placeholder="Tell Bennett about yourself..." />
              </div>

              <Button type="submit" disabled={saving} className="w-full h-14 bg-slate-900 hover:bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-xl shadow-slate-200">
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <Card className="overflow-hidden border-slate-200/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white sticky top-24">
              <div className="h-32 bg-slate-900 relative">
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${profileData.status?.includes("Looking") ? "bg-green-400 animate-pulse" : "bg-blue-400"}`} />
                    {profileData.status}
                  </div>
                </div>
              </div>

              <div className="px-8 pb-10">
                <div className="flex justify-between items-end -mt-14 mb-6">
                  <Avatar className="w-28 h-28 border-[6px] border-white shadow-2xl">
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="text-3xl font-black bg-blue-50 text-blue-600">{profileData.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="h-10 px-5 rounded-full border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    <Edit3 className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{profileData.full_name}</h1>
                    <p className="text-blue-600 font-bold text-sm tracking-tight">{profileData.username}</p>
                  </div>

                  {profileData.bio && <p className="text-slate-600 text-sm leading-relaxed font-medium">{profileData.bio}</p>}

                  {/* RESTORED: Skills/Expertise */}
                  {profileData.skills?.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <Briefcase className="w-3 h-3 text-blue-500" /> Expertise
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profileData.skills.map((skill, idx) => (
                          <div key={idx} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl text-[11px] font-bold">
                            {skill}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RESTORED: Social Links including LeetCode */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {profileData.github_url && (
                      <a href={profileData.github_url} target="_blank" className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group/link">
                        <GitBranch className="w-4 h-4 text-slate-700 group-hover/link:text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-slate-500">GitHub</span>
                      </a>
                    )}
                    {profileData.linkedin_url && (
                      <a href={profileData.linkedin_url} target="_blank" className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group/link">
                        <Users className="w-4 h-4 text-blue-600 group-hover/link:scale-110" />
                        <span className="text-[10px] font-black uppercase text-slate-500">LinkedIn</span>
                      </a>
                    )}
                    {profileData.leetcode_url && (
                      <a href={profileData.leetcode_url} target="_blank" className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group/link">
                        <Code2 className="w-4 h-4 text-orange-500 group-hover/link:scale-110" />
                        <span className="text-[10px] font-black uppercase text-slate-500">LeetCode</span>
                      </a>
                    )}
                    {profileData.portfolio_url && (
                      <a href={profileData.portfolio_url} target="_blank" className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group/link">
                        <Globe className="w-4 h-4 text-slate-700 group-hover/link:text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-slate-500">Web</span>
                      </a>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-y-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3" /> Program</p>
                      <p className="text-xs font-bold text-slate-900">{profileData.major || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Grad Year</p>
                      <p className="text-xs font-bold text-slate-900">{profileData.grad_year || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Activity Tabs */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="flex bg-slate-100/50 p-1.5 rounded-[1.5rem] border border-slate-200/40 h-14">
                <TabsTrigger value="posts" className="flex-1 rounded-2xl text-[13px] font-bold tracking-tight data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all uppercase">Posts</TabsTrigger>
                <TabsTrigger value="communities" className="flex-1 rounded-2xl text-[13px] font-bold tracking-tight data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all uppercase">Tribes</TabsTrigger>
                <TabsTrigger value="saved" className="flex-1 rounded-2xl text-[13px] font-bold tracking-tight data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all uppercase">History</TabsTrigger>
              </TabsList>

              <div className="mt-8">
                <TabsContent value="posts">
                  {loadingTabs ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div> : userPosts.length > 0 ? (
                    <div className="space-y-6">{userPosts.map(p => <PostCard key={p.id} id={p.id} author={p.author} postUserId={p.user_id} content={p.content} timestamp={new Date(p.created_at).toLocaleString()} imageUrl={p.image_url} initialLikesCount={p.likes_count} />)}</div>
                  ) : (
                    <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                       <FileText className="w-10 h-10 text-slate-200 mb-4" />
                       <p className="text-slate-900 font-black uppercase tracking-widest text-sm">No Posts</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="communities">
                  {userCommunities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userCommunities.map(c => (
                        <Link key={c.id} to={`/communities/${c.slug}`}>
                          <Card className="p-5 border-slate-100 bg-white hover:border-blue-200 shadow-sm transition-all rounded-3xl flex items-center gap-4 group">
                            <div className="w-14 h-14 bg-blue-50 group-hover:scale-110 transition-transform rounded-2xl flex items-center justify-center text-blue-600 font-black border border-blue-100">{c.name?.charAt(0)}</div>
                            <div>
                              <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.name}</h4>
                              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight line-clamp-1">{c.description || "Active Tribe"}</p>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                       <Users2 className="w-10 h-10 text-slate-200 mb-4" />
                       <p className="text-slate-900 font-black uppercase tracking-widest text-sm">No Tribes</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="saved">
                  <div className="space-y-6">
                    {userInteractedPosts.map(p => <PostCard key={p.id} id={p.id} author={p.author} postUserId={p.user_id} content={p.content} timestamp={new Date(p.created_at).toLocaleString()} imageUrl={p.image_url} initialLikesCount={p.likes_count} />)}
                    {userInteractedPosts.length === 0 && (
                      <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                         <Bookmark className="w-10 h-10 text-slate-200 mb-4" />
                         <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Empty History</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;