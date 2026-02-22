import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/registrar', label: 'Registrar Merma', icon: '📝' },
    { path: '/registros', label: 'Registros', icon: '📋' },
    { path: '/admin', label: 'Administración', icon: '⚙️' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut, user } = useAuth();

    const handleNav = (path: string) => {
        navigate(path);
        onMobileClose();
    };

    return (
        <>
            <div className={`mobile-overlay ${mobileOpen ? 'active' : ''}`} onClick={onMobileClose} />
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">M</div>
                    <span className="sidebar-title collapsed-hide">MermasPro GT</span>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-label collapsed-hide">Navegación</div>
                    {navItems.map((item) => (
                        <div
                            key={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => handleNav(item.path)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="collapsed-hide">{item.label}</span>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="nav-item" onClick={() => signOut()} style={{ color: 'var(--color-text-tertiary)' }}>
                        <span className="nav-icon">🚪</span>
                        <span className="collapsed-hide">Cerrar sesión</span>
                    </div>
                    <div style={{ marginTop: '8px', padding: '0 10px' }}>
                        <div className="collapsed-hide" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
