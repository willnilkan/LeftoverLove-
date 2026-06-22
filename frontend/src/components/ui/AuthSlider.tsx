import { useEffect, useState } from "react";

type AuthSliderProps = {
  images?: string[];
  intervalMs?: number;
};

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=80",
];

const AuthSlider = ({ images = DEFAULT_IMAGES, intervalMs = 4000 }: AuthSliderProps) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div className="w-full h-full relative bg-gray-100">
      {images.map((src, i) => (
        <div
          key={src + i}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === index ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <img src={src} alt={`slide-${i + 1}`} className="w-full h-full object-cover" />
        </div>
      ))}

      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 w-8 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AuthSlider;
