# Live location map (Google Maps + Geolocation)

Vite, React, TypeScript, and Tailwind. The app shows your **real-time** position on Google Maps using `navigator.geolocation.watchPosition` and pans the map as you move.

## Run locally

1. In [Google Cloud Console](https://console.cloud.google.com/google/maps-apis), enable the **Maps JavaScript API** and create an **API key** (restrict it to your dev origins, e.g. `http://localhost:5173/*`).

2. Set the key in `.env` (from `.env.example`):

   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_key
   ```

3. Install and start:

   ```bash
   npm install
   npm run dev
   ```

4. Open the app in a **secure context** (localhost or HTTPS), allow **location** when the browser asks, and use a device with GPS for best “live” results.

`Pause` / `Resume` stops or restarts the geolocation watch without reloading the page.

## Scripts

- `npm run dev` – dev server
- `npm run build` – typecheck and production build
- `npm run preview` – preview the production build
- `npm run lint` – ESLint
