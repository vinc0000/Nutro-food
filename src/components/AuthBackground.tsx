import { useEffect, useState } from 'react';

// Curated fine-dining photography (Pexels, free for commercial use, no attribution
// required — see pexels.com/license). Slow crossfade behind the auth forms.
const DISHES = [
  'https://images.pexels.com/photos/34106025/pexels-photo-34106025.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/16580975/pexels-photo-16580975.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/22711497/pexels-photo-22711497.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/34989247/pexels-photo-34989247.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/16580973/pexels-photo-16580973.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/34874927/pexels-photo-34874927.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/33033791/pexels-photo-33033791.jpeg?auto=compress&cs=tinysrgb&w=1600',
];

export default function AuthBackground() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % DISHES.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {DISHES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-center bg-cover transition-opacity duration-[2000ms] ease-in-out"
          style={{ backgroundImage: `url(${src})`, opacity: i === index ? 1 : 0 }}
        />
      ))}
      {/* Dark gradient so the form card stays readable over any dish */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,15,12,0.75) 0%, rgba(10,15,12,0.55) 45%, rgba(10,15,12,0.85) 100%)' }} />
    </div>
  );
}
