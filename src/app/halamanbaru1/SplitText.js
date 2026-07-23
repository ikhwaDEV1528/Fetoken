"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function SplitText({
  text,
  delay = 0,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars", // "chars", "words", "lines"
  from = {},
  to = {},
  onLetterAnimationComplete = () => {},
  className = "",
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const letters = containerRef.current.querySelectorAll(
      splitType === "chars" ? ".char" : splitType === "words" ? ".word" : ".line"
    );

    gsap.fromTo(
      letters,
      { ...from },
      {
        ...to,
        delay: delay / 1000,
        duration,
        ease,
        stagger: 0.05,
        onComplete: onLetterAnimationComplete,
      }
    );
  }, [from, to, delay, duration, ease, splitType, onLetterAnimationComplete]);

  const renderText = () => {
    if (splitType === "chars") {
      return text.split("").map((char, i) => (
        <span key={i} className="char inline-block">
          {char}
        </span>
      ));
    } else if (splitType === "words") {
      return text.split(" ").map((word, i) => (
        <span key={i} className="word inline-block mr-1">
          {word}
        </span>
      ));
    } else {
      return <span className="line">{text}</span>;
    }
  };

  return (
    <div ref={containerRef} className={className}>
      {renderText()}
    </div>
  );
}
