import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function AppLayout(){
    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto p-4 md:p-6">
                <Outlet />
            </main>
        </div>
    )
}