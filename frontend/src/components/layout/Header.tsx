import React from 'react';
import { Menu, PlusCircle, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isOwner = role === 'owner';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 rounded-lg lg:hidden hover:bg-slate-100 hover:text-slate-700"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 font-medium bg-slate-100 text-slate-600 rounded-md">
            PKR (Rs.)
          </span>
          <span className="text-xs text-slate-400 font-medium">• Pakistani Optics Management</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick New Sale button */}
        <button
          onClick={() => navigate('/sales/new')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-600/20 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>New Sale</span>
        </button>

        {/* User Info Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-slate-500 font-medium capitalize">
              {isOwner ? 'Store Owner' : 'Optician Staff'}
            </p>
          </div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${
              isOwner ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800'
            }`}
          >
            {user?.role === 'owner' ? 'OW' : 'ST'}
          </div>
        </div>
      </div>
    </header>
  );
};
