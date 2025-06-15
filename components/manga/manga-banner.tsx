'use client'

import Image from 'next/image'
import { useState } from 'react'

interface MangaBannerProps {
  coverUrl: string | null
  posterUrl?: string | null
  title: string
}

export default function MangaBanner({ coverUrl, posterUrl, title }: MangaBannerProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Use poster as fallback if cover is not available
  const displayImage = coverUrl || posterUrl

  return (
    <div className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        {displayImage && !imageError ? (
          <Image
            src={displayImage}
            alt={`${title} banner`}
            fill
            className={`object-cover object-center transition-all duration-700 ${
              imageLoaded ? 'scale-100 opacity-100' : 'scale-110 opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            unoptimized
            priority
          />
        ) : (
          // Fallback gradient background
          <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
        )}
      </div>
      
      {/* Gradient Overlays for better blending */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/40 via-transparent to-gray-900/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>
      
      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent drop-shadow-2xl">
                {title}
              </span>
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
      
      {/* Bottom blend effect */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-900 to-transparent" />
    </div>
  )
}