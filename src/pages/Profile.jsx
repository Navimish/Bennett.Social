import React, { useState, useEffect } from "react";
import { useUser, useSession } from "@clerk/clerk-react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  GraduationCap,
  Calendar,
  Edit3,
  Mail,
  IdCard,
  GitBranch,
  Users,
  ExternalLink,
  Code2,
  Briefcase,
  UserCheck,
  Globe,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Profile() {
  const { user, isSignedIn } = useUser();
  const { session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: "",
    username: "",
    bio: "",
    major: "",
    grad_year: "",
    enrollment_number: "",
    bennett_email: "",
    github_url: "",
    linkedin_url: "",
    leetcode_url: "",
    portfolio_url: "",
    skills: [],
    status: "Just Browsing",
  });

  const [skillInput, setSkillInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchProfile();
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
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const supabaseToken = await session.getToken({ template: "supabase" });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } },
      );

      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await authSupabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
      toast.success("Image updated!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const skillsArray = skillInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    try {
      const supabaseToken = await session.getToken({ template: "supabase" });
      const authSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } },
      );

      const profilePayload = {
        id: user.id,
        ...profileData,
        skills: skillsArray,
        grad_year: parseInt(profileData.grad_year) || null,
        avatar_url: avatarUrl,
      };

      const { error } = await authSupabase
        .from("profiles")
        .upsert(profilePayload);

      if (error) throw error;

      toast.success("Profile saved!");
      setProfileData((prev) => ({ ...prev, skills: skillsArray }));
      setHasProfile(true);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfileData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pb-20 mt-4">
      {isEditing ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-zinc-900">
              Setup Your Student Identity
            </h1>
            {hasProfile && (
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
          </div>

          <form
            onSubmit={handleSave}
            className="space-y-8 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="relative group cursor-pointer">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold bg-blue-50 text-blue-600">
                    {profileData.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                Profile Picture
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-500" /> Current Campus
                Status
              </label>
              <Select
                value={profileData.status}
                onValueChange={(val) =>
                  setProfileData((prev) => ({ ...prev, status: val }))
                }
              >
                <SelectTrigger className="bg-zinc-50 border-zinc-200">
                  <SelectValue placeholder="Set your status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Just Browsing">
                    👀 Just Browsing
                  </SelectItem>
                  <SelectItem value="Looking for Hackathon Members">
                    💻 Looking for Hackathon Members
                  </SelectItem>
                  <SelectItem value="Looking for Project Members">
                    🛠️ Looking for Project Members
                  </SelectItem>
                  <SelectItem value="Looking for Startup Members">
                    🚀 Looking for Startup Members
                  </SelectItem>
                  <SelectItem value="Looking for Carpooling">
                    🚗 Looking for Carpooling
                  </SelectItem>
                  <SelectItem value="Looking for a Study Buddy">
                    📚 Looking for a Study Buddy
                  </SelectItem>
                  <SelectItem value="Available to Mentor">
                    🧠 Available to Mentor
                  </SelectItem>
                  <SelectItem value="Seeking a Mentor">
                    🔍 Seeking a Mentor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Full Name
                </label>
                <Input
                  name="full_name"
                  value={profileData.full_name}
                  onChange={handleChange}
                  required
                  className="bg-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Username
                </label>
                <Input
                  name="username"
                  value={profileData.username}
                  onChange={handleChange}
                  placeholder="@username"
                  required
                  className="bg-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Enrollment Number
                </label>
                <Input
                  name="enrollment_number"
                  value={profileData.enrollment_number}
                  onChange={handleChange}
                  placeholder="E23CSEU..."
                  className="bg-zinc-50 uppercase"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Bennett Email
                </label>
                <Input
                  name="bennett_email"
                  type="email"
                  value={profileData.bennett_email}
                  onChange={handleChange}
                  className="bg-zinc-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-500" /> Skills & Tech Stack
              </label>
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="e.g. React, Node.js, Python, Figma (separate by commas)"
                className="bg-zinc-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  GitHub URL
                </label>
                <Input
                  name="github_url"
                  value={profileData.github_url}
                  onChange={handleChange}
                  placeholder="https://github.com/..."
                  className="bg-zinc-50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  LinkedIn URL
                </label>
                <Input
                  name="linkedin_url"
                  value={profileData.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/..."
                  className="bg-zinc-50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  LeetCode URL
                </label>
                <Input
                  name="leetcode_url"
                  value={profileData.leetcode_url}
                  onChange={handleChange}
                  placeholder="https://leetcode.com/u/..."
                  className="bg-zinc-50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Portfolio/Website
                </label>
                <Input
                  name="portfolio_url"
                  value={profileData.portfolio_url}
                  onChange={handleChange}
                  placeholder="https://yourportfolio.com"
                  className="bg-zinc-50 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Bio</label>
              <Textarea
                name="bio"
                value={profileData.bio}
                onChange={handleChange}
                className="bg-zinc-50 resize-none min-h-[80px]"
              />
            </div>

            <Button
              type="submit"
              disabled={saving || uploadingImage}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-100"
            >
              {saving || uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {saving
                ? "Saving Changes..."
                : uploadingImage
                  ? "Waiting for Image..."
                  : "Finalize Profile"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden border-zinc-200 rounded-3xl shadow-sm bg-white">
            <div className="h-40 bg-zinc-900 relative">
              <div className="absolute bottom-4 right-6 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-tighter flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {profileData.status}
              </div>
            </div>

            <div className="px-8 pb-10">
              <div className="flex justify-between items-end -mt-14 mb-6">
                <Avatar className="w-28 h-28 border-[6px] border-white shadow-xl bg-white">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="text-4xl font-bold bg-blue-50 text-blue-600">
                    {profileData.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                {/* UPDATED: Links with Text Labels Underneath */}
                <div className="flex items-start gap-4">
                  <div className="flex gap-3">
                    {profileData.github_url && (
                      <a
                        href={profileData.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                          <GitBranch className="w-5 h-5 text-zinc-700" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                          GitHub
                        </span>
                      </a>
                    )}
                    {profileData.linkedin_url && (
                      <a
                        href={profileData.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-blue-600 transition-colors">
                          LinkedIn
                        </span>
                      </a>
                    )}
                    {profileData.leetcode_url && (
                      <a
                        href={profileData.leetcode_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                          <Code2 className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-orange-600 transition-colors">
                          LeetCode
                        </span>
                      </a>
                    )}
                    {profileData.portfolio_url && (
                      <a
                        href={profileData.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                          <Globe className="w-5 h-5 text-zinc-700" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                          Portfolio
                        </span>
                      </a>
                    )}
                  </div>

                  {/* Edit Button moved to align with the icons */}
                  <div className="ml-2">
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="rounded-xl border-zinc-300 h-11 shadow-sm mt-0.5"
                    >
                      <Edit3 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
                      {profileData.full_name}
                    </h1>
                    <p className="text-blue-600 font-bold text-sm">
                      {profileData.username}
                    </p>
                  </div>
                </div>

                {profileData.bio && (
                  <p className="text-zinc-600 leading-relaxed text-sm max-w-xl">
                    {profileData.bio}
                  </p>
                )}

                {profileData.skills.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-3 h-3" /> Expertise
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.skills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 bg-blue-50/50 border border-blue-100 text-blue-700 rounded-lg text-xs font-bold"
                        >
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-zinc-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">
                      Enrollment
                    </p>
                    <p className="text-xs font-mono font-bold text-zinc-800">
                      {profileData.enrollment_number || "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">
                      Program
                    </p>
                    <p className="text-xs font-bold text-zinc-800">
                      {profileData.major || "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">
                      Graduation
                    </p>
                    <p className="text-xs font-bold text-zinc-800">
                      {profileData.grad_year
                        ? `Class of ${profileData.grad_year}`
                        : "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">
                      Contact
                    </p>
                    <a
                      href={`mailto:${profileData.bennett_email}`}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Email <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Profile;
