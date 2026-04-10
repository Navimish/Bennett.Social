import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser, useSession } from "@clerk/clerk-react";
import { supabase } from '@/lib/supabase';
import { createClient } from "@supabase/supabase-js";
import { Bell, Heart, MessageCircle, CheckCheck, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// IMPORTANT: Import your new MobileNav here. 
// Adjust the path if you saved it in a different folder.
import { MobileNav } from './MobileNav.jsx'; 

// --- Inbox Icon Component ---
export function InboxIcon() {
  const { user, isSignedIn } = useUser();
  const { session } = useSession();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user?.id || !session) return;
    let channel;

    const fetchUnreadStatus = async () => {
      try {
        const supabaseToken = await session.getToken({ template: 'supabase' });
        const authSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
        );

        const { data } = await authSupabase
          .from('direct_messages')
          .select('id')
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .limit(1);

        setHasUnread(data && data.length > 0);
      } catch (err) {
        console.error(err);
      }
    };

    const setupRealtime = async () => {
      const supabaseToken = await session.getToken({ template: 'supabase' });
      supabase.realtime.setAuth(supabaseToken);

      channel = supabase
        .channel('unread_dms_listener')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          fetchUnreadStatus(); 
        })
        .subscribe();
    };

    fetchUnreadStatus();
    setupRealtime();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user?.id, isSignedIn, session]);

  return (
    <Link to="/inbox" className="relative text-zinc-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-all flex items-center justify-center group">
      <MessageSquare className="w-5 h-5 transition-transform group-active:scale-90" />
      {hasUnread && (
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </Link>
  );
}

// --- Notification Bell Component ---
export function NotificationBell() {
  const { user, isSignedIn } = useUser();
  const { session } = useSession(); 
  const navigate = useNavigate(); 
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user?.id || !session) return;
    let channel;

    const setupNotifications = async () => {
      try {
        const supabaseToken = await session.getToken({ template: 'supabase' });
        const authSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { 
            global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
            auth: { persistSession: false } 
          }
        );

        const { data } = await authSupabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (data) setNotifications(data);

        supabase.realtime.setAuth(supabaseToken);
        channel = supabase
          .channel('realtime-user_notifications')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'user_notifications', 
            filter: `user_id=eq.${user.id}` 
          }, (payload) => {
            setNotifications((prev) => [payload.new, ...prev]);
          })
          .subscribe();
      } catch (err) {
        console.error("System Error:", err);
      }
    };

    setupNotifications();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user?.id, isSignedIn, session]);

  const handleNotificationClick = (postId) => {
    setShowDropdown(false);
    navigate(`/?postId=${postId}`); 
  };

  const handleOpenDropdown = async () => {
    if (showDropdown) {
      setShowDropdown(false);
      setNotifications([]);
    } else {
      setShowDropdown(true);
      if (notifications.length > 0) {
        const supabaseToken = await session.getToken({ template: 'supabase' });
        const authSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { 
            global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
            auth: { persistSession: false }
          }
        );

        await authSupabase
          .from('user_notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleOpenDropdown}
        className="relative rounded-full text-zinc-600 hover:text-blue-600 hover:bg-blue-50 transition-all group"
      >
        <Bell className="w-5 h-5 transition-transform group-active:scale-90" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </Button>

      {showDropdown && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-zinc-100 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 bg-zinc-50/50 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold text-sm text-zinc-900">Notifications</h3>
            <CheckCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-10">All caught up!</p>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif.post_id)}
                  className="p-4 border-b border-zinc-50 hover:bg-blue-50/30 transition-colors flex gap-3 items-start cursor-pointer"
                >
                  <div className={`p-2 rounded-full ${notif.type === 'like' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                    {notif.type === 'like' ? <Heart className="w-4 h-4 fill-current" /> : <MessageCircle className="w-4 h-4 fill-current" />}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-800 leading-tight">
                      <span className="font-bold">{notif.actor_name}</span> {notif.type === 'like' ? 'liked your post.' : 'commented on your post.'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-widest">Just now</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN NAVBAR COMPONENT ---
export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/70 backdrop-blur-xl hover:shadow-sm hover:shadow-zinc-100 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        
        {/* --- LOGO, SIGNATURE & GLOW SECTION --- */}
        <div className="flex-1 flex items-center gap-2 md:gap-3">
          
          {/* MOBILE HAMBURGER MENU */}
          <MobileNav />

          {/* Custom SVG Logo Bubble with Restore GLOW effect */}
          <div className="w-9 h-9 relative flex-shrink-0 group">
            <div className="absolute inset-0 bg-blue-600 rounded-xl rotate-[-10deg] shadow-[0_4px_14px_rgba(37,99,235,0.4)] group-hover:rotate-0 group-hover:shadow-[0_6px_20px_rgba(37,99,235,0.6)] transition-all duration-300"></div>
            <svg 
              viewBox="0 0 100 100" 
              className="absolute inset-2 w-5 h-5 fill-white group-hover:scale-105 transition-transform"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="20" y="15" width="15" height="70" rx="5"/>
              <path d="M35 15 h30 a20 20 0 0 1 0 40 h-30 z"/>
              <path d="M35 45 h35 a22 22 0 0 1 0 44 h-35 z" opacity="0.8"/>
              <circle cx="85" cy="25" r="8" fill="#93C5FD" className="animate-pulse" />
              <circle cx="85" cy="75" r="8" fill="#DBEAFE"/>
            </svg>
          </div>

          <div className="flex flex-col justify-center">
            <Link to="/" className="text-xl font-black tracking-tighter text-zinc-950 leading-none group">
              Bennett<span className="text-blue-600 group-hover:text-blue-500 transition-colors">Social</span>
            </Link>
            <a 
              href="https://www.linkedin.com/in/navneet-mishra-320081249/" 
              target="_blank" 
              rel="noreferrer"
              className="hidden sm:block text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400 hover:text-blue-600 transition-colors mt-1 ml-0.5"
            >
              by Navneet Mishra
            </a>
          </div>
        </div>

        {/* Center Navigation Links (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: 'Home', path: '/' },
            { label: 'Network', path: '/network' },
            { label: 'Communities', path: '/communities' },
          ].map((link) => (
            <Link 
              key={link.path}
              to={link.path} 
              className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
            >
              {link.label}
            </Link>
          ))}
          <Link to="/createPost" className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-1.5 active:scale-95 flex-shrink-0">
            <Plus className="w-4 h-4" />
            <span>Post</span>
          </Link>
        </div>

        {/* Right Side Actions */}
        <div className="flex-1 flex justify-end items-center gap-2 md:gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" className="text-sm font-bold text-zinc-700">Sign In</Button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <div className="flex items-center gap-0 md:gap-1">
              <InboxIcon />
              <NotificationBell />
            </div>
            
            <div className="w-px h-6 bg-zinc-200 mx-1 md:mx-2 hidden sm:block" />
            
            <Link 
              to="/profile" 
              className="hidden md:block text-sm font-bold text-zinc-700 hover:text-blue-600 transition-colors mr-1"
            >
              Profile
            </Link>
            
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8 md:w-9 md:h-9 border-2 border-white shadow-sm hover:scale-105 transition-transform"
                }
              }}
              afterSignOutUrl="/" 
            />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}