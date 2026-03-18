import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ZoomIn, ZoomOut, Layers, MapPin } from "lucide-react";

const properties = [
  { id: 1, name: "Land near river", x: 30, y: 35 },
  { id: 2, name: "Siem Reap Land Plot", x: 45, y: 25 },
  { id: 3, name: "Kampong Chhnang", x: 55, y: 40 },
  { id: 4, name: "Angkor Property", x: 40, y: 55 },
  { id: 5, name: "Temple View Land", x: 65, y: 30 },
  { id: 6, name: "Central Siem Reap", x: 50, y: 60 },
  { id: 7, name: "Commercial Building", x: 35, y: 70 },
  { id: 8, name: "Prey Veng Agricultural", x: 70, y: 50 },
];

export function MapPage() {
  return (
    <div className="h-full relative font-['Inter',sans-serif]">
      {/* Map background */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1645948715176-2641d507050f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBtYXAlMjBwaG5vbSUyMHBlbmglMjBjaXR5fGVufDF8fHx8MTc3MzczNDYxOHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Map"
          className="w-full h-full object-cover opacity-60"
        />
      </div>

      {/* Map pins */}
      {properties.map((p) => (
        <button
          key={p.id}
          className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <div className="w-5 h-5 bg-primary rounded-full border-2 border-white shadow-lg group-hover:scale-125 transition-transform" />
          <div className="absolute left-1/2 -translate-x-1/2 top-7 bg-card border border-border rounded-lg px-2 py-1 text-[12px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
            {p.name}
          </div>
        </button>
      ))}

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button className="bg-card border border-border rounded-xl p-2 hover:bg-accent/50 shadow-md">
          <ZoomIn className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="bg-card border border-border rounded-xl p-2 hover:bg-accent/50 shadow-md">
          <ZoomOut className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="bg-card border border-border rounded-xl p-2 hover:bg-accent/50 shadow-md">
          <Layers className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Top info */}
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-[20px] text-foreground bg-card/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-border shadow-md" style={{ fontWeight: 600 }}>
          <MapPin className="w-5 h-5 inline mr-2 text-primary" />
          Property Map View
        </h2>
      </div>
    </div>
  );
}
