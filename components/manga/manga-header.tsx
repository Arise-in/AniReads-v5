'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  Star,
  Calendar,
  User,
  Book,
  BookOpen,
  Share2,
  Bookmark as BookmarkIcon,
  Play,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import LibraryStatusSelector from '@/components/library/library-status-selector'
import { useBookmark } from '@/hooks/useBookmark'
import { toast } from 'sonner'
import { KitsuManga } from '@/lib/kitsu-api'
import { Chapter } from '@/lib/mangadx-api'

interface MangaHeaderProps {
  kitsuManga: KitsuManga | null
  mangaData: {
    manga_id: string
    manga_title: string
    manga_slug: string
    poster_url: string
    total_chapters: number | undefined
  }
  mangaSlug: string
  chapters: Chapter[]
}

export default function MangaHeader({ kitsuManga, mangaData, mangaSlug, chapters }: MangaHeaderProps) {
  const { isBookmarked, isLoading: isBookmarkLoading, toggleBookmark } = useBookmark(mangaData.manga_id)

  const posterUrl = mangaData.poster_url
  const title = mangaData.manga_title
  const authors = kitsuManga?.relationships?.staff?.data?.map((s: any) => s.attributes?.name || 'Unknown') || []

  const handleBookmarkToggle = async () => {
    const bookmarkData = {
      id: mangaData.manga_id,
      title: title,
      slug: mangaSlug,
      posterUrl: posterUrl,
      type: 'manga' as const,
    }
    const wasBookmarked = isBookmarked
    const success = await toggleBookmark(bookmarkData)
    if (success) {
      toast.success(wasBookmarked ? 'Bookmark removed' : 'Manga bookmarked')
    } else {
      toast.error('Failed to update bookmark')
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: title,
      text: `Check out ${title} on AniReads!`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const firstChapterId = chapters[0]?.id
  const averageRating = kitsuManga?.attributes.averageRating
  const status = kitsuManga?.attributes.status
  const startDate = kitsuManga?.attributes.startDate
  const chapterCount = kitsuManga?.attributes.chapterCount || chapters.length

  return (
    <div className="space-y-6">
      {/* Poster Card */}
      <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <div className="relative w-full aspect-[3/4] rounded-t-lg overflow-hidden">
              <Image 
                src={posterUrl || '/placeholder.svg'} 
                alt={title} 
                fill 
                className="object-cover transition-transform duration-500 hover:scale-105" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Rating Badge */}
              {averageRating && (
                <div className="absolute top-3 left-3">
                  <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-white text-sm font-bold">
                      {Number.parseFloat(averageRating).toFixed(1)}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Badge */}
              {status && (
                <div className="absolute top-3 right-3">
                  <Badge 
                    className={`${
                      status === 'finished' ? 'bg-green-600/90' :
                      status === 'publishing' ? 'bg-blue-600/90' :
                      status === 'hiatus' ? 'bg-yellow-600/90' :
                      'bg-gray-600/90'
                    } text-white border-0`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              )}

              {/* Quick Stats */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-white text-sm">
                    <div className="flex items-center gap-1">
                      <Book className="w-4 h-4" />
                      <span>{chapterCount || '?'} Ch.</span>
                    </div>
                    {startDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(startDate).getFullYear()}</span>
                      </div>
                    )}
                  </div>
                  
                  {kitsuManga?.attributes.popularityRank && (
                    <div className="flex items-center gap-1 text-orange-400 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      <span>#{kitsuManga.attributes.popularityRank} Popular</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Primary Actions */}
        <div className="space-y-2">
          {firstChapterId && (
            <Button asChild size="lg" className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg">
              <Link href={`/reader/${mangaSlug}/1?chapter=${firstChapterId}`}>
                <Play className="w-5 h-5 mr-2" />
                Start Reading
              </Link>
            </Button>
          )}
          
          <LibraryStatusSelector mangaData={mangaData} onStatusChange={() => {}} />
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={handleBookmarkToggle}
            disabled={isBookmarkLoading}
            className="border-gray-600 hover:border-blue-500 text-gray-300 hover:text-blue-400"
          >
            <BookmarkIcon className={`w-4 h-4 mr-2 ${isBookmarked ? 'text-blue-400 fill-current' : ''}`} />
            {isBookmarked ? 'Saved' : 'Save'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleShare}
            className="border-gray-600 hover:border-green-500 text-gray-300 hover:text-green-400"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-3">Information</h3>
          
          <div className="space-y-2 text-sm">
            {authors.length > 0 && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-400">Author:</span>
                  <span className="text-white ml-2">{authors.join(', ')}</span>
                </div>
              </div>
            )}
            
            {startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-400" />
                <div>
                  <span className="text-gray-400">Published:</span>
                  <span className="text-white ml-2">{new Date(startDate).getFullYear()}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Book className="w-4 h-4 text-red-400" />
              <div>
                <span className="text-gray-400">Chapters:</span>
                <span className="text-white ml-2">{chapterCount || chapters.length || 'Unknown'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-400" />
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-white ml-2 capitalize">{status || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reading Progress (if available) */}
      <Card className="bg-gradient-to-r from-red-600/10 to-orange-600/10 border-red-600/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-semibold">Continue Reading</span>
          </div>
          <p className="text-gray-300 text-sm">
            Pick up where you left off or start your journey with this amazing manga!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}