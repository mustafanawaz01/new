import { useMap } from '@vis.gl/react-google-maps'
import { useEffect, useRef, type FunctionComponent } from 'react'
import type { LiveLocation } from '../hooks/useLiveLocation'

const DEFAULT_ZOOM = 16

type MapFollowerProps = {
  location: LiveLocation | null
  /** true after the first position — zoom in from world view. */
  hasFirstFix: boolean
}

/**
 * Pans the map to follow the device; useMap() requires being under &lt;Map&gt;.
 */
export const MapFollower: FunctionComponent<MapFollowerProps> = ({
  location,
  hasFirstFix,
}) => {
  const map = useMap()
  const hasZoomedRef = useRef(false)

  useEffect(() => {
    if (!map || !location) return
    const center: google.maps.LatLngLiteral = { lat: location.lat, lng: location.lng }
    map.panTo(center)
    if (!hasZoomedRef.current && hasFirstFix) {
      hasZoomedRef.current = true
      map.setZoom(DEFAULT_ZOOM)
    }
  }, [map, location, hasFirstFix])

  return null
}
