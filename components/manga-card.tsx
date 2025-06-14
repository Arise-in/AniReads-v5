'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Star, Calendar, Eye, Bookmark, Heart, Share2, TrendingUp, Users, Clock } from 'lucide-react'
import QuickAddDialog from '@/components/library/quick-add-dialog'
import { getPrimaryEnglishTitle } from '@/lib/mangadx-api'
import { titleToSlug } from '@/lib/slugify'

interface MangaCardProps {
  id: string
  title?: string
  slug?: string
  posterUrl: string
  coverUrl?: string
  description?: string
  rating?: string | number
  status?: string
  year?: number
  contentRating?: string
  showAddButton?: boolean
  className?: string
  genres?: string[]
  manga?: any
  isBookmarked?: boolean
  isLiked?: boolean
  viewCount?: number
  chaptersCount?: number
  lastUpdated?: string
}

export default function MangaCard({
  id,
  title: propTitle,
  slug,
  posterUrl,
  coverUrl = '',
  description = '',
  rating,
  status,
  year,
  contentRating,
  showAddButton = true,
  className = '',
  genres = [],
  manga,
  isBookmarked = false,
  isLiked = false,
  viewCount,
  chaptersCount,
  lastUpdated
}: MangaCardProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [liked, setLiked] = useState(isLiked)

  const title = manga ? getPrimaryEnglishTitle(manga) : (propTitle || 'Unknown Title')
  const linkHref = `/manga/${id}`

  const mangaData = {
    manga_id: id,
    manga_title: title,
    manga_slug: id,
    poster_url: posterUrl,
    cover_url: coverUrl,
    description: description,
    year: year,
    content_rating: contentRating || ''
  }
  
  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowQuickAdd(true)
  }

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setBookmarked(!bookmarked)
  }

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked(!liked)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      ongoing: {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-400/50',
        glow: 'shadow-emerald-500/25',
        dot: 'bg-emerald-400'
      },
      completed: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400', 
        border: 'border-blue-400/50',
        glow: 'shadow-blue-500/25',
        dot: 'bg-blue-400'
      },
      hiatus: {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        border: 'border-amber-400/50', 
        glow: 'shadow-amber-500/25',
        dot: 'bg-amber-400'
      },
      cancelled: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-400/50',
        glow: 'shadow-red-500/25',
        dot: 'bg-red-400'
      }
    }
    return configs[status?.toLowerCase() as keyof typeof configs] || {
      bg: 'bg-slate-500/20',
      text: 'text-slate-400',
      border: 'border-slate-400/50',
      glow: 'shadow-slate-500/25',
      dot: 'bg-slate-400'
    }
  }

  const getContentRatingConfig = (rating: string) => {
    const configs = {
      safe: { 
        bg: 'bg-green-500/20', 
        text: 'text-green-400', 
        border: 'border-green-400/50',
        glow: 'shadow-green-500/25'
      },
      suggestive: { 
        bg: 'bg-amber-500/20', 
        text: 'text-amber-400', 
        border: 'border-amber-400/50',
        glow: 'shadow-amber-500/25'
      },
      erotica: { 
        bg: 'bg-red-500/20', 
        text: 'text-red-400', 
        border: 'border-red-400/50',
        glow: 'shadow-red-500/25'
      },
      nsfw: { 
        bg: 'bg-red-500/20', 
        text: 'text-red-400', 
        border: 'border-red-400/50',
        glow: 'shadow-red-500/25'
      }
    }
    return configs[rating?.toLowerCase() as keyof typeof configs] || {
      bg: 'bg-slate-500/20',
      text: 'text-slate-400',
      border: 'border-slate-400/50',
      glow: 'shadow-slate-500/25'
    }
  }

  const statusConfig = status ? getStatusConfig(status) : null
  const ratingConfig = contentRating ? getContentRatingConfig(contentRating) : null

  return (
    <>
      <div 
        className={`group relative ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link href={linkHref} className="block">
          {/* Main Card Container */}
          <div className="relative bg-white dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-700/60 transition-all duration-500 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-900/15 dark:hover:shadow-black/30 group-hover:-translate-y-2 group-hover:scale-[1.02]">
            
            {/* Image Container */}
            <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              <Image
                src={posterUrl || "/placeholder.svg"}
                alt={title}
                fill
                className={`object-cover transition-all duration-700 ${imageLoaded ? 'scale-100 opacity-100' : 'scale-110 opacity-0'} group-hover:scale-110 group-hover:brightness-105`}
                onLoad={() => setImageLoaded(true)}
                unoptimized
                priority
              />
              
              {/* Sophisticated Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 via-transparent to-slate-900/30 group-hover:from-purple-900/10 group-hover:to-blue-900/10 transition-all duration-700" />
              
              {/* Status Badge - Top Left */}
              {status && statusConfig && (
                <div className="absolute top-4 left-4 z-10">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} shadow-lg ${statusConfig.glow} transition-all duration-300`}>
                    <div className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse`} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {status}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons - Top Right */}
              <div className={`absolute top-4 right-4 z-10 flex gap-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                {/* Bookmark Button */}
                <Button
                  onClick={handleBookmarkClick}
                  size="icon"
                  className={`w-9 h-9 rounded-lg backdrop-blur-md border transition-all duration-200 ${
                    bookmarked 
                      ? 'bg-blue-500/30 border-blue-400/50 text-blue-400 shadow-lg shadow-blue-500/25' 
                      : 'bg-black/20 border-white/20 text-white hover:bg-black/30'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                </Button>

                {/* Like Button */}
                <Button
                  onClick={handleLikeClick}
                  size="icon"
                  className={`w-9 h-9 rounded-lg backdrop-blur-md border transition-all duration-200 ${
                    liked 
                      ? 'bg-red-500/30 border-red-400/50 text-red-400 shadow-lg shadow-red-500/25' 
                      : 'bg-black/20 border-white/20 text-white hover:bg-black/30'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Rating - Center Left */}
              {rating && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <div className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white shadow-lg border border-white/10">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold">{rating}</span>
                  </div>
                </div>
              )}

              {/* Add to Library Button - Center Right */}
              {showAddButton && (
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
                  <Button
                    onClick={handleAddClick}
                    size="icon"
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Content Rating Badge - Bottom Right */}
              {contentRating && ratingConfig && (
                <div className="absolute bottom-4 right-4 z-10">
                  <div className={`px-3 py-2 rounded-xl backdrop-blur-md ${ratingConfig.bg} ${ratingConfig.text} border ${ratingConfig.border} shadow-lg ${ratingConfig.glow} transition-all duration-300`}>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {contentRating}
                    </span>
                  </div>
                </div>
              )}

              {/* Stats - Bottom Left */}
              <div className="absolute bottom-4 left-4 z-10 flex gap-2">
                {viewCount && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white/90 text-xs">
                    <Eye className="w-3 h-3" />
                    <span className="font-medium">{viewCount > 1000 ? `${(viewCount/1000).toFixed(1)}k` : viewCount}</span>
                  </div>
                )}
                {chaptersCount && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white/90 text-xs">
                    <span className="font-medium">{chaptersCount}ch</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="relative p-5 space-y-4 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-900/60">
              {/* Title */}
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight line-clamp-2 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-300">
                {title}
              </h3>
              
              {/* Description */}
              {description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed font-medium">
                  {description}
                </p>
              )}

              {/* Genres */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.slice(0, 3).map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-lg font-semibold border-0 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
                    >
                      {genre}
                    </Badge>
                  ))}
                  {genres.length > 3 && (
                    <Badge
                      variant="outline"
                      className="bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs px-2.5 py-1 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                    >
                      +{genres.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Enhanced Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  {year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{year}</span>
                    </div>
                  )}
                  
                  {lastUpdated && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{lastUpdated}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors duration-300" />
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300" />
                </div>
              </div>
            </div>

            {/* Premium Hover Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-blue-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:via-blue-500/5 group-hover:to-pink-500/5 transition-all duration-700 rounded-2xl pointer-events-none" />
            
            {/* Shimmer Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out" />
            </div>
          </div>
        </Link>
      </div>

      <QuickAddDialog
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        mangaData={mangaData}
      />
    </>
  )
}