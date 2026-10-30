import {MediaImage} from '../lib/media';
import {useEffect, useState} from 'react';
import {Play, ArrowUpRight, RefreshCw} from 'lucide-react';
import type {PortfolioVideo} from '../types/models';
import {usePortfolio} from '../lib/usePortfolio';
import {safeYoutubeId, safeUrl, t} from '../lib/content';

type PlayerMode = 'privacy' | 'standard';

export default function VideoCard({item, number, featured = false}: {item: PortfolioVideo; number: number; featured?: boolean}) {
 const {lang, words} = usePortfolio();
 const [activated, setActivated] = useState(false);
 const [playerMode, setPlayerMode] = useState<PlayerMode>('privacy');
 const [attempt, setAttempt] = useState(0);
 const id = safeYoutubeId(item.youtubeId);
 const poster = safeUrl(item.posterUrl);

 useEffect(() => {
  setActivated(false);
  setPlayerMode('privacy');
  setAttempt(0);
 }, [id]);

 // YouTube needs the embedding site's Referer. Do not change this to no-referrer.
 // The second domain is a user-initiated fallback, never loaded automatically.
 const host = playerMode === 'privacy' ? 'www.youtube-nocookie.com' : 'www.youtube.com';
 const embedUrl = id ? `https://${host}/embed/${encodeURIComponent(id)}?autoplay=${playerMode === 'privacy' ? '1' : '0'}&rel=0&playsinline=1` : '';
 const videoUrl = id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : undefined;

 return <article className={`video-card ${featured ? 'video-featured' : ''}`}>
  <div className="video-box">
   {activated && id ? (
    <iframe
     key={`${id}-${playerMode}-${attempt}`}
     loading="eager"
     className="video-frame"
     src={embedUrl}
     title={`${t(item.title, lang)} — YouTube video`}
     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
     referrerPolicy="strict-origin-when-cross-origin"
     allowFullScreen
    />
   ) : (
    <div className="video-facade">
     {poster ? <MediaImage loading="lazy" src={poster} alt="" onError={event => {event.currentTarget.style.display = 'none';}}/> : <div className="video-cover-art" aria-hidden="true"><span>MOUSSA</span><span>TOURE</span></div>}
     <button disabled={!id} className="video-play" onClick={() => setActivated(true)} aria-label={`${words.videoConsent}: ${t(item.title, lang)}`}><Play size={26} fill="currentColor"/></button>
     <span className="video-consent">{words.videoPrivacy}</span>
    </div>
   )}
  </div>
  {activated && id && (
   <div className="video-recovery">
    <span className="video-recovery-hint">{words.videoTroubleshoot}</span>
    <div className="video-recovery-actions">
     <button type="button" onClick={() => {setPlayerMode(mode => mode === 'privacy' ? 'standard' : 'privacy'); setAttempt(0);}}>
      {playerMode === 'privacy' ? words.videoTryStandard : words.videoTryPrivate}
     </button>
     <button type="button" onClick={() => setAttempt(n => n + 1)}><RefreshCw size={13} aria-hidden="true"/>{words.videoRetry}</button>
    </div>
    {playerMode === 'standard' && <p className="video-standard-notice">{words.videoStandardPrivacy}</p>}
   </div>
  )}
  <div className="video-caption">
   <span className="micro-label">FILM / {String(number).padStart(2, '0')}</span>
   <h3>{t(item.title, lang)}</h3>
   {videoUrl && <a className="external-link" target="_blank" rel="noopener noreferrer" href={videoUrl} aria-label={`${words.watchExternal}: ${t(item.title, lang)}`}>{words.watchExternal}<ArrowUpRight size={15}/></a>}
  </div>
  <p className="video-description">{t(item.description, lang)} <span className="video-note">{words.videoIssues}</span></p>
 </article>;
}
