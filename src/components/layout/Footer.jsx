import React from 'react'

const Footer = () => {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 py-2 mt-auto">
      <div className="max-w-full px-4">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Security & Safety Portal. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
