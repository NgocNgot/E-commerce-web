"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBagIcon, UserIcon, MagnifyingGlassIcon, HeartIcon } from "@heroicons/react/24/outline";
import LoginModal from "./LoginModal";
import { useUser } from "@/context/UserContext";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { user, logout, login } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { assignCartToUser } = useCart()

  const handleLoginSuccess = (userData: any, token: string) => {
    login(userData, token)
    if (userData?.id) {
      localStorage.setItem('userId', JSON.stringify(userData.id));
      assignCartToUser(userData.id, token);
    }
    localStorage.setItem('token', token);

    setShowLoginModal(false);
  }

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 w-full z-50 border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <div className="flex items-center space-x-12">
          {/* Shop name */}
          <Link href="/" className="text-2xl font-bold text-rose-400 uppercase">
            Liceria
          </Link>
          <ul className="hidden md:flex space-x-6 text-gray-700 font-medium">
            <li>
              <Link href="#" className="hover:text-rose-400">
                Home
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-rose-400">
                Shop
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-rose-400">
                Blog
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-rose-400">
                Product
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-rose-400">
                Sale
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search is not runing */}
          <div className="flex items-center space-x-2 bg-gray-100 px-2 py-1 rounded-full">
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none px-2 text-gray-700 w-40"
            />
            <Link href="#" className="text-gray-600 hover:text-rose-400">
              <MagnifyingGlassIcon className="h-6 w-6" />
            </Link>
          </div>

          {/* Button login */}
          <div className="relative">
            <button
              onClick={() =>
                user ? setMenuOpen(!menuOpen) : setShowLoginModal(true)
              }
              className="text-gray-600 hover:text-rose-400"
            >
              <UserIcon className="h-6 w-6" />
            </button>

            {menuOpen && user && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 shadow-lg rounded-lg p-2">
                <p className="px-4 py-2 font-semibold">{user.name}</p>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-200"
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          <Link href="#" className="text-gray-600 hover:text-rose-400 relative">
            <HeartIcon className="h-6 w-6" />
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            className="text-gray-600 hover:text-rose-400 relative"
          >
            <ShoppingBagIcon className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* Login modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(user, token) => {
            console.log("Login successful:", user, token);

            login(user, token);
            console.log("User context updated:", user);

            if (user.id) {
              localStorage.setItem('userId', JSON.stringify(user.id));
              assignCartToUser(user.id, token);
            }
            setShowLoginModal(false);
          }}
        />
      )}
    </nav>
  );
}
