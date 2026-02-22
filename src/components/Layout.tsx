import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />
            <div className="main-content">
                {/* Mobile menu button */}
                <div className="page-header" style={{ display: 'none' }} id="mobile-menu-header">
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{ fontSize: '18px' }}
                    >
                        ☰
                    </button>
                </div>
                <style>{`
          @media (max-width: 768px) {
            #mobile-menu-header { display: flex !important; }
          }
        `}</style>
                <Outlet />
            </div>
        </div>
    );
}
