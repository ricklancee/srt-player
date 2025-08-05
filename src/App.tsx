import srtParser2 from "srt-parser-2";

import { useStopwatch } from "react-timer-hook";
import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Expand,
  Pause,
  Play,
  Shrink,
  Upload,
} from "lucide-react";

type SRT = {
  startSeconds: number;
  startTime: string;
  endSeconds: number;
  endTime: string;
  text: string;
};

function Subtitle({ srtText, shadow }: { srtText: string; shadow?: boolean }) {
  const html = DOMPurify.sanitize(srtText.replace(/\n/g, "<br />"), {
    ALLOWED_TAGS: ["i", "b", "u", "br"],
    ALLOWED_ATTR: [],
  });

  return (
    <div
      className={`font-[Arial] text-center text-white font-semibold text-[clamp(1rem,5vw,2.5rem)] leading-snug ${
        shadow ? "scale-30 opacity-20" : ""
      }`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SubtitleBar({
  srts,
  onClick,
}: {
  srts: SRT[];
  onClick?: (srt: SRT, index: number) => void;
}) {
  const amountOfSrts = srts.length;

  const lastSrt = srts[amountOfSrts - 1];
  const startTime = 0;
  const lastSrtEndTime = lastSrt.endSeconds;

  return (
    <div className="w-[calc(100vw_-_24px)] h-6 relative mb-10 ml-[12px]">
      {srts.map((srt, index) => {
        const percent =
          ((srt.startSeconds - startTime) / (lastSrtEndTime - startTime)) * 100;

        return (
          <div
            key={index}
            onClick={() => onClick?.(srts[index], index)}
            className="w-[1px] h-full bg-[#8936FF]/30 absolute top-0 hover:scale-y-150 hover:scale-x-200 opacity-50 hover:opacity-100"
            style={{ left: `${percent}%` }}
          />
        );
      })}
    </div>
  );
}

const Player = ({ subtitles }: { subtitles: SRT[] }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = () => {
    toggleFullscreen(mainRef.current);
    setIsFullscreen(!isFullscreen);
  };

  const { totalMilliseconds, start, pause, isRunning, reset } = useStopwatch({
    autoStart: false,
    interval: 20,
  });

  const [currentSrtIndex, setCurrentSrtIndex] = useState<number | null>(null);

  const displayedSrt = getCurrentSrt(totalMilliseconds, subtitles);

  useEffect(() => {
    if (displayedSrt) {
      const currentIndex = subtitles.indexOf(displayedSrt);
      setCurrentSrtIndex(currentIndex);
    } else {
      setCurrentSrtIndex(null);
    }
  }, [displayedSrt, subtitles]);

  return (
    <main className="h-svh w-svw flex flex-col relative" ref={mainRef}>
      {document.fullscreenEnabled && (
        <div
          className="position fixed top-0 right-0 p-4"
          onClick={() => handleToggleFullscreen()}
        >
          {isFullscreen ? (
            <Shrink className="text-[#8936FF] hover:text-white transition-colors" />
          ) : (
            <Expand className="text-[#8936FF] hover:text-white transition-colors" />
          )}
        </div>
      )}
      {displayedSrt && (
        <div className="fixed inset-0 z-0 items-center justify-center flex">
          <div>
            <div className="flex items-center justify-center w-full">
              <div className="text-center">
                <Subtitle srtText={displayedSrt.text} />
                <p className="text-sm text-gray-500">
                  {displayedSrt.startTime} - {displayedSrt.endTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-auto z-10">
        <div>
          <div className="flex justify-between items-center p-4 text-white">
            <button
              type="button"
              onClick={() => {
                const currentIndex = currentSrtIndex ?? 0;
                const srt = subtitles[Math.max(currentIndex - 1, 0)];

                reset(getOffsetTimeFromSrt(srt), isRunning);
              }}
            >
              <ArrowLeft className="text-[#8936FF] hover:text-white transition-colors" />
            </button>
            {isRunning ? (
              <button onClick={() => pause()}>
                <Pause className="text-[#8936FF] hover:text-white transition-colors" />
              </button>
            ) : (
              <button onClick={() => start()}>
                <Play className="text-[#8936FF] hover:text-white transition-colors" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const currentIndex = currentSrtIndex ?? 0;
                setCurrentSrtIndex(
                  Math.min(currentIndex + 1, subtitles.length - 1)
                );

                const srt =
                  subtitles[Math.min(currentIndex + 1, subtitles.length - 1)];

                reset(getOffsetTimeFromSrt(srt), isRunning);
              }}
            >
              <ArrowRight className="text-[#8936FF] hover:text-white transition-colors" />
            </button>
          </div>
          <div className="w-full">
            <div className="flex justify-center items-center p-2 text-white">
              <span className="text-sm text-gray-500">
                {formatSrtTimestamp(totalMilliseconds)}
              </span>
            </div>
            <SubtitleBar
              srts={subtitles}
              onClick={(srt, index) => {
                setCurrentSrtIndex(index);

                reset(getOffsetTimeFromSrt(srt), isRunning);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

function SubtitleUploader({ onParsed }: { onParsed: (parsed: SRT[]) => void }) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parser = new srtParser2();
        const parsed = parser.fromSrt(text);
        onParsed(parsed);
      } catch (err) {
        alert("Invalid SRT file.");
        console.error(err);
      }
    };

    reader.readAsText(file);
  };

  return (
    <label className="group cursor-pointer flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/30 bg-white/5 px-6 py-10 text-white transition hover:bg-white/10">
      <Upload className="size-10 text-[#8936FF] group-hover:scale-110 transition-transform" />
      <span className="text-lg font-medium">Upload SRT File</span>
      <input
        type="file"
        accept=".srt"
        onChange={handleFileUpload}
        className="hidden"
      />
    </label>
  );
}

function App() {
  const [subs, setSubs] = useState<SRT[]>([]);

  if (subs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <SubtitleUploader
          onParsed={(parsed) => {
            setSubs(parsed);
          }}
        />
      </div>
    );
  }

  return <Player subtitles={subs} />;
}

function getOffsetTimeFromSrt(srt: SRT) {
  const now = new Date();

  const baseSeconds = Math.floor(srt.startSeconds);
  const extraMilliseconds = srt.startTime.includes(",")
    ? parseInt(srt.startTime.split(",")[1], 10)
    : 0;

  const offsetTime = new Date(now.getTime());
  offsetTime.setSeconds(offsetTime.getSeconds() + baseSeconds);
  offsetTime.setMilliseconds(offsetTime.getMilliseconds() + extraMilliseconds);

  return offsetTime;
}

export default App;

function formatSrtTimestamp(ms: number) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(
    milliseconds,
    3
  )}`;
}

function parseSrtTimeToMilliseconds(timeStr: string): number {
  const [timePart, msStr] = timeStr.split(",");
  const [hh, mm, ss] = timePart.split(":").map(Number);
  const ms = parseInt(msStr, 10);

  return (hh * 3600 + mm * 60 + ss) * 1000 + ms;
}

function getCurrentSrt(totalMilliseconds: number, srts: SRT[]): SRT | null {
  return (
    srts.find((srt) => {
      const start = parseSrtTimeToMilliseconds(srt.startTime);
      const end = parseSrtTimeToMilliseconds(srt.endTime);
      return totalMilliseconds >= start && totalMilliseconds < end;
    }) ?? null
  );
}

function toggleFullscreen(el: HTMLElement | null) {
  if (!el) return;

  if (!document.fullscreenElement) {
    el.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}
