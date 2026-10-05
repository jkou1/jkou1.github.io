import { createNowPlayingHandler } from '../server/now-playing';

const handle = createNowPlayingHandler();

export default {
  fetch(request: Request) {
    return handle(request, {
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
      SPOTIFY_REFRESH_TOKEN: process.env.SPOTIFY_REFRESH_TOKEN || '',
    });
  },
};
