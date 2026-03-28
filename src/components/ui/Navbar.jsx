import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

export function Navbar() {
  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md text-zinc-100">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* 1. Left Section: Logo */}
          <div className="flex-1 flex justify-start">
            <Link to="/" className="text-xl font-bold tracking-tight hover:text-blue-400 transition-colors">
              Bennett<span className="text-blue-500">-</span>Social
            </Link>
          </div>

          {/* 2. Middle Section: Navigation Links (Centered) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/" className="hover:text-blue-400 transition-colors">
              Home
            </Link>
            <Link to="/createPost" className="hover:text-blue-400 transition-colors">
              Add Post
            </Link>
            <Link to="/communities" className="hover:text-blue-400 transition-colors">
              Communities
            </Link>
            <Link to="/create-community" className="hover:text-blue-400 transition-colors">
              Create Community
            </Link>
          </div>

          {/* 3. Right Section: Clerk Auth Buttons */}
          <div className="flex-1 flex justify-end items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-medium hover:text-blue-400 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              <Link 
                to="/profile" 
                className="bg-zinc-100 text-zinc-950 px-4 py-1.5 rounded-full hover:bg-zinc-300 transition-all font-semibold text-xs"
              >
                Profile
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

        </div>
      </nav>
    </>
  );
}