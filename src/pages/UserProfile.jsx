import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Loader2, GraduationCap, Calendar, Mail, IdCard, 
  GitBranch, Users, ExternalLink, Code2, Briefcase, 
  Globe, ArrowLeft 
} from "lucide-react";

function UserProfile() {
  const { username } = useParams(); // Gets the username from the URL
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      // In case the DB has it saved with or without the '@' symbol
      const searchUsername1 = username;
      const searchUsername2 = `@${username}`;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${searchUsername1},username.eq.${searchUsername2}`)
        .single();

      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-20 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Student Not Found</h2>
        <p className="text-zinc-500 mb-6">We couldn't find a profile for @{username}.</p>
        <Link to="/network">
          <Button className="bg-blue-600 hover:bg-blue-700">Back to Network</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pb-20 mt-4 space-y-6">
      
      {/* Back Navigation */}
      <Link to="/network" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Network
      </Link>

      {/* Profile Card (Read-Only) */}
      <Card className="overflow-hidden border-zinc-200 rounded-3xl shadow-sm bg-white">
        <div className="h-40 bg-zinc-900 relative">
          {/* Status Badge */}
          <div className="absolute bottom-4 right-6 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-tighter flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${profileData.status?.includes('Looking') ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`} />
            {profileData.status || "Just Browsing"}
          </div>
        </div>
        
        <div className="px-8 pb-10">
          <div className="flex justify-between items-end -mt-14 mb-6">
            <Avatar className="w-28 h-28 border-[6px] border-white shadow-xl bg-white">
              <AvatarImage src={profileData.avatar_url} className="object-cover" />
              <AvatarFallback className="text-4xl font-bold bg-blue-50 text-blue-600">
                {profileData.full_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            {/* Professional Links */}
            <div className="flex gap-3">
              {profileData.github_url && (
                <a href={profileData.github_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 group">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                    <GitBranch className="w-5 h-5 text-zinc-700" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors">GitHub</span>
                </a>
              )}
              {profileData.linkedin_url && (
                <a href={profileData.linkedin_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 group">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 group-hover:text-blue-600 transition-colors">LinkedIn</span>
                </a>
              )}
              {profileData.leetcode_url && (
                <a href={profileData.leetcode_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 group">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                    <Code2 className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 group-hover:text-orange-600 transition-colors">LeetCode</span>
                </a>
              )}
              {profileData.portfolio_url && (
                <a href={profileData.portfolio_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 group">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-sm">
                    <Globe className="w-5 h-5 text-zinc-700" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors">Portfolio</span>
                </a>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight">{profileData.full_name}</h1>
              <p className="text-blue-600 font-bold text-sm">{profileData.username}</p>
            </div>

            {profileData.bio && <p className="text-zinc-600 leading-relaxed text-sm max-w-xl">{profileData.bio}</p>}

            {/* Skills */}
            {profileData.skills && profileData.skills.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-3 h-3" /> Expertise
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill, idx) => (
                    <div key={idx} className="px-3 py-1.5 bg-blue-50/50 border border-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Academic Info */}
            <div className="pt-6 border-t border-zinc-100 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-zinc-400 uppercase">Enrollment</p>
                <p className="text-xs font-mono font-bold text-zinc-800">{profileData.enrollment_number || "Not set"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-zinc-400 uppercase">Program</p>
                <p className="text-xs font-bold text-zinc-800">{profileData.major || "Not set"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-zinc-400 uppercase">Graduation</p>
                <p className="text-xs font-bold text-zinc-800">{profileData.grad_year ? `Class of ${profileData.grad_year}` : "Not set"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-zinc-400 uppercase">Contact</p>
                {profileData.bennett_email ? (
                  <a href={`mailto:${profileData.bennett_email}`} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                    Email <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-xs font-bold text-zinc-800">Not set</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default UserProfile;