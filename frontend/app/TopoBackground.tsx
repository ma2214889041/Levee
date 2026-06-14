"use client";

import { useEffect, useRef } from "react";
import { drawHeroTerrain } from "./lib/topo";

/**
 * Ambient background for the landing page: drifting aurora glow, the generative
 * topographic contour terrain (Levee's signature "monitored hillside"), and a
 * fine film grain. Client-only because the terrain renders to a <canvas>.
 */
export default function TopoBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const draw = () => {
      if (ref.current) drawHeroTerrain(ref.current);
    };
    draw();
    let rt: number | undefined;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(draw, 180);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <div className="aurora" aria-hidden>
        <b className="a1" />
        <b className="a2" />
        <b className="a3" />
      </div>
      <canvas id="topo" ref={ref} aria-hidden />
      <div className="grain" aria-hidden />
    </>
  );
}
