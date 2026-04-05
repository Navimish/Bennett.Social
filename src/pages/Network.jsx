import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Briefcase, GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Network() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchNetwork();
  }, []);

  const fetchNetwork = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .not("username", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching network:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.skills?.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesStatus =
      statusFilter === "All" || profile.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    // THEME: Global background slate-50
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
        
        {/* Header & Filters */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Student Network
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Find teammates, study buddies, and connect with peers at Bennett.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, username, or skills (e.g. React)..."
                className="pl-11 h-12 bg-white border-slate-200/60 rounded-2xl shadow-sm focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full md:w-[280px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 bg-white border-slate-200/60 rounded-2xl shadow-sm font-bold text-slate-700">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Just Browsing">👀 Just Browsing</SelectItem>
                  <SelectItem value="Looking for Hackathon Members">💻 Hackathon Team</SelectItem>
                  <SelectItem value="Looking for Project Members">🛠️ Project Team</SelectItem>
                  <SelectItem value="Looking for Startup Members">🚀 Startup Team</SelectItem>
                  <SelectItem value="Looking for Carpooling">🚗 Carpooling</SelectItem>
                  <SelectItem value="Looking for a Study Buddy">📚 Study Buddy</SelectItem>
                  <SelectItem value="Available to Mentor">🧠 Available to Mentor</SelectItem>
                  <SelectItem value="Seeking a Mentor">🔍 Seeking a Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Profile Grid */}
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-24 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
              No results found
            </p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/user/${profile.username.replace("@", "")}`}
                className="block h-full group"
              >
                <Card className="h-full overflow-hidden border-slate-200/60 hover:border-blue-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 rounded-[2rem] bg-white flex flex-col hover:-translate-y-1">
                  
                  {/* Glassy Banner - Gradient replacement for plain black */}
                  <div className="h-20 bg-gradient-to-br from-slate-100 to-slate-200/50 relative group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-colors">
                    <div className="absolute top-4 right-4 px-2.5 py-1 bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-full text-[9px] font-black text-slate-700 uppercase tracking-tight flex items-center gap-1.5 shadow-sm">
                      <div className={`w-1.5 h-1.5 rounded-full ${profile.status?.includes("Looking") ? "bg-green-500 animate-pulse" : "bg-blue-500"}`} />
                      {profile.status || "Browsing"}
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex-1 flex flex-col relative">
                    {/* Avatar with Lifted shadow */}
                    <Avatar className="w-16 h-16 border-4 border-white shadow-[0_4px_10px_rgb(0,0,0,0.1)] bg-white -mt-8 mb-4 transition-transform group-hover:scale-110 duration-500">
                      <AvatarImage src={profile.avatar_url} className="object-cover" />
                      <AvatarFallback className="text-xl font-black bg-blue-50 text-blue-600">
                        {profile.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Basic Info */}
                    <div className="mb-4">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight text-lg">
                        {profile.full_name}
                      </h3>
                      <p className="text-xs text-blue-600/70 font-bold uppercase tracking-tight">
                        {profile.username}
                      </p>
                    </div>

                    {/* Academic Info */}
                    {profile.major && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-4">
                        <GraduationCap className="w-4 h-4 text-slate-400" />
                        <span className="truncate">
                          {profile.major} {profile.grad_year && `'${profile.grad_year.toString().slice(2)}`}
                        </span>
                      </div>
                    )}

                    <div className="flex-1" />

                    {/* Skill Tags - Refined "Glass" style */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-1.5">
                        {profile.skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg text-[10px] font-black uppercase tracking-tighter"
                          >
                            {skill}
                          </span>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black">
                            +{profile.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Network;