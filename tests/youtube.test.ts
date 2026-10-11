import { expect, it } from 'vitest';
import { youtubeVideoId } from '../src/youtube';

it.each([
  'https://www.youtube.com/watch?v=M7lc1UVf-VE&list=example',
  'https://youtu.be/M7lc1UVf-VE?si=example',
  'https://m.youtube.com/watch?v=M7lc1UVf-VE',
  'https://music.youtube.com/watch?v=M7lc1UVf-VE',
  'https://www.youtube.com/shorts/M7lc1UVf-VE',
  'https://www.youtube.com/live/M7lc1UVf-VE',
  'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
])('extracts a video from a shared YouTube link: %s', url => {
  expect(youtubeVideoId(url)).toBe('M7lc1UVf-VE');
});

it.each([
  'not a URL',
  'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE',
  'https://example.com/watch?v=M7lc1UVf-VE',
  'javascript:alert(1)',
  'https://www.youtube.com/playlist?list=example',
  'https://www.youtube.com/watch?v=invalid',
])('rejects a non-video link: %s', url => {
  expect(youtubeVideoId(url)).toBeNull();
});
