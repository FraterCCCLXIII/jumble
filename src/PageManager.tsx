import Sidebar from '@/components/Sidebar'
import { cn } from '@/lib/utils'
import NoteListPage from '@/pages/primary/NoteListPage'
import { CurrentRelaysProvider } from '@/providers/CurrentRelaysProvider'
import { TPageRef } from '@/types'
import {
  cloneElement,
  createContext,
  createRef,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useState
} from 'react'
import BackgroundAudio from './components/BackgroundAudio'
import CreateWalletGuideToast from './components/CreateWalletGuideToast'
import TooManyRelaysAlertDialog from './components/TooManyRelaysAlertDialog'
import { normalizeUrl } from './lib/url'
import ExplorePage from './pages/primary/ExplorePage'
import MePage from './pages/primary/MePage'
import NotificationListPage from './pages/primary/NotificationListPage'
import ProfilePage from './pages/primary/ProfilePage'
import RelayPage from './pages/primary/RelayPage'
import SearchPage from './pages/primary/SearchPage'
import { NotificationProvider } from './providers/NotificationProvider'
import { useScreenSize } from './providers/ScreenSizeProvider'
import { routes } from './routes'

export type TPrimaryPageName = keyof typeof PRIMARY_PAGE_MAP

type TPrimaryPageContext = {
  navigate: (page: TPrimaryPageName, props?: object) => void
  current: TPrimaryPageName | null
  display: boolean
}

type TSecondaryPageContext = {
  push: (url: string) => void
  pop: () => void
  currentIndex: number
}

const PRIMARY_PAGE_REF_MAP = {
  home: createRef<TPageRef>(),
  explore: createRef<TPageRef>(),
  notifications: createRef<TPageRef>(),
  me: createRef<TPageRef>(),
  profile: createRef<TPageRef>(),
  relay: createRef<TPageRef>(),
  search: createRef<TPageRef>()
}

const PRIMARY_PAGE_MAP = {
  home: <NoteListPage ref={PRIMARY_PAGE_REF_MAP.home} />,
  explore: <ExplorePage ref={PRIMARY_PAGE_REF_MAP.explore} />,
  notifications: <NotificationListPage ref={PRIMARY_PAGE_REF_MAP.notifications} />,
  me: <MePage ref={PRIMARY_PAGE_REF_MAP.me} />,
  profile: <ProfilePage ref={PRIMARY_PAGE_REF_MAP.profile} />,
  relay: <RelayPage ref={PRIMARY_PAGE_REF_MAP.relay} />,
  search: <SearchPage ref={PRIMARY_PAGE_REF_MAP.search} />
}

const PrimaryPageContext = createContext<TPrimaryPageContext | undefined>(undefined)

const SecondaryPageContext = createContext<TSecondaryPageContext | undefined>(undefined)

export function usePrimaryPage() {
  const context = useContext(PrimaryPageContext)
  if (!context) {
    throw new Error('usePrimaryPage must be used within a PrimaryPageContext.Provider')
  }
  return context
}

export function useSecondaryPage() {
  const context = useContext(SecondaryPageContext)
  if (!context) {
    throw new Error('usePrimaryPage must be used within a SecondaryPageContext.Provider')
  }
  return context
}

export function PageManager() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const { isSmallScreen } = useScreenSize()

  useEffect(() => {
    // Handle URL normalization
    if (['/npub1', '/nprofile1'].some((prefix) => window.location.pathname.startsWith(prefix))) {
      window.history.replaceState(
        null,
        '',
        '/users' + window.location.pathname + window.location.search + window.location.hash
      )
    } else if (
      ['/note1', '/nevent1', '/naddr1'].some((prefix) =>
        window.location.pathname.startsWith(prefix)
      )
    ) {
      window.history.replaceState(
        null,
        '',
        '/notes' + window.location.pathname + window.location.search + window.location.hash
      )
    }

    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigatePrimaryPage = (page: TPrimaryPageName, props?: any) => {
    if (page === 'relay' && props?.url) {
      window.location.href = `/relays/${encodeURIComponent(props.url)}`
    } else {
      // Navigate to primary pages
      const url = page === 'home' ? '/' : `/${page}`
      window.history.pushState(null, '', url)
      setCurrentPath(url)
    }
  }

  const pushSecondaryPage = (url: string) => {
    window.location.href = url
  }

  const popSecondaryPage = () => {
    window.history.back()
  }

  // Determine current page name based on path
  const getCurrentPageName = (): TPrimaryPageName => {
    const path = currentPath.split('?')[0].split('#')[0]
    
    if (path === '/') return 'home'
    if (path === '/explore') return 'explore'
    if (path === '/notifications') return 'notifications'
    if (path === '/search') return 'search'
    if (path === '/profile') return 'profile'
    if (path === '/me') return 'me'
    
    // Check for relay page with ?r= parameter
    const searchParams = new URLSearchParams(window.location.search)
    const r = searchParams.get('r')
    if (r && path === '/') return 'relay'
    
    return 'home' // Default
  }

  // Find the current page component based on the path
  const getCurrentPage = () => {
    const path = currentPath.split('?')[0].split('#')[0]
    
    // Check if it's a primary page first
    if (path === '/') {
      return PRIMARY_PAGE_MAP.home
    }
    
    // Check for other primary pages
    if (path === '/explore') {
      return PRIMARY_PAGE_MAP.explore
    }
    if (path === '/notifications') {
      return PRIMARY_PAGE_MAP.notifications
    }
    if (path === '/search') {
      return PRIMARY_PAGE_MAP.search
    }
    if (path === '/profile') {
      return PRIMARY_PAGE_MAP.profile
    }
    if (path === '/me') {
      return PRIMARY_PAGE_MAP.me
    }
    
    // Check for relay page with ?r= parameter
    const searchParams = new URLSearchParams(window.location.search)
    const r = searchParams.get('r')
    if (r && path === '/') {
      const url = normalizeUrl(r)
      if (url) {
        return <RelayPage ref={PRIMARY_PAGE_REF_MAP.relay} url={url} />
      }
    }

    // Check secondary routes
    for (const { matcher, element } of routes) {
      const match = matcher(path)
      if (match && element) {
        const ref = createRef<TPageRef>()
        return cloneElement(element, { ...match.params, ref } as any)
      }
    }

    // Default to home if no match
    return PRIMARY_PAGE_MAP.home
  }

  return (
    <PrimaryPageContext.Provider
      value={{
        navigate: navigatePrimaryPage,
        current: getCurrentPageName(),
        display: true
      }}
    >
      <SecondaryPageContext.Provider
        value={{
          push: pushSecondaryPage,
          pop: popSecondaryPage,
          currentIndex: 0
        }}
      >
        <CurrentRelaysProvider>
          <NotificationProvider>
            <div className="flex flex-col items-center bg-surface-background">
              <div
                className="flex h-[var(--vh)] w-full bg-surface-background"
                style={{
                  maxWidth: '1920px'
                }}
              >
                <div className="fixed left-0 top-0 h-[var(--vh)] z-10 bg-surface-background">
                <Sidebar />
                      </div>
                <div className="w-full pr-2 py-2 ml-16 xl:ml-52 flex justify-center">
                  <div className="w-full max-w-[680px] rounded-lg shadow-lg bg-background overflow-hidden">
                    {getCurrentPage()}
                  </div>
                </div>
              </div>
            </div>
            <TooManyRelaysAlertDialog />
            <CreateWalletGuideToast />
            <BackgroundAudio className="fixed bottom-20 right-0 z-50 w-80 rounded-l-full rounded-r-none overflow-hidden shadow-lg border" />
          </NotificationProvider>
        </CurrentRelaysProvider>
      </SecondaryPageContext.Provider>
    </PrimaryPageContext.Provider>
  )
}

export function SecondaryPageLink({
  to,
  children,
  className,
  onClick
}: {
  to: string
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <a
      href={to}
      className={cn('cursor-pointer', className)}
      onClick={(e) => {
        if (onClick) {
          onClick(e)
        }
        // Let the browser handle the navigation naturally
      }}
    >
      {children}
    </a>
  )
}