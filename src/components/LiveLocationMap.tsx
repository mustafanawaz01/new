import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { useId, useMemo, useState, type FunctionComponent } from 'react'
import { useLiveLocation, type LiveLocation } from '../hooks/useLiveLocation'
import { getGoogleMapsBrowserKey, mapApiLoadErrorToMessage } from '../lib/googleMapsEnv'
import { MapFollower } from './MapFollower'

const FALLBACK_CENTER: google.maps.LatLngLiteral = { lat: 20, lng: 0 }
const MAP_ZOOM = 2

const browserKey = getGoogleMapsBrowserKey()

const formatNumber = (n: number, digits: number) =>
  n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })

export const LiveLocationMap: FunctionComponent = () => {
  const mapId = useId()
  const [liveEnabled, setLiveEnabled] = useState(true)
  const [mapsLoadError, setMapsLoadError] = useState<string | null>(null)
  const hasApiKey = browserKey != null
  const locationState = useLiveLocation(liveEnabled && hasApiKey)

  const { location, isWatching, errorText } = useMemo((): {
    location: LiveLocation | null
    isWatching: boolean
    errorText: string | null
  } => {
    if (locationState.status === 'watching') {
      return {
        location: locationState.location,
        isWatching: true,
        errorText: null,
      }
    }
    if (locationState.status === 'error') {
      return {
        location: null,
        isWatching: false,
        errorText: `${getGeolocationErrorLabel(locationState.code)}: ${locationState.message}`,
      }
    }
    return { location: null, isWatching: false, errorText: null }
  }, [locationState])

  if (!hasApiKey) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-100 p-6 text-slate-800">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">API key required</h1>
          <p className="mt-3 text-sm text-slate-600">
            Create a key in{' '}
            <a
              className="text-violet-700 underline"
              href="https://console.cloud.google.com/google/maps-apis"
              rel="noreferrer"
              target="_blank"
            >
              Google Cloud Console
            </a>{' '}
            and enable the <strong>Maps JavaScript API</strong>, then set:
          </p>
          <code className="mt-4 block w-full break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm">
            VITE_GOOGLE_MAPS_API_KEY=your_key
          </code>
          <p className="mt-3 text-sm text-slate-500">
            Copy <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">.env.example</code> to
            <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">.env</code> and
            add your key. Use the exact name <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> (no
            spaces around <code className="font-mono text-xs">=</code>).
            After changing <code className="font-mono text-xs">.env</code>, stop and run <code className="font-mono text-xs">npm run dev</code> again.
          </p>
        </div>
      </div>
    )
  }

  const hasFirstFix = location != null

  return (
    <div className="flex min-h-svh flex-col bg-slate-100">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <h1 className="text-base font-semibold text-slate-900">Live location</h1>
        <div className="flex max-w-full flex-1 flex-wrap items-center justify-end gap-3 text-sm text-slate-600 sm:min-w-0">
          {mapsLoadError && (
            <span className="max-w-full text-amber-800" role="alert" title="Maps script or API key issue">
              Google Maps: {mapsLoadError}
            </span>
          )}
          {location ? (
            <>
              <span className="font-mono text-slate-800" title="Latitude, longitude WGS-84">
                {formatNumber(location.lat, 6)}°, {formatNumber(location.lng, 6)}°
              </span>
              {location.accuracyM != null && (
                <span title="Reported accuracy radius">±{Math.round(location.accuracyM)} m</span>
              )}
              {isWatching && (
                <span
                  className="inline-flex items-center gap-1.5 text-emerald-700"
                  title="Position updates are streaming from the device"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                  Live
                </span>
              )}
            </>
          ) : !liveEnabled ? (
            <span className="text-slate-500">Tracking paused</span>
          ) : errorText ? (
            <span className="max-w-prose text-red-700" role="alert">
              {errorText}
            </span>
          ) : (
            <span className="text-slate-500">Requesting position…</span>
          )}
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-800 transition hover:bg-slate-50"
            onClick={() => setLiveEnabled((e) => !e)}
            type="button"
          >
            {liveEnabled ? 'Pause' : 'Resume'}
          </button>
        </div>
      </header>
      <div className="relative min-h-0 w-full flex-1">
        <APIProvider
          region="US"
          apiKey={browserKey}
          onError={(e) => setMapsLoadError(mapApiLoadErrorToMessage(e))}
          onLoad={() => setMapsLoadError(null)}
        >
          <Map
            className="h-full w-full"
            id={mapId}
            defaultCenter={FALLBACK_CENTER}
            defaultZoom={MAP_ZOOM}
            style={{ minHeight: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapFollower hasFirstFix={hasFirstFix} location={location} />
            {location ? (
              <Marker
                position={{ lat: location.lat, lng: location.lng }}
                title="You are here"
              />
            ) : null}
          </Map>
        </APIProvider>
      </div>
    </div>
  )
}

const GEO_PERMISSION_DENIED = 1
const GEO_POSITION_UNAVAILABLE = 2
const GEO_TIMEOUT = 3

function getGeolocationErrorLabel(code: number): string {
  switch (code) {
    case GEO_PERMISSION_DENIED:
      return 'Permission denied'
    case GEO_POSITION_UNAVAILABLE:
      return 'Position unavailable'
    case GEO_TIMEOUT:
      return 'Timed out'
    default:
      return 'Location error'
  }
}
