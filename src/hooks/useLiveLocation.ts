import { useEffect, useState } from 'react'

export type LiveLocation = {
  lat: number
  lng: number
  /** Horizontal accuracy in meters, when available. */
  accuracyM: number | null
  heading: number | null
  /** Ground speed in m/s, when available. */
  speed: number | null
  /** Milliseconds from Geolocation. */
  timestamp: number
}

type LiveLocationState =
  | { status: 'idle' }
  | { status: 'watching'; location: LiveLocation }
  | { status: 'error'; code: number; message: string }

const toLiveLocation = (p: GeolocationPosition): LiveLocation => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracyM:
    typeof p.coords.accuracy === 'number' && Number.isFinite(p.coords.accuracy)
      ? p.coords.accuracy
      : null,
  heading:
    p.coords.heading != null && Number.isFinite(p.coords.heading)
      ? p.coords.heading
      : null,
  speed:
    p.coords.speed != null && Number.isFinite(p.coords.speed) ? p.coords.speed : null,
  timestamp: p.timestamp,
})

function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

const GEO_UNSUPPORTED: LiveLocationState = {
  status: 'error',
  code: 0,
  message: 'Geolocation is not supported in this environment.',
}

export function useLiveLocation(enabled: boolean) {
  const [state, setState] = useState<LiveLocationState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) return
    if (!isGeolocationSupported() || !navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setState({ status: 'watching', location: toLiveLocation(p) })
      },
      (e: GeolocationPositionError) => {
        setState({
          status: 'error',
          code: e.code,
          message: e.message || 'Location error',
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [enabled])

  if (!enabled) {
    return { status: 'idle' } as const
  }
  if (!isGeolocationSupported()) {
    return GEO_UNSUPPORTED
  }
  return state
}
