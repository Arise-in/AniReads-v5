'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Chapter } from '@/lib/mangadx-api'
import { KitsuManga, getBestKitsuTitle } from '@/lib/kitsu-api'
import { Star, Calendar, User, Book, List, ChevronDown, BookOpen, Share2, Bookmark as BookmarkIcon, Download, Clock, Eye, TrendingUp, Filter } from 'lucide-react'
import { useBookmark } from '@/hooks/useBookmark'
import { toast } from 'sonner'

interface MangaDetailsProps {
  kitsuManga: KitsuManga | null
  chapters: Chapter[]
  mangaSlug: string
}

function Synopsis({ description, genres }: { description: string; genres: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLongDescription = description.length > 400

  return (
    <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border-gray-700/30 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-3 text-xl">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Book className="w-5 h-5 text-red-400" />
          </div>
          Synopsis & Genres
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="prose prose-invert prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-white max-w-none">
          <div
            className={`relative transition-all duration-300 ${
              !isExpanded && isLongDescription ? 'max-h-32 overflow-hidden' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: description }}
          />
          {!isExpanded && isLongDescription && (
            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent pointer-events-none" />
          )}
        </div>
        
        {isLongDescription && (
          <Button 
            variant="ghost" 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        )}
        
        {genres.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-white font-medium text-sm uppercase tracking-wide">Genres</h4>
            <div className="flex flex-wrap gap-2">
              {genres.map(genre => (
                <Badge 
                  key={genre} 
                  variant="secondary" 
                  className="bg-gray-700/50 text-gray-200 hover:bg-gray-600/60 border border-gray-600/30 transition-colors duration-200 px-3 py-1"
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChapterList({ chapters, mangaSlug, mangaTitle }: { chapters: Chapter[]; mangaSlug: string; mangaTitle: string }) {
  const [visibleChapters, setVisibleChapters] = useState(20)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleDownloadChapter = async (chapter: Chapter) => {
    try {
      const response = await fetch(`/api/proxy/mangadx/at-home/server/${chapter.id}`)
      const pagesData = await response.json()
      
      if (!pagesData.chapter?.data) {
        toast.error('Failed to get chapter pages')
        return
      }

      const baseUrl = pagesData.baseUrl
      const chapterHash = pagesData.chapter.hash
      const pages = pagesData.chapter.data

      const downloadData = {
        id: `${mangaSlug}-${chapter.id}`,
        mangaId: mangaSlug,
        mangaTitle: mangaTitle,
        mangaSlug: mangaSlug,
        chapterId: chapter.id,
        chapterNumber: chapter.attributes.chapter || "Unknown",
        chapterTitle: chapter.attributes.title || "",
        posterUrl: "/placeholder.svg",
        pages: pages.map((page: string) => `${baseUrl}/data/${chapterHash}/${page}`),
        downloadedAt: new Date().toISOString(),
        size: pages.length * 500000
      }

      const existingDownloads = JSON.parse(localStorage.getItem('manga_downloads') || '[]')
      const updatedDownloads = existingDownloads.filter((d: any) => d.id !== downloadData.id)
      updatedDownloads.push(downloadData)
      
      localStorage.setItem('manga_downloads', JSON.stringify(updatedDownloads))
      toast.success(`Chapter ${chapter.attributes.chapter} downloaded for offline reading!`)
    } catch (error) {
      console.error('Error downloading chapter:', error)
      toast.error('Failed to download chapter')
    }
  }

  const sortedChapters = [...chapters].sort((a, b) => {
    const aNum = Number.parseFloat(a.attributes.chapter || "0")
    const bNum = Number.parseFloat(b.attributes.chapter || "0")
    return sortOrder === 'asc' ? aNum - bNum : bNum - aNum
  })

  if (chapters.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border-gray-700/30 backdrop-blur-sm">
        <CardContent className="text-center py-16">
          <div className="max-w-sm mx-auto space-y-4">
            <div className="p-4 bg-gray-700/30 rounded-full w-fit mx-auto">
              <List className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-lg">No chapters available</p>
              <p className="text-gray-400 mt-1">Check back later for updates.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border-gray-700/30 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-white flex items-center gap-3 text-xl">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <List className="w-5 h-5 text-red-400" />
            </div>
            Chapters ({chapters.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="border-gray-600/50 text-gray-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <Filter className="w-4 h-4 mr-2" />
            {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {sortedChapters.slice(0, visibleChapters).map((chapter, index) => (
            <div key={chapter.id} className="group relative bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/20 hover:border-gray-500/40 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
              <Link href={`/reader/${mangaSlug}/1?chapter=${chapter.id}`} className="block">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-red-400 font-bold text-lg">
                        Ch. {chapter.attributes.chapter || '?'}
                      </span>
                      {chapter.attributes.title && (
                        <span className="text-white font-medium truncate">
                          {chapter.attributes.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(chapter.attributes.publishAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {chapter.attributes.pages} pages
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault()
                        handleDownloadChapter(chapter)
                      }}
                      className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors duration-200"
                      title="Download for offline reading"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
        
        {chapters.length > visibleChapters && (
          <div className="text-center pt-6">
            <Button 
              variant="outline" 
              onClick={() => setVisibleChapters(prev => prev + 20)}
              className="border-gray-600/50 text-gray-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 px-6 py-2"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Load More Chapters ({Math.min(20, chapters.length - visibleChapters)} more)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatsCard({ kitsuManga, chapters }: { kitsuManga: KitsuManga | null; chapters: Chapter[] }) {
  if (!kitsuManga) return null

  const stats = [
    {
      label: 'Rating',
      value: kitsuManga.attributes.averageRating ? `${Number.parseFloat(kitsuManga.attributes.averageRating).toFixed(1)}` : 'N/A',
      subtitle: kitsuManga.attributes.averageRating ? '/5.0' : '',
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: 'Chapters',
      value: (kitsuManga.attributes.chapterCount || chapters.length || 0).toString(),
      subtitle: 'Available',
      icon: Book,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Status',
      value: kitsuManga.attributes.status?.charAt(0).toUpperCase() + kitsuManga.attributes.status?.slice(1) || 'Unknown',
      subtitle: 'Publication',
      icon: Clock,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Popularity',
      value: kitsuManga.attributes.popularityRank ? `#${kitsuManga.attributes.popularityRank}` : 'N/A',
      subtitle: 'Ranking',
      icon: TrendingUp,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    }
  ]

  return (
    <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border-gray-700/30 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-3 text-xl">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-red-400" />
          </div>
          Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`relative overflow-hidden rounded-xl border border-gray-600/20 ${stat.bgColor} p-4 hover:border-gray-500/40 transition-all duration-200`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className={`text-2xl font-bold text-white`}>
                    {stat.value}
                    {stat.subtitle && <span className="text-sm text-gray-400 ml-1">{stat.subtitle}</span>}
                  </div>
                  <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
                </div>
                <stat.icon className={`w-6 h-6 ${stat.color} opacity-80`} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MangaDetails({ kitsuManga, chapters, mangaSlug }: MangaDetailsProps) {
  const firstChapter = chapters[0]
  
  const { isBookmarked, isLoading: isBookmarkLoading, toggleBookmark } = useBookmark(mangaSlug)
  
  const handleBookmarkToggle = async () => {
    if (!kitsuManga) return
    
    const bookmarkData = {
      id: mangaSlug,
      title: getBestKitsuTitle(kitsuManga),
      slug: mangaSlug,
      posterUrl: kitsuManga.attributes.posterImage?.original || kitsuManga.attributes.posterImage?.medium || '',
      type: 'manga' as const,
    }
    
    await toggleBookmark(bookmarkData)
  }

  const title = kitsuManga ? getBestKitsuTitle(kitsuManga) : "Unknown Title"
  const description = kitsuManga?.attributes.description || 'No description available.'
  const genres = kitsuManga?.relationships?.genres?.data?.map((g: any) => g.attributes?.name || 'Unknown') || []
  const authors = kitsuManga?.relationships?.staff?.data?.map((s: any) => s.attributes?.name || 'Unknown') || []
  
  const averageRating = kitsuManga?.attributes.averageRating
  const status = kitsuManga?.attributes.status
  const mangaType = kitsuManga?.attributes.mangaType
  const startDate = kitsuManga?.attributes.startDate
  const chapterCount = kitsuManga?.attributes.chapterCount

  return (
    <div className="space-y-8 pb-8">
      {/* Enhanced Title Section */}
      <div className="space-y-6">
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
            {title}
          </h1>
          
          {/* Rating and Status Badges */}
          <div className="flex items-center flex-wrap gap-3 mb-6">
            {averageRating && (
              <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-white font-bold text-lg">
                  {Number.parseFloat(averageRating).toFixed(1)}
                </span>
                <span className="text-yellow-200/80 text-sm">/ 5.0</span>
              </div>
            )}
            {status && (
              <Badge 
                variant="secondary" 
                className={`${
                  status === 'finished' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                  status === 'publishing' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                  status === 'hiatus' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                  'bg-gray-500/20 text-gray-300 border-gray-500/30'
                } px-3 py-1 text-sm font-medium`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
            {mangaType && (
              <Badge variant="outline" className="bg-gray-700/30 text-gray-300 border-gray-600/50 px-3 py-1">
                {mangaType.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-gray-300 mb-8">
            {authors.length > 0 && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-red-400" />
                <div>
                  <span className="text-gray-400 text-sm">Author</span>
                  <div className="font-medium text-white">{authors.join(', ')}</div>
                </div>
              </div>
            )}
            {startDate && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-red-400" />
                <div>
                  <span className="text-gray-400 text-sm">Published</span>
                  <div className="font-medium text-white">{new Date(startDate).getFullYear()}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Book className="w-5 h-5 text-red-400" />
              <div>
                <span className="text-gray-400 text-sm">Chapters</span>
                <div className="font-medium text-white">{chapterCount || chapters.length || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          {firstChapter && (
            <Button asChild size="lg" className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3">
              <Link href={`/reader/${mangaSlug}/1?chapter=${firstChapter.id}`}>
                <BookOpen className="w-5 h-5 mr-3" />
                Start Reading
              </Link>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="lg" 
            className="border-gray-600/50 hover:border-blue-500/50 text-gray-300 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200 px-6 py-3"
            onClick={handleBookmarkToggle}
            disabled={isBookmarkLoading}
          >
            <BookmarkIcon className={`w-5 h-5 mr-3 ${isBookmarked ? 'text-blue-400 fill-current' : 'text-gray-300'}`} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="border-gray-600/50 hover:border-green-500/50 text-gray-300 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200 px-6 py-3"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: title,
                  text: `Check out ${title} on AniReads!`,
                  url: window.location.href
                })
              } else {
                navigator.clipboard.writeText(window.location.href)
                toast.success('Link copied to clipboard!')
              }
            }}
          >
            <Share2 className="w-5 h-5 mr-3" />
            Share
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-8">
          <Synopsis description={description} genres={genres} />
          <ChapterList chapters={chapters} mangaSlug={mangaSlug} mangaTitle={title} />
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1 space-y-6">
          <StatsCard kitsuManga={kitsuManga} chapters={chapters} />
        </div>
      </div>
    </div>
  )
}