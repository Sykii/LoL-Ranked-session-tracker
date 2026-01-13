// spotifyDetector.js - Detecta la canción actual de Spotify
const { exec } = require('child_process');
const os = require('os');

class SpotifyDetector {
  constructor() {
    this.platform = os.platform();
    this.currentTrack = null;
    this.isPlaying = false;
  }

  /**
   * Obtiene la canción actual de Spotify
   * @returns {Promise<Object>} - {artist: string, title: string, isPlaying: boolean}
   */
  async getCurrentTrack() {
    try {
      if (this.platform === 'win32') {
        return await this.getTrackWindows();
      } else if (this.platform === 'darwin') {
        return await this.getTrackMacOS();
      } else if (this.platform === 'linux') {
        return await this.getTrackLinux();
      }
      
      console.log('⚠️ Plataforma no soportada:', this.platform);
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo track de Spotify:', error.message);
      console.error('Stack:', error.stack);
      return null;
    }
  }

  /**
   * Windows - Lee el título de la ventana de Spotify
   */
  async getTrackWindows() {
    return new Promise((resolve) => {
      // Comando más simple: solo obtener el título del proceso Spotify
      const cmd = `powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify' -and $_.MainWindowTitle -ne ''} | Select-Object -First 1 -ExpandProperty MainWindowTitle"`;

      exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          console.log('⚠️ Spotify no detectado o no está reproduciendo');
          resolve(null);
          return;
        }

        if (!stdout || stdout.trim() === '') {
          console.log('⚠️ Spotify abierto pero sin título de ventana');
          resolve(null);
          return;
        }

        const title = stdout.trim();
        
        // Ignorar ventanas de menú de Spotify
        if (title === 'Spotify' || title === 'Spotify Premium' || title === 'Spotify Free') {
          console.log('ℹ️ Spotify abierto pero en pausa o en menú');
          resolve(null);
          return;
        }

        // El formato típico es: "Artist - Song Title"
        const parts = title.split(' - ');
        if (parts.length >= 2) {
          const track = {
            artist: parts[0].trim(),
            title: parts.slice(1).join(' - ').trim(),
            isPlaying: true
          };
          console.log('✅ Spotify detectado:', `${track.artist} - ${track.title}`);
          resolve(track);
        } else {
          console.log('⚠️ Formato de título no reconocido:', title);
          resolve({
            artist: 'Spotify',
            title: title,
            isPlaying: true
          });
        }
      });
    });
  }

  /**
   * macOS - Usa AppleScript para obtener info de Spotify
   */
  async getTrackMacOS() {
    return new Promise((resolve) => {
      const script = `
        tell application "System Events"
          set spotifyRunning to (name of processes) contains "Spotify"
        end tell
        
        if spotifyRunning then
          tell application "Spotify"
            if player state is playing then
              set trackArtist to artist of current track
              set trackName to name of current track
              return trackArtist & " - " & trackName
            end if
          end tell
        end if
      `;

      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error || !stdout) {
          resolve(null);
          return;
        }

        const title = stdout.trim();
        const parts = title.split(' - ');
        
        if (parts.length >= 2) {
          resolve({
            artist: parts[0].trim(),
            title: parts.slice(1).join(' - ').trim(),
            isPlaying: true
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Linux - Usa dbus para obtener info de Spotify
   */
  async getTrackLinux() {
    return new Promise((resolve) => {
      exec(
        'dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:org.mpris.MediaPlayer2.Player string:Metadata',
        (error, stdout, stderr) => {
          if (error) {
            resolve(null);
            return;
          }

          try {
            // Parsear la salida de dbus (muy simple)
            const artistMatch = stdout.match(/xesam:artist.*?string "(.*?)"/);
            const titleMatch = stdout.match(/xesam:title.*?string "(.*?)"/);

            if (artistMatch && titleMatch) {
              resolve({
                artist: artistMatch[1],
                title: titleMatch[1],
                isPlaying: true
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Formatea el track como string
   */
  formatTrack(track) {
    if (!track) return null;
    return `${track.artist} - ${track.title}`;
  }
}

module.exports = SpotifyDetector;
