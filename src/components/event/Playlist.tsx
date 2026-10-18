import Image from "next/image";
import { BadgeCheck, Bookmark, MoreHorizontal, Music, Share2 } from "lucide-react";
import type { EventPlaylist } from "@/types/event";

export default function Playlist({ playlist }: { playlist: EventPlaylist }) {
  return (
    <section id="playlist" aria-labelledby="playlist-heading" className="scroll-mt-36 bg-[#0b0c10]">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-16 lg:py-[38px] lg:pb-16">
        <p className="text-[13px] font-bold tracking-wide text-[#66fcf1]">PLAYLIST</p>
        <h2 id="playlist-heading" className="mt-3 font-display text-[26px] font-bold leading-[34px] text-white">
          Listen before the show
        </h2>

        <div className="mt-8 flex flex-col overflow-hidden rounded-2xl bg-[#1f2833] lg:mt-[38px] lg:flex-row">
          <div className="flex shrink-0 flex-col gap-5 bg-[#161d27] px-7 pb-7 pt-8 lg:w-[300px]">
            {playlist.coverUrl && (
              <div className="relative aspect-square w-full max-w-[244px] overflow-hidden rounded-xl bg-[#1f2833]">
                <Image
                  src={playlist.coverUrl}
                  alt=""
                  fill
                  unoptimized={playlist.coverUrl.startsWith("http")}
                  sizes="244px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="font-geist">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#c5c6c7]">{playlist.label}</p>
              <p className="mt-[5px] text-xl font-bold leading-[25px] tracking-[-0.4px] text-white">{playlist.title}</p>
            </div>
            <div aria-hidden className="flex items-center gap-4 text-[#c5c6c7]">
              {[Bookmark, Share2, MoreHorizontal].map((Icon, i) => (
                <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              ))}
            </div>
          </div>

          <ol className="min-w-0 flex-1 px-4 py-3 lg:pl-4 lg:pr-6">
            {playlist.tracks.map((t, i) => (
              <li key={t.id} className={i > 0 ? "border-t border-white/[0.03]" : ""}>
                <div className="flex items-center gap-[18px] rounded-[10px] px-2.5 py-[9px] font-geist">
                  <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg bg-[#161d27] sm:w-[140px]">
                    {t.thumbUrl && (
                      <Image
                        src={t.thumbUrl}
                        alt=""
                        fill
                        unoptimized={t.thumbUrl.startsWith("http")}
                        sizes="140px"
                        className="object-cover"
                      />
                    )}
                    {t.duration && (
                      <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/80 px-[7px] py-1 text-[11px] font-semibold text-white">
                        <Music aria-hidden className="h-[11px] w-[11px]" />
                        {t.duration}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{t.title}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#c5c6c7]">
                      {t.artist}
                      {t.verified && <BadgeCheck aria-label="Verified" className="h-3.5 w-3.5 text-[#66fcf1]" />}
                    </p>
                    {(t.views || t.publishedAgo) && (
                      <p className="mt-1.5 text-xs text-[#8a8b8c]">
                        {[t.views, t.publishedAgo].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
