'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Star, Calendar, Eye, Clock } from 'lucide-react'
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
  viewCount,
  chaptersCount,
  lastUpdated
}: MangaCardProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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

  const getStatusConfig = (status: string) => {
    const configs = {
      ongoing: {
        bg: 'bg-emerald-500/30',
        text: 'text-emerald-100',
        border: 'border-emerald-400/50',
        dot: 'bg-emerald-400'
      },
      completed: {
        bg: 'bg-blue-500/30',
        text: 'text-blue-100', 
        border: 'border-blue-400/50',
        dot: 'bg-blue-400'
      },
      hiatus: {
        bg: 'bg-amber-500/30',
        text: 'text-amber-100',
        border: 'border-amber-400/50', 
        dot: 'bg-amber-400'
      },
      cancelled: {
        bg: 'bg-red-500/30',
        text: 'text-red-100',
        border: 'border-red-400/50',
        dot: 'bg-red-400'
      }
    }
    return configs[status?.toLowerCase() as keyof typeof configs] || {
      bg: 'bg-slate-500/30',
      text: 'text-slate-100',
      border: 'border-slate-400/50',
      dot: 'bg-slate-400'
    }
  }

  const getContentRatingConfig = (rating: string) => {
    const configs = {
      safe: { 
        bg: 'bg-green-500/30', 
        text: 'text-green-100', 
        border: 'border-green-400/50'
      },
      suggestive: { 
        bg: 'bg-amber-500/30', 
        text: 'text-amber-100', 
        border: 'border-amber-400/50'
      },
      erotica: { 
        bg: 'bg-red-500/30', 
        text: 'text-red-100', 
        border: 'border-red-400/50'
      },
      nsfw: { 
        bg: 'bg-red-500/30', 
        text: 'text-red-100', 
        border: 'border-red-400/50'
      }
    }
    return configs[rating?.toLowerCase() as keyof typeof configs] || {
      bg: 'bg-slate-500/30',
      text: 'text-slate-100',
      border: 'border-slate-400/50'
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
          <div className="relative bg-white dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/25 group-hover:-translate-y-1 group-hover:scale-[1.02]">
            
            {/* Image Container */}
            <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              <Image
                src={posterUrl || "/placeholder.svg"}
                alt={title}
                fill
                className={`object-cover transition-all duration-500 ${imageLoaded ? 'scale-100 opacity-100' : 'scale-110 opacity-0'} group-hover:scale-105`}
                onLoad={() => setImageLoaded(true)}
                unoptimized
                priority
              />
              
              {/* Subtle Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-50 group-hover:opacity-30 transition-opacity duration-300" />
              
              {/* Add Button - Top Right */}
              {showAddButton && (
                <div className={`absolute top-3 right-3 z-20 transition-all duration-300 ${isHovered ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}>
                  <Button
                    onClick={handleAddClick}
                    size="icon"
                    className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-sm hover:scale-110 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Status Badge - Top Left */}
              {status && statusConfig && (
                <div className="absolute top-3 left-3 z-10">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} transition-all duration-300`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {status}
                    </span>
                  </div>
                </div>
              )}

              {/* Rating Badge - Bottom Left */}
              {rating && (
                <div className="absolute bottom-3 left-3 z-10">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white border border-white/20">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold">{rating}</span>
                  </div>
                </div>
              )}

              {/* Content Rating Badge - Bottom Right */}
              {contentRating && ratingConfig && (
                <div className="absolute bottom-3 right-3 z-10">
                  <div className={`px-2.5 py-1.5 rounded-lg backdrop-blur-sm ${ratingConfig.bg} ${ratingConfig.text} border ${ratingConfig.border} transition-all duration-300`}>
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {contentRating}
                    </span>
                  </div>
                </div>
              )}

              {/* Stats Overlay - Center Bottom */}
              {(viewCount || chaptersCount) && (
                <div className="absolute bottom-12 left-3 z-10 flex gap-2">
                  {viewCount && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white/90 text-xs border border-white/20">
                      <Eye className="w-3 h-3" />
                      <span className="font-medium">{viewCount > 1000 ? `${(viewCount/1000).toFixed(1)}k` : viewCount}</span>
                    </div>
                  )}
                  {chaptersCount && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white/90 text-xs border border-white/20">
                      <span className="font-medium">{chaptersCount}ch</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-3 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900/95 dark:to-slate-900/80">
              {/* Title */}
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                {title}
              </h3>
              
              {/* Manga Info Row */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                {year && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span className="font-medium">{year}</span>
                  </div>
                )}
                
                {lastUpdated && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">{lastUpdated}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}

              {/* Genres */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.slice(0, 3).map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-md font-medium border-0 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
                    >
                      {genre}
                    </Badge>
                  ))}
                  {genres.length > 3 && (
                    <Badge
                      variant="outline"
                      className="bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-md font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                    >
                      +{genres.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Subtle Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:via-blue-500/5 group-hover:to-purple-500/5 transition-all duration-500 rounded-2xl pointer-events-none" />
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