# Subsonic Client Setup Guide for NaviProxy

NaviProxy includes a Subsonic API compatibility layer (`/rest/search3.view`, `/rest/stream.view`, `/rest/ping.view`). This allows third-party client apps to seamlessly talk to NaviProxy as if it were a native Navidrome server!

## Supported Third-Party Applications
- **Symfonium** (Android)
- **DSub** (Android)
- **Ultrasonic** (Android)
- **Feishin** (Windows / macOS / Linux desktop)
- **Amperfy** (iOS)
- **Tempo** (iOS)
- **Substreamer** (iOS / Android)

---

## Configuration Steps

1. Open your client app (e.g. Symfonium or Feishin).
2. Add a new server connection:
   - **Server Type**: `Subsonic / Navidrome`
   - **Server Address**: `http://<your-server-ip>:8080` (Point to NaviProxy, not directly to Navidrome)
   - **Username**: `admin` (or your configured username)
   - **Password / Token**: The token configured in `http://localhost:8080/config`
3. Tap **Test Connection** / **Save**.

### How Proxying Works Behind the Scenes
1. When you search for music in your mobile client, Symfonium sends a standard Subsonic `search3.view` request to NaviProxy.
2. NaviProxy queries your local Navidrome library.
3. If not found locally, NaviProxy simultaneously queries Tidal, Spotify, Apple Music, Deezer, Debrid, and Usenet.
4. Any matches meeting your configured **Minimum Audio Quality** are returned to Symfonium.
5. When you press play in Symfonium, NaviProxy streams the track in real-time from its original source while simultaneously saving the lossless audio file to your Navidrome music storage folder!
