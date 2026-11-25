"use client";

import { useState } from "react";
import Image from "next/image";

interface HeaderBackdropProps {
  src?: string;
  position?: string;
}

/**
 * Latar foto gedung sekolah bernuansa fade gaya halaman login
 * untuk menyatukan identitas visual seluruh header halaman SIMESA.
 */
export function HeaderBackdrop({
  src = "/school-building.jpg",
  position = "object-center",
}: HeaderBackdropProps) {
  const [loaded, setLoaded] = useState(true);

  return (
    <>
      {loaded && (
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          unoptimized
          priority
          className={`object-cover ${position} opacity-35 mix-blend-luminosity filter contrast-125 brightness-95 pointer-events-none select-none`}
          onError={() => setLoaded(false)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#091424]/70 via-[#0d1e38]/65 to-[#0a1526]/92 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#091424]/75 via-transparent to-[#091424]/75 pointer-events-none" />
    </>
  );
}
