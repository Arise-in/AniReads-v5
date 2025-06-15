'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Settings, 
  BookOpen,
  Maximize,
  Minimize,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Bookmark,
  Share2,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward
} from 'lucide-react'
import { getMangaDxChapterPages, getMangaDxChapter, getMangaDxChapters } from '@/lib/mangadx-api'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Dynamically import PageFlip to avoid SSR issues
const PageFlip = dynamic(() => import('page-flip').then(mod => mod.PageFlip), { ssr: false })

interface ReaderSettings {
  readingMode: 'single' | 'double' | 'webtoon'
  flipDirection: 'rtl' | 'ltr'
  autoPlay: boolean
  autoPlaySpeed: number
  soundEnabled: boolean
  preloadPages: number
  showUI: boolean
  fullscreen: boolean
  zoom: number
}

interface PageData {
  url: string
  loaded: boolean
  error: boolean
}

export default function MangaReaderPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const flipBookRef = useRef<HTMLDivElement>(null)
  const pageFlipRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)

  const mangaId = params.mangaId as string
  const pageId = parseInt(params.pageId as string) || 1
  const chapterId = searchParams.get('chapter')

  const [pages, setPages] = useState<PageData[]>([])
  const [currentPage, setCurrentPage] = useState(pageId)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chapterInfo, setChapterInfo] = useState<any>(null)
  const [allChapters, setAllChapters] = useState<any[]>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())

  const [settings, setSettings] = useState<ReaderSettings>({
    readingMode: 'single',
    flipDirection: 'rtl',
    autoPlay: false,
    autoPlaySpeed: 3000,
    soundEnabled: true,
    preloadPages: 3,
    showUI: true,
    fullscreen: false,
    zoom: 1
  })

  const [showSettings, setShowSettings] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load chapter data
  useEffect(() => {
    if (!chapterId || !isClient) return

    const loadChapterData = async () => {
      try {
        setLoading(true)
        
        // Load current chapter info
        const chapterResponse = await getMangaDxChapter(chapterId)
        setChapterInfo(chapterResponse.data)

        // Load chapter pages
        const pagesResponse = await getMangaDxChapterPages(chapterId)
        const baseUrl = pagesResponse.baseUrl
        const chapterHash = pagesResponse.chapter.hash
        const pageFiles = pagesResponse.chapter.data

        const pageUrls = pageFiles.map((file: string) => ({
          url: `${baseUrl}/data/${chapterHash}/${file}`,
          loaded: false,
          error: false
        }))

        setPages(pageUrls)
        setTotalPages(pageUrls.length)

        // Load all chapters for navigation
        const chaptersResponse = await getMangaDxChapters(mangaId)
        const sortedChapters = chaptersResponse.data.sort((a: any, b: any) => {
          const aNum = parseFloat(a.attributes.chapter || "0")
          const bNum = parseFloat(b.attributes.chapter || "0")
          return aNum - bNum
        })
        setAllChapters(sortedChapters)
        
        const currentIndex = sortedChapters.findIndex((ch: any) => ch.id === chapterId)
        setCurrentChapterIndex(currentIndex)

      } catch (error) {
        console.error('Error loading chapter:', error)
        toast.error('Failed to load chapter')
      } finally {
        setLoading(false)
      }
    }

    loadChapterData()
  }, [chapterId, mangaId, isClient])

  // Initialize PageFlip
  useEffect(() => {
    if (!isClient || !flipBookRef.current || pages.length === 0 || pageFlipRef.current) return

    const initPageFlip = async () => {
      try {
        const { PageFlip } = await import('page-flip')
        
        const pageFlip = new PageFlip(flipBookRef.current!, {
          width: window.innerWidth > 768 ? 800 : window.innerWidth - 40,
          height: window.innerWidth > 768 ? 1130 : window.innerHeight - 200,
          size: settings.readingMode === 'double' ? 'stretch' : 'fixed',
          orientation: settings.readingMode === 'webtoon' ? 'portrait' : 'landscape',
          autoSize: true,
          maxShadowOpacity: 0.5,
          showCover: true,
          mobileScrollSupport: true,
          clickEventForward: true,
          usePortrait: settings.readingMode === 'webtoon',
          startPage: currentPage - 1,
          drawShadow: true,
          flippingTime: 600,
          useMouseEvents: true,
          swipeDistance: 30,
          showPageCorners: true,
          disableFlipByClick: false
        })

        // Add event listeners
        pageFlip.on('flip', (e: any) => {
          setIsFlipping(true)
          const newPage = e.data + 1
          setCurrentPage(newPage)
          
          if (settings.soundEnabled) {
            playFlipSound()
          }
          
          // Update URL
          router.replace(`/reader/${mangaId}/${newPage}?chapter=${chapterId}`, { scroll: false })
          
          setTimeout(() => setIsFlipping(false), 600)
        })

        pageFlip.on('changeOrientation', (e: any) => {
          pageFlip.updateFromHtml()
        })

        pageFlipRef.current = pageFlip
        
        // Load pages into flipbook
        loadPagesIntoFlipbook(pageFlip)
        
      } catch (error) {
        console.error('Error initializing PageFlip:', error)
      }
    }

    initPageFlip()

    return () => {
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy()
        pageFlipRef.current = null
      }
    }
  }, [isClient, pages.length, settings.readingMode])

  const loadPagesIntoFlipbook = useCallback(async (pageFlip: any) => {
    if (!pageFlip || pages.length === 0) return

    // Clear existing pages
    flipBookRef.current!.innerHTML = ''

    for (let i = 0; i < pages.length; i++) {
      const pageElement = document.createElement('div')
      pageElement.className = 'page-wrapper'
      pageElement.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1a1a1a;
        position: relative;
        overflow: hidden;
      `

      // Create loading placeholder
      const loadingElement = document.createElement('div')
      loadingElement.className = 'loading-placeholder'
      loadingElement.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(45deg, #2a2a2a, #3a3a3a);
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
      `
      loadingElement.innerHTML = `
        <div style="text-align: center; color: #666;">
          <div style="width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #ef4444; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
          <div>Loading page ${i + 1}...</div>
        </div>
      `

      const img = document.createElement('img')
      img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        position: relative;
        z-index: 2;
        opacity: 0;
        transition: opacity 0.3s ease;
      `

      img.onload = () => {
        loadingElement.style.display = 'none'
        img.style.opacity = '1'
        setPages(prev => prev.map((p, idx) => 
          idx === i ? { ...p, loaded: true } : p
        ))
      }

      img.onerror = () => {
        loadingElement.innerHTML = `
          <div style="text-align: center; color: #ef4444;">
            <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
            <div>Failed to load page ${i + 1}</div>
          </div>
        `
        setPages(prev => prev.map((p, idx) => 
          idx === i ? { ...p, error: true } : p
        ))
      }

      img.src = pages[i].url
      img.alt = `Page ${i + 1}`

      pageElement.appendChild(loadingElement)
      pageElement.appendChild(img)
      flipBookRef.current!.appendChild(pageElement)
    }

    // Load pages into PageFlip
    pageFlip.loadFromHTML(flipBookRef.current!.children)
    
    // Navigate to current page
    if (currentPage > 1) {
      pageFlip.flip(currentPage - 1)
    }
  }, [pages, currentPage])

  const playFlipSound = () => {
    if (!settings.soundEnabled) return
    
    // Create a subtle page flip sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  const navigateToPage = (page: number) => {
    if (!pageFlipRef.current || page < 1 || page > totalPages) return
    
    pageFlipRef.current.flip(page - 1)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      navigateToPage(currentPage + 1)
    } else {
      nextChapter()
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1)
    } else {
      prevChapter()
    }
  }

  const nextChapter = () => {
    if (currentChapterIndex < allChapters.length - 1) {
      const nextChapter = allChapters[currentChapterIndex + 1]
      router.push(`/reader/${mangaId}/1?chapter=${nextChapter.id}`)
    }
  }

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevChapter = allChapters[currentChapterIndex - 1]
      router.push(`/reader/${mangaId}/1?chapter=${prevChapter.id}`)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setSettings(prev => ({ ...prev, fullscreen: true }))
    } else {
      document.exitFullscreen()
      setSettings(prev => ({ ...prev, fullscreen: false }))
    }
  }

  const toggleReadingMode = () => {
    const modes = ['single', 'double', 'webtoon'] as const
    const currentIndex = modes.indexOf(settings.readingMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setSettings(prev => ({ ...prev, readingMode: nextMode }))
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          settings.flipDirection === 'rtl' ? nextPage() : prevPage()
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          settings.flipDirection === 'rtl' ? prevPage() : nextPage()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'h':
        case 'H':
          e.preventDefault()
          setSettings(prev => ({ ...prev, showUI: !prev.showUI }))
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleReadingMode()
          break
        case 's':
        case 'S':
          e.preventDefault()
          setShowSettings(!showSettings)
          break
        case 'Escape':
          setShowSettings(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [settings, showSettings])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading reader...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl">Loading Chapter...</div>
          {chapterInfo && (
            <div className="text-gray-400 mt-2">
              Chapter {chapterInfo.attributes?.chapter || '?'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .page-wrapper {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        .stf__parent {
          margin: 0 auto;
          touch-action: pan-x pan-y;
        }
        
        .stf__block {
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }
      `}</style>

      {/* Top Navigation Bar */}
      {settings.showUI && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/manga/${mangaId}`)}
                className="text-white hover:bg-white/20"
              >
                <Home className="w-5 h-5" />
              </Button>
              
              <div className="text-sm">
                <div className="font-semibold">
                  {chapterInfo?.attributes?.title || `Chapter ${chapterInfo?.attributes?.chapter || '?'}`}
                </div>
                <div className="text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20">
                {settings.readingMode.toUpperCase()}
              </Badge>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettings(prev => ({ ...prev, showUI: !prev.showUI }))}
                className="text-white hover:bg-white/20"
              >
                {settings.showUI ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:bg-white/20"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Reader Area */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          ref={flipBookRef}
          className="relative"
          style={{
            maxWidth: '100vw',
            maxHeight: '100vh'
          }}
        />
      </div>

      {/* Bottom Navigation */}
      {settings.showUI && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevChapter}
                disabled={currentChapterIndex === 0}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={prevPage}
                disabled={currentPage === 1 && currentChapterIndex === 0}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-400">
                  {currentPage} / {totalPages}
                </div>
                <div className="w-32 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${(currentPage / totalPages) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={nextPage}
                disabled={currentPage === totalPages && currentChapterIndex === allChapters.length - 1}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={nextChapter}
                disabled={currentChapterIndex === allChapters.length - 1}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-700 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Reader Settings</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Reading Mode
                </label>
                <div className="flex gap-2">
                  {(['single', 'double', 'webtoon'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={settings.readingMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, readingMode: mode }))}
                      className="flex-1"
                    >
                      {mode === 'single' && <Smartphone className="w-4 h-4 mr-1" />}
                      {mode === 'double' && <Monitor className="w-4 h-4 mr-1" />}
                      {mode === 'webtoon' && <BookOpen className="w-4 h-4 mr-1" />}
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Reading Direction
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={settings.flipDirection === 'rtl' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, flipDirection: 'rtl' }))}
                    className="flex-1"
                  >
                    Right to Left
                  </Button>
                  <Button
                    variant={settings.flipDirection === 'ltr' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, flipDirection: 'ltr' }))}
                    className="flex-1"
                  >
                    Left to Right
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Sound Effects</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                  className="text-gray-400 hover:text-white"
                >
                  {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Fullscreen</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-gray-400 hover:text-white"
                >
                  {settings.fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 space-y-1">
                <div>• Use arrow keys or A/D to navigate</div>
                <div>• Press F for fullscreen</div>
                <div>• Press H to hide/show UI</div>
                <div>• Press M to change reading mode</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {isFlipping && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
    </div>
  )
}