import { obsessions } from './content';
import { youtubeVideoId } from './youtube';

export function Obsessions() {
  const videos = obsessions.flatMap(video => {
    const id = youtubeVideoId(video.url);
    return id ? [{ ...video, id }] : [];
  });

  return <section className="obsessions-section" id="obsessions" aria-labelledby="obsessions-title">
    <div className="section-heading"><div><span className="eyebrow">01 / INFLUENCES</span><h2 id="obsessions-title">Current obsessions.</h2></div><span className="section-note">MUSIC / FASHION / ON REPEAT</span></div>
    <p className="obsessions-intro">The sounds, silhouettes, and videos that shape my taste.</p>
    {videos.length ? <div className="obsession-grid">{videos.map((video, index) => <article className="obsession-card" key={video.id}>
      <div className="obsession-label"><span>{String(index + 1).padStart(2, '0')} / {video.category.toUpperCase()}</span><span aria-hidden="true">↗</span></div>
      <div className="obsession-player"><iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}`}
        title={`YouTube video: ${video.title}`}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      /></div>
      <div className="obsession-details"><h3>{video.title}</h3>{video.note && <p>{video.note}</p>}<a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">Watch on YouTube <span aria-hidden="true">↗</span></a></div>
    </article>)}</div> : <div className="obsessions-empty"><span className="obsessions-star" aria-hidden="true">✳</span><div><span className="eyebrow">MUSIC / FASHION</span><h3>A new rotation is on its way.</h3><p>My favorite finds will land here.</p></div></div>}
  </section>;
}
