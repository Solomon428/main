'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });
      
      if (response.ok) {
        // Clear local storage if used
        localStorage.removeItem('auth-token');
        // Redirect to login
        router.push('/login');
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
            CreditorFlow
          </Link>
          
          <div className="hidden md:flex gap-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600">
              Dashboard
            </Link>
            <Link href="/invoices" className="text-gray-700 hover:text-indigo-600">
              Invoices
            </Link>
            <Link href="/suppliers" className="text-gray-700 hover:text-indigo-600">
              Suppliers
            </Link>
            <Link href="/approvals" className="text-gray-700 hover:text-indigo-600">
              Approvals
            </Link>
            <Link href="/reports" className="text-gray-700 hover:text-indigo-600">
              Reports
            </Link>
            <Link href="/team" className="text-gray-700 hover:text-indigo-600">
              Team
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Sign Out
          </button>
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="flex flex-col gap-2 p-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 py-2" onClick={() => setIsMenuOpen(false)}>
              Dashboard
            </Link>
            <Link href="/invoices" className="text-gray-700 hover:text-indigo-600 py-2" onClick={() => setIsMenuOpen(false)}>
              Invoices
            </Link>
            <Link href="/suppliers" className="text-gray-700 hover:text-indigo-600 py-2" onClick={() => setIsMenuOpen(false)}>
              Suppliers
            </Link>
            <Link href="/approvals" className="text-gray-700 hover:text-indigo-600 py-2" onClick={() => setIsMenuOpen(false)}>
              Approvals
            </Link>
            <Link href="/reports" className="text-gray-700 hover:text-indigo-600 py-2" onClick={() => setIsMenuOpen(false)}>
              Reports
            </Link>
            <Link href="/team" className="text-gray-700 hover:text-indigo-600 py-2" onClick={() => setIsMenuOpen(false)}>
              Team
            </Link>
            <button
              onClick={() => {
                handleSignOut();
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 mt-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
