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
      // Fetch all users who have set up a profile (has a username)
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

  // Real-time filtering logic
  const filteredProfiles = profiles.filter((profile) => {
    // 1. Check Search Query (matches name, username, or skills)
    const matchesSearch =
      profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.skills?.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    // 2. Check Status Filter
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
    <div className="max-w-6xl mx-auto p-6 mt-4 space-y-8">
      {/* Header & Filters */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
            Student Network
          </h1>
          <p className="text-zinc-500">
            Find teammates, study buddies, and connect with peers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search by name, username, or skills (e.g. React, Python)..."
              className="pl-9 bg-white border-zinc-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-[250px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white border-zinc-200 font-medium">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Just Browsing">👀 Just Browsing</SelectItem>
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
        </div>
      </div>

      {/* Profile Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="text-center py-20 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
          <p className="text-zinc-500 font-medium">
            No students found matching your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <Link
              key={profile.id}
              to={`/user/${profile.username.replace("@", "")}`}
            >
              <Card className="overflow-hidden border-zinc-200 hover:border-blue-300 hover:shadow-md transition-all group bg-white cursor-pointer h-full flex flex-col">
                {/* Card Banner */}
                <div className="h-16 bg-zinc-900 relative">
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[8px] font-bold text-white uppercase tracking-tighter flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${profile.status === "Looking for Hackathon Team" ? "bg-green-400 animate-pulse" : "bg-blue-400"}`}
                    />
                    {profile.status || "Just Browsing"}
                  </div>
                </div>

                <div className="px-5 pb-5 flex-1 flex flex-col">
                  {/* Avatar */}
                  <Avatar className="w-16 h-16 border-4 border-white shadow-sm bg-white -mt-8 mb-3">
                    <AvatarImage
                      src={profile.avatar_url}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xl font-bold bg-blue-50 text-blue-600">
                      {profile.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="mb-4">
                    <h3 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {profile.full_name}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      {profile.username}
                    </p>
                  </div>

                  {/* Program */}
                  {profile.major && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium mb-3">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                      {profile.major}{" "}
                      {profile.grad_year &&
                        `'${profile.grad_year.toString().slice(2)}`}
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* Skills Snippet */}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5">
                      {profile.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-[10px] font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                      {profile.skills.length > 3 && (
                        <span className="px-2 py-1 bg-zinc-50 text-zinc-400 rounded text-[10px] font-bold">
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
  );
}

export default Network;
