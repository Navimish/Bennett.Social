import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Home, Users, Compass, PlusSquare, User } from "lucide-react";
import { Link } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center mr-1">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-zinc-600 hover:bg-blue-50 hover:text-blue-600">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] bg-white border-r border-zinc-200">
          <div className="flex flex-col justify-between h-full py-6">
            <div className="flex flex-col gap-6 mt-4">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-4 text-lg font-semibold text-zinc-700 hover:text-blue-600 transition-colors">
                <Home className="w-5 h-5" /> Home Feed
              </Link>
              
              <SignedIn>
                <Link to="/network" onClick={() => setOpen(false)} className="flex items-center gap-4 text-lg font-semibold text-zinc-700 hover:text-blue-600 transition-colors">
                  <Users className="w-5 h-5" /> Network
                </Link>
                <Link to="/communities" onClick={() => setOpen(false)} className="flex items-center gap-4 text-lg font-semibold text-zinc-700 hover:text-blue-600 transition-colors">
                  <Compass className="w-5 h-5" /> Communities
                </Link>
                <Link to="/createPost" onClick={() => setOpen(false)} className="flex items-center gap-4 text-lg font-semibold text-zinc-700 hover:text-blue-600 transition-colors">
                  <PlusSquare className="w-5 h-5" /> Create Post
                </Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-4 text-lg font-semibold text-zinc-700 hover:text-blue-600 transition-colors">
                  <User className="w-5 h-5" /> Profile
                </Link>
              </SignedIn>
            </div>
            
            <div className="mt-auto">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">BennettSocial</p>
              <p className="text-[10px] text-zinc-500">Built by Navneet Mishra</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}