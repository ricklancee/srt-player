import srtParser2 from "srt-parser-2";
import srt from "./test.srt?raw";

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
} from "lucide-react";
const parser = new srtParser2();

const parsedSrt = parser.fromSrt(srt);

type SRT = (typeof parsedSrt)[0];
console.log(parsedSrt);

function Subtitle({ srtText, shadow }: { srtText: string; shadow?: boolean }) {
  const html = DOMPurify.sanitize(srtText.replace(/\n/g, "<br />"), {
    ALLOWED_TAGS: ["i", "b", "u", "br"],
    ALLOWED_ATTR: [],
  });

  return (
    <div
      className={`font-[Arial] text-center text-white font-semibold text-[clamp(1rem,8vw,4rem)] leading-snug ${
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
            className="w-[1px] h-full bg-blue-50 absolute top-0 hover:scale-y-150 hover:scale-x-200 opacity-50 hover:opacity-100"
            style={{ left: `${percent}%` }}
          />
        );
      })}
    </div>
  );
}

function App() {
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

  const displayedSrt = getCurrentSrt(totalMilliseconds, parsedSrt);

  useEffect(() => {
    if (displayedSrt) {
      const currentIndex = parsedSrt.indexOf(displayedSrt);
      setCurrentSrtIndex(currentIndex);
    } else {
      setCurrentSrtIndex(null);
    }
  }, [displayedSrt]);

  return (
    <main className="h-svh w-svw flex flex-col" ref={mainRef}>
      <div
        className="position fixed top-0 right-0 p-4"
        onClick={() => handleToggleFullscreen()}
      >
        {isFullscreen ? <Shrink /> : <Expand />}
      </div>
      {displayedSrt && (
        <div className="flex-1 items-center justify-center flex">
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
      <div className="mt-auto">
        <div className="flex justify-between items-center p-4 text-white">
          <button
            type="button"
            onClick={() => {
              const currentIndex = currentSrtIndex ?? 0;
              const srt = parsedSrt[Math.max(currentIndex - 1, 0)];

              reset(getOffsetTimeFromSrt(srt), isRunning);
            }}
          >
            <ArrowLeft />
          </button>
          {isRunning ? (
            <button onClick={() => pause()}>
              <Pause />
            </button>
          ) : (
            <button onClick={() => start()}>
              <Play />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const currentIndex = currentSrtIndex ?? 0;
              setCurrentSrtIndex(
                Math.min(currentIndex + 1, parsedSrt.length - 1)
              );

              const srt =
                parsedSrt[Math.min(currentIndex + 1, parsedSrt.length - 1)];

              reset(getOffsetTimeFromSrt(srt), isRunning);
            }}
          >
            <ArrowRight />
          </button>
        </div>
        <div className="w-full">
          <div className="flex justify-center items-center p-2 text-white">
            <span className="text-sm text-gray-500">
              {formatSrtTimestamp(totalMilliseconds)}
            </span>
          </div>
          <SubtitleBar
            srts={parsedSrt}
            onClick={(srt, index) => {
              setCurrentSrtIndex(index);

              reset(getOffsetTimeFromSrt(srt), isRunning);
            }}
          />
        </div>
      </div>
    </main>
  );
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
