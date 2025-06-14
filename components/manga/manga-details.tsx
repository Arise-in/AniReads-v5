'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Chapter } from '@/lib/mangadx-api'
import { KitsuManga, getBestKitsuTitle } from '@/lib/kitsu-api'
import { Star, Calendar, User, Book, List, ChevronDown, BookOpen, Share2, Bookmark as BookmarkIcon, Download, Clock, Eye, TrendingUp } from 'lucide-react'
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
    <Card className="bg-gray-800/30 border-gray-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Book className="w-5 h-5 text-red-400" />
          Synopsis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="prose prose-invert prose-p:text-gray-300 prose-strong:text-white max-w-none">
          <div
            className={`relative ${!isExpanded && isLongDescription ? 'max-h-32 overflow-hidden' : ''}`}
            dangerouslySetInnerHTML={{ __html: description }}
          />
          {!isExpanded && isLongDescription && (
            <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-gray-800/30 to-transparent" />
          )}
        </div>
        
        {isLongDescription && (
          <Button 
            variant="link" 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="text-red-400 pl-0 hover:text-red-300"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </Button>
        )}
        
        <div className="flex flex-wrap gap-2 pt-2">
          {genres.map(genre => (
            <Badge key={genre} variant="secondary" className="bg-gray-700/50 text-gray-300 hover:bg-gray-600/50">
              {genre}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChapterList({ chapters, mangaSlug, mangaTitle }: { chapters: Chapter[]; mangaSlug: string; mangaTitle: string }) {
  const [visibleChapters, setVisibleChapters] = useState(50)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleDownloadChapter = async (chapter: Chapter) => {
    try {
      // Get chapter pages
      const response = await fetch(`/api/proxy/mangadx/at-home/server/${chapter.id}`)
      const pagesData = await response.json()
      
      if (!pagesData.chapter?.data) {
        toast.error('Failed to get chapter pages')
        return
      }

      const baseUrl = pagesData.baseUrl
      const chapterHash = pagesData.chapter.hash
      const pages = pagesData.chapter.data

      // Create download data
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
        size: pages.length * 500000 // Estimate 500KB per page
      }

      // Save to localStorage
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
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardContent className="text-center py-12 text-gray-500">
          <List className="w-12 h-12 mx-auto mb-4" />
          <p className="font-semibold">No chapters available</p>
          <p className="text-sm">Check back later for updates.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/30 border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <List className="w-5 h-5 text-red-400" />
            Chapters ({chapters.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="border-gray-600 text-gray-300 hover:border-red-500"
          >
            {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2">
          {sortedChapters.slice(0, visibleChapters).map((chapter, index) => (
            <div key={chapter.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors group">
              <div className="flex-1">
                <Button 
                  variant="ghost" 
                  asChild 
                  className="w-full justify-start text-left h-auto p-0 hover:bg-transparent"
                >
                  <Link href={`/reader/${mangaSlug}/1?chapter=${chapter.id}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-medium">
                          Chapter {chapter.attributes.chapter || '?'}
                        </span>
                        {chapter.attributes.title && (
                          <span className="text-gray-300 truncate">
                            {chapter.attributes.title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(chapter.attributes.publishAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {chapter.attributes.pages} pages
                        </span>
                      </div>
                    </div>
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownloadChapter(chapter)}
                  className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                  title="Download for offline reading"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {chapters.length > visibleChapters && (
          <div className="text-center mt-6">
            <Button 
              variant="outline" 
              onClick={() => setVisibleChapters(prev => prev + 50)}
              className="border-gray-600 text-gray-300 hover:border-red-500"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Load More Chapters
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
      value: kitsuManga.attributes.averageRating ? `${Number.parseFloat(kitsuManga.attributes.averageRating).toFixed(1)}/5` : 'N/A',
      icon: Star,
      color: 'text-yellow-400'
    },
    {
      label: 'Chapters',
      value: kitsuManga.attributes.chapterCount || chapters.length || 'N/A',
      icon: Book,
      color: 'text-blue-400'
    },
    {
      label: 'Status',
      value: kitsuManga.attributes.status?.charAt(0).toUpperCase() + kitsuManga.attributes.status?.slice(1) || 'Unknown',
      icon: Clock,
      color: 'text-green-400'
    },
    {
      label: 'Popularity',
      value: kitsuManga.attributes.popularityRank ? `#${kitsuManga.attributes.popularityRank}` : 'N/A',
      icon: TrendingUp,
      color: 'text-orange-400'
    }
  ]

  return (
    <Card className="bg-gray-800/30 border-gray-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-red-400" />
          Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-3 bg-gray-700/30 rounded-lg">
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MangaDetails({ kitsuManga, chapters, mangaSlug }: MangaDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
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
    <div className="space-y-8">
      {/* Title and Basic Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
            {title}
          </h1>
          
          <div className="flex items-center flex-wrap gap-4 text-sm mb-6">
            {averageRating && (
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-white font-semibold">
                  {Number.parseFloat(averageRating).toFixed(1)}
                </span>
                <span className="text-gray-400">/ 5</span>
              </div>
            )}
            {status && (
              <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-600/30">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
            {mangaType && (
              <Badge variant="secondary" className="bg-gray-700/50 text-gray-300">
                {mangaType.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-gray-300">
            {authors.length > 0 && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-red-400" />
                <span className="font-medium">{authors.join(', ')}</span>
              </div>
            )}
            {startDate && (
              <div className="flex items-center gap-2">
                
                <Calendar className="w-4 h-4 text-red-400" />
                <span className="font-medium">{new Date(startDate).getFullYear()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Book className="w-4 h-4 text-red-400" />
              <span className="font-medium">{chapterCount || chapters.length || 'N/A'} Chapters</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {firstChapter && (
            <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
              <Link href={`/reader/${mangaSlug}/1?chapter=${firstChapter.id}`}>
                <BookOpen className="w-5 h-5 mr-2" />
                Start Reading
              </Link>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="lg" 
            className="border-gray-600 hover:border-blue-500"
            onClick={handleBookmarkToggle}
            disabled={isBookmarkLoading}
          >
            <BookmarkIcon className={`w-5 h-5 mr-2 ${isBookmarked ? 'text-blue-400 fill-current' : 'text-gray-300'}`} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="border-gray-600 hover:border-green-500"
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
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Synopsis description={description} genres={genres} />
          <ChapterList chapters={chapters} mangaSlug={mangaSlug} mangaTitle={title} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <StatsCard kitsuManga={kitsuManga} chapters={chapters} />
        </div>
      </div>
    </div>
  )
}