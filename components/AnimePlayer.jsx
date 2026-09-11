'use client';

export default function AnimePlayer({ embedUrl, title }) {
  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-black">
      <iframe src={embedUrl} title={title} className="w-full h-full border-0" allow="autoplay; fullscreen" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
    </div>
  );
}
