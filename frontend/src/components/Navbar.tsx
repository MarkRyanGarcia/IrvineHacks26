import { X, Menu } from "lucide-react"
import { useState } from "react"
import { 
  SignInButton, 
  UserButton, 
  SignedIn, 
  SignedOut 
} from "@clerk/clerk-react" // or @clerk/nextjs if using Next.js

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false)
  
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-lg font-inter tracking-tight text-white">
            realease.
          </a>
  
          {/* Desktop Links */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground">
              How It Works
            </a>
            <a href="#demo" className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground">
              Demo
            </a>
          </div>
  
          {/* Clerk Auth Section */}
          <div className="hidden md:block">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#FF6200] transition-opacity duration-300 hover:opacity-90">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-10 h-10"
                  }
                }}
              />
            </SignedIn>
          </div>
  
          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
  
        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-4">
              <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground">Features</a>
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground">How It Works</a>
              <a href="#demo" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground">Demo</a>
              
              <div className="pt-2">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="inline-flex w-full justify-center items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#FF6200]">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-3">
                    <UserButton afterSignOutUrl="/" />
                    <span className="text-sm text-white">Account</span>
                  </div>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </header>
    )
}