import React from 'react';
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-300 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Logo & Description */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">EduAuth</h2>
            <p className="text-gray-400">
              Fast, secure, and trusted verification of certificates. Helping students and recruiters worldwide.
            </p>
            <div className="flex space-x-4">
              {[FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="p-3 rounded-full bg-gray-700 hover:bg-blue-600 transition-all duration-300 text-white shadow-md hover:shadow-lg"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-1 md:gap-6">
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#how-it-works" className="hover:text-blue-500 transition-colors">How it Works</a></li>
                <li><a href="#features" className="hover:text-blue-500 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-blue-500 transition-colors">Pricing</a></li>
                <li><a href="#testimonials" className="hover:text-blue-500 transition-colors">Testimonials</a></li>
              </ul>
            </div>
            
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-2">Subscribe to Our Newsletter</h3>
            <p className="text-gray-400">Get the latest updates and insights delivered directly to your inbox.</p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-3 rounded-md flex-1 text-gray-900 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
              >
                Subscribe
              </button>
            </form>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-gray-700 pt-6 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} EduAuth. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
