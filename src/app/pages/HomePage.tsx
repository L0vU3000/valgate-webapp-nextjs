import { useState } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  ZoomIn,
  ZoomOut,
  StickyNote,
  X,
  Star,
  Sun,
  Moon,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const mapPins = [
  { id: 1, x: 28, y: 22, label: "Land near river", cluster: false },
  { id: 2, x: 38, y: 35, label: "Siem Reap Land Plot", cluster: false },
  { id: 3, x: 45, y: 28, label: "Kampong Chhnang Prop.", cluster: true, count: 2 },
  { id: 4, x: 52, y: 18, label: "Angkor Property", cluster: false },
  { id: 5, x: 60, y: 32, label: "Temple View Land", cluster: false },
  { id: 6, x: 35, y: 45, label: "Central Siem Reap", cluster: true, count: 2 },
  { id: 7, x: 48, y: 50, label: "Commercial Building", cluster: false },
  { id: 8, x: 68, y: 25, label: "Prey Veng Agricultural", cluster: false },
  { id: 9, x: 42, y: 15, label: "Riverside Plot", cluster: false },
  { id: 10, x: 55, y: 45, label: "Phnom Penh Urban", cluster: false },
];

const properties = [
  {
    id: 1,
    name: "Land near river",
    code: "PP00016 PH",
    type: "House",
    typeColor: "#0284C7",
    typeBg: "#ECFDF5",
    province: "Phnom Penh",
    status: "Rented",
    statusColor: "#059669",
    statusBg: "#ECFDF5",
    size: "850",
    buy: "$1,278,000",
    title: "Hard title",
    titleColor: "#2563EB",
    health: 100,
    healthColor: "#059669",
  },
  {
    id: 2,
    name: "Siem Reap Land Plot",
    code: "SR00015 Land",
    type: "Land",
    typeColor: "#0284C7",
    typeBg: "#ECFDF5",
    province: "Siem Reap",
    status: "Vacant",
    statusColor: "#F59E0B",
    statusBg: "#FFFBEB",
    size: "1,200",
    buy: "$456,000",
    title: "Soft title",
    titleColor: "#F59E0B",
    health: 28,
    healthColor: "#E11D48",
  },
];

export function HomePage() {
  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(true);
  const navigate = useNavigate();

  const bgClass = isDark
    ? "bg-[#0F1117]"
    : "bg-[#F5F6F7]";
  const textClass = isDark ? "text-white" : "text-[#14181B]";
  const subtextClass = isDark ? "text-[#8591A0]" : "text-[#515D66]";
  const cardBg = isDark
    ? "bg-[rgba(17,20,32,0.85)] border-[rgba(255,255,255,0.1)]"
    : "bg-[rgba(255,255,255,0.85)] border-[rgba(255,255,255,0.55)]";
  const navBg = isDark
    ? "bg-[rgba(17,20,32,0.65)] border-[rgba(255,255,255,0.15)]"
    : "bg-[rgba(255,255,255,0.42)] border-[rgba(255,255,255,0.55)]";
  const tableBg = isDark ? "bg-[#111420]" : "bg-white";
  const tableBorder = isDark ? "border-[#202334]" : "border-[#E8EAED]";
  const mapOverlay = isDark ? "brightness-[0.3] contrast-[1.2]" : "brightness-[1] contrast-[1]";

  return (
    <div className={`flex flex-col h-screen w-full ${bgClass} font-['Inter',sans-serif] relative`}>
      {/* Map area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Map background */}
        <div className={`absolute inset-0 ${mapOverlay}`}>
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1645948715176-2641d507050f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBtYXAlMjBwaG5vbSUyMHBlbmglMjBjaXR5fGVufDF8fHx8MTc3MzczNDYxOHww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Map"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Top toolbar */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-4 z-10">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-[30px] flex items-center justify-center">
              <svg width="33" height="25" viewBox="0 0 33 25" fill="none">
                <path d="M8.5 0L0 25h8l4-12.5L16.5 25h8L16 0H8.5Z" fill="#2563EB" />
              </svg>
            </div>
            <span className={`text-[32px] tracking-[0.64px] ${textClass} font-light font-['Helvetica_Neue',sans-serif]`}>
              Valgate
            </span>
          </div>

          {/* Nav */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-[14px]">
              Home
            </button>
            {["Portfolio", "Map", "Analytics", "Succession"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  if (item === "Portfolio") navigate("/portfolio");
                  else if (item === "Analytics") navigate("/analytics");
                  else if (item === "Succession") navigate("/succession");
                }}
                className={`${navBg} border backdrop-blur-sm px-4 py-2 rounded-md text-[14px] ${subtextClass} shadow-[0px_4px_16px_0px_rgba(0,0,0,0.1)] hover:opacity-80 transition-opacity`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3 shrink-0">
            <IconButton isDark={isDark}><RefreshCw className="w-6 h-6" /></IconButton>
            <IconButton isDark={isDark}><ZoomIn className="w-6 h-6" /></IconButton>
            <IconButton isDark={isDark}><ZoomOut className="w-6 h-6" /></IconButton>
            <IconButton isDark={isDark}><StickyNote className="w-6 h-6" /></IconButton>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`${navBg} border backdrop-blur-sm p-2 rounded-xl shadow-[0px_4px_16px_0px_rgba(0,0,0,0.1)]`}
            >
              {isDark ? (
                <Sun className={`w-6 h-6 ${subtextClass}`} />
              ) : (
                <Moon className={`w-6 h-6 ${subtextClass}`} />
              )}
            </button>
          </div>
        </div>

        {/* Left overlay */}
        <div className="absolute left-10 top-20 z-10">
          <div className={`${textClass} text-shadow-[0px_4px_8.8px_rgba(0,0,0,0.37)]`}>
            <h1 className="text-[48px] tracking-[-0.576px] leading-[48px] font-['Inter',sans-serif]" style={{ fontWeight: 800 }}>
              Jon Doe's
              <br />
              Properties
            </h1>
          </div>
          <p className={`mt-2 text-[12px] ${subtextClass} max-w-[223px]`}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
          <div className="flex gap-3 mt-3">
            <IconButton isDark={isDark}><RefreshCw className="w-6 h-6" /></IconButton>
            <IconButton isDark={isDark}><ZoomIn className="w-6 h-6" /></IconButton>
            <IconButton isDark={isDark}><ZoomOut className="w-6 h-6" /></IconButton>
            <IconButton isDark={isDark}><StickyNote className="w-6 h-6" /></IconButton>
          </div>
        </div>

        {/* Map pins */}
        {mapPins.map((pin) => (
          <button
            key={pin.id}
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
          >
            <div className="relative">
              <div className="w-5 h-5 bg-primary rounded-full border-2 border-white shadow-lg" />
              {pin.cluster && (
                <div className="absolute -top-1 -right-2 bg-[#14181B] text-white text-[12px] w-[17px] h-[17px] rounded-full flex items-center justify-center">
                  {pin.count}
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Right sidebar controls */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
          <IconButton isDark={isDark}><RefreshCw className="w-6 h-6" /></IconButton>
          <IconButton isDark={isDark}><RefreshCw className="w-6 h-6" /></IconButton>
          <IconButton isDark={isDark}><ZoomIn className="w-6 h-6" /></IconButton>
          <IconButton isDark={isDark}><ZoomOut className="w-6 h-6" /></IconButton>
          <IconButton isDark={isDark}><StickyNote className="w-6 h-6" /></IconButton>
        </div>

        {/* Info panel */}
        {selectedPin && (
          <div
            className={`absolute right-16 top-1/4 w-[292px] ${cardBg} border rounded-xl backdrop-blur-sm shadow-[0px_8px_32px_0px_rgba(0,0,0,0.2)] z-20 overflow-hidden`}
          >
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1665691964802-956fc06b93cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3VzZSUyMGRyaXZld2F5JTIwbmlnaHR8ZW58MXx8fHwxNzczNzM0NjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Property"
                className="w-full h-[205px] object-cover"
              />
              <button
                onClick={() => setSelectedPin(null)}
                className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md"
              >
                <X className="w-[9px] h-[9px] text-black" />
              </button>
            </div>
            <div className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-[14px] ${textClass}`}>House in Phnom Penh</p>
                  <p className={`text-[14px] ${subtextClass}`}>Modern Studio</p>
                  <p className={`text-[14px] ${subtextClass}`}>1 bed</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className={`w-[18px] h-[18px] ${subtextClass}`} fill="currentColor" />
                  <span className={`text-[14px] ${subtextClass}`}>New</span>
                </div>
              </div>
              <div className="mt-1">
                <p className={`text-[14px] ${subtextClass}`}>$36 for 1 night</p>
                <p className={`text-[10px] ${subtextClass}`}>Free cancellation</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Properties table */}
      <div className={`${tableBg} border-t ${tableBorder} px-6 py-4`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-[20px] ${textClass} font-['Plus_Jakarta_Sans',sans-serif]`} style={{ fontWeight: 600 }}>
            Properties
          </h2>
          <button
            onClick={() => navigate("/portfolio")}
            className={`border ${tableBorder} rounded-lg px-4 py-2 text-[14px] ${textClass} hover:bg-accent/50 transition-colors`}
          >
            Full List
          </button>
        </div>

        <table className="w-full text-[14px]">
          <thead>
            <tr className={`border-b ${tableBorder}`}>
              <th className="text-left py-3 px-4 w-8">
                <input type="checkbox" className="rounded" />
              </th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>#</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Property</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Type</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Province</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Status</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Size</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Buy</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Title</th>
              <th className={`text-left py-3 px-4 text-[12px] ${subtextClass} tracking-[0.012px]`}>Health</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p, i) => (
              <tr key={p.id} className={`border-b ${tableBorder} hover:bg-accent/30 transition-colors cursor-pointer`}>
                <td className="py-3 px-4">
                  <input type="checkbox" className="rounded" />
                </td>
                <td className={`py-3 px-4 ${subtextClass}`}>{i + 1}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-xl shrink-0" />
                    <div>
                      <p className={`${textClass}`}>{p.name}</p>
                      <p className={`text-[12px] ${subtextClass}`}>{p.code}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className="px-2 py-0.5 rounded-lg text-[12px]"
                    style={{ backgroundColor: p.typeBg, color: p.typeColor }}
                  >
                    {p.type}
                  </span>
                </td>
                <td className={`py-3 px-4 ${subtextClass}`}>{p.province}</td>
                <td className="py-3 px-4">
                  <span
                    className="px-2 py-0.5 rounded-lg text-[12px] text-white"
                    style={{ backgroundColor: p.statusColor }}
                  >
                    {p.status}
                  </span>
                </td>
                <td className={`py-3 px-4 ${subtextClass}`}>
                  {p.size} m<sup>2</sup>
                </td>
                <td className={`py-3 px-4 ${textClass}`}>{p.buy}</td>
                <td className="py-3 px-4">
                  <span className="text-[12px]" style={{ color: p.titleColor }}>
                    {p.title}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.healthColor }}
                    />
                    <span style={{ color: p.healthColor }} className="text-[14px]">
                      {p.health}%
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconButton({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  const bg = isDark
    ? "bg-[rgba(17,20,32,0.65)] border-[rgba(255,255,255,0.15)]"
    : "bg-[rgba(255,255,255,0.42)] border-[rgba(255,255,255,0.55)]";
  const text = isDark ? "text-[#8591A0]" : "text-[#515D66]";
  return (
    <button
      className={`${bg} border backdrop-blur-sm p-2 rounded-xl shadow-[0px_4px_16px_0px_rgba(0,0,0,0.1)] ${text} hover:opacity-80 transition-opacity`}
    >
      {children}
    </button>
  );
}
