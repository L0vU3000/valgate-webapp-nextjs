import { useState } from "react";
import { PropertyLayout } from "../components/property/PropertyLayout";
import {
  ZoomIn,
  ZoomOut,
  Minus,
  Plus,
  Box,
  Ruler,
  Maximize2,
  Compass,
} from "lucide-react";

type ViewMode = "default" | "expanded" | "full";

export function PropertySpatialPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [activeInfoTab, setActiveInfoTab] = useState("Zoning");
  const [satelliteView, setSatelliteView] = useState(true);
  const [terrain, setTerrain] = useState(true);
  const [boundaries, setBoundaries] = useState(true);
  const [labels, setLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  return (
    <PropertyLayout activeTab="spatial">
      <div className="h-full max-w-[1160px] mx-auto w-full flex flex-col overflow-auto">
        {viewMode === "full" ? (
          <FullView viewMode={viewMode} setViewMode={setViewMode} showLegend={showLegend} setShowLegend={setShowLegend} />
        ) : viewMode === "expanded" ? (
          <ExpandedView viewMode={viewMode} setViewMode={setViewMode} showLegend={showLegend} setShowLegend={setShowLegend} activeInfoTab={activeInfoTab} setActiveInfoTab={setActiveInfoTab} />
        ) : (
          <DefaultView viewMode={viewMode} setViewMode={setViewMode} showLegend={showLegend} setShowLegend={setShowLegend} satelliteView={satelliteView} setSatelliteView={setSatelliteView} terrain={terrain} setTerrain={setTerrain} boundaries={boundaries} setBoundaries={setBoundaries} labels={labels} setLabels={setLabels} />
        )}
      </div>
    </PropertyLayout>
  );
}

function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-[#1a1d2e] flex flex-col items-center justify-center relative">
      <Box className="w-16 h-16 text-[#515D66] mb-4" />
      <p className="text-[20px] text-[#8591A0]" style={{ fontWeight: 600 }}>3D Aerial View</p>
      <p className="text-[14px] text-[#515D66] mt-1">Interactive terrain scan - Full immersive mode</p>
    </div>
  );
}

function BorderLegend({ showLegend, setShowLegend, compact = false }: { showLegend: boolean; setShowLegend: (v: boolean) => void; compact?: boolean }) {
  if (!showLegend) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-4 w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-primary text-[12px]" style={{ fontWeight: 600 }}>BORDER LEGEND</span>
        <button onClick={() => setShowLegend(!showLegend)} className="text-muted-foreground">
          {compact ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-primary" /><span className="text-[12px] text-foreground">Property Line</span></div>
        <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-destructive" /><span className="text-[12px] text-foreground">Easement</span></div>
        <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-[#F59E0B]" /><span className="text-[12px] text-foreground">Setback Zone</span></div>
      </div>
    </div>
  );
}

function ZoomControls() {
  return (
    <div className="flex flex-col gap-2">
      <button className="bg-card border border-border rounded-xl p-2 hover:bg-accent/50"><ZoomIn className="w-6 h-6 text-muted-foreground" /></button>
      <button className="bg-card border border-border rounded-xl p-2 hover:bg-accent/50"><ZoomOut className="w-6 h-6 text-muted-foreground" /></button>
    </div>
  );
}

function FullView({ viewMode, setViewMode, showLegend, setShowLegend }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void; showLegend: boolean; setShowLegend: (v: boolean) => void }) {
  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-[30px] text-foreground font-['Plus_Jakarta_Sans',sans-serif]" style={{ fontWeight: 600 }}>
          Valuation for <span style={{ fontWeight: 800 }}>SR00015</span>
        </h2>
      </div>
      <div className="mx-6 h-[360px] rounded-xl overflow-hidden relative shrink-0">
        <MapPlaceholder />
        <div className="absolute top-4 right-4 flex gap-3">
          <ZoomControls />
          <BorderLegend showLegend={showLegend} setShowLegend={setShowLegend} compact />
        </div>
        <button onClick={() => setViewMode("expanded")} className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-[14px] hover:bg-primary/90">Full Screen View</button>
      </div>
      <div className="px-6 py-6 grid grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[12px] text-muted-foreground mb-1">Total Land Size</p>
          <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>2,450 m<sup>2</sup></p>
          <p className="text-[12px] text-muted-foreground mt-1">0.245 hectares</p>
          <div className="flex gap-8 mt-4">
            <div><p className="text-[12px] text-muted-foreground">Width</p><p className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>45.2m</p></div>
            <div><p className="text-[12px] text-muted-foreground">Length</p><p className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>54.3m</p></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[12px] text-muted-foreground mb-1">Current Zoning</p>
          <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>Agricultural Zone</p>
          <span className="inline-block mt-1 bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded text-[12px]">A-2 Classification</span>
          <div className="mt-3 text-[12px] text-muted-foreground space-y-0.5">
            <p>Development Potential</p><p>Residential Subdivision</p><p>Up to 6 residential units permitted</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[12px] text-muted-foreground mb-1">Elevation Range</p>
          <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>125m</p>
          <p className="text-[12px] text-muted-foreground mt-1">Above sea level</p>
          <div className="flex gap-8 mt-4">
            <div><p className="text-[12px] text-muted-foreground">Slope</p><p className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>2.5°</p></div>
            <div><p className="text-[12px] text-muted-foreground">Terrain</p><p className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Flat</p></div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-8 grid grid-cols-12 gap-6">
        <div className="col-span-7 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Comparable Properties in Your Area</p>
              <p className="text-[12px] text-muted-foreground">Properties similar to yours that sold recently</p>
            </div>
            <button className="text-primary text-[12px] flex items-center gap-1">Export Coordinates ↓</button>
          </div>
          <table className="w-full text-[12px]">
            <thead><tr className="text-muted-foreground border-b border-border"><th className="text-left pb-2">CORNER</th><th className="text-left pb-2">LATITUDE</th><th className="text-left pb-2">LONGITUDE</th><th className="text-left pb-2">BEARING</th></tr></thead>
            <tbody>
              {[1,2,3,4].map((i) => (
                <tr key={i} className="border-b border-border"><td className="py-2 text-foreground">Northeast</td><td className="py-2 text-foreground">11.5564°N</td><td className="py-2 text-foreground">104.9282°E</td><td className="py-2 text-foreground">45°</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-4 text-[12px]">
            <span className="text-muted-foreground">Average comp price: <span className="text-foreground" style={{ fontWeight: 600 }}>$492,100</span></span>
            <span className="text-muted-foreground">Your estimated value: <span className="text-foreground" style={{ fontWeight: 600 }}>$485,000</span></span>
          </div>
        </div>
        <div className="col-span-5 bg-card border border-border rounded-xl p-4">
          <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Investment Metrics</p>
          <p className="text-[12px] text-muted-foreground mb-1">Price per m<sup>2</sup></p>
          <p className="text-[30px] text-foreground" style={{ fontWeight: 700 }}>$245</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#059669] text-[12px]">↑ +12%</span>
            <span className="text-[12px] text-muted-foreground">vs. avg area price</span>
          </div>
          <div className="space-y-3">
            {[{area:"2,380 m²",dist:"0.3 km away",time:"2 months ago",price:"$238/m²"},{area:"2,650 m²",dist:"0.5 km away",time:"4 months ago",price:"$252/m²"},{area:"2,100 m²",dist:"0.8 km away",time:"5 months ago",price:"$229/m²"}].map((comp,i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <div><p className="text-foreground">{comp.area} nearby</p><p className="text-muted-foreground">{comp.dist} · {comp.time}</p></div>
                <span className="text-foreground">{comp.price}</span>
              </div>
            ))}
          </div>
          <button className="text-primary text-[12px] mt-3">View all comparables →</button>
        </div>
      </div>
    </div>
  );
}

function ExpandedView({ viewMode, setViewMode, showLegend, setShowLegend, activeInfoTab, setActiveInfoTab }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void; showLegend: boolean; setShowLegend: (v: boolean) => void; activeInfoTab: string; setActiveInfoTab: (v: string) => void }) {
  const infoTabs = ["Measurements","Zoning","Boundaries","Investment"];
  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 min-h-[400px]">
        <MapPlaceholder />
        <div className="absolute top-4 right-4 flex gap-3"><ZoomControls /><BorderLegend showLegend={showLegend} setShowLegend={setShowLegend} compact /></div>
      </div>
      <div className="bg-card border-t border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-8">
            <div><p className="text-[12px] text-muted-foreground">Total Area</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>2,450 m<sup>2</sup></p></div>
            <div><p className="text-[12px] text-muted-foreground">Zoning</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>Agricultural</p></div>
            <div><p className="text-[12px] text-muted-foreground">Elevation</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>125m</p></div>
            <div><p className="text-[12px] text-muted-foreground">Price/m2</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>$245</p></div>
          </div>
          <button onClick={() => setViewMode("full")} className="text-muted-foreground hover:text-foreground"><Maximize2 className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-6 border-b border-border mb-4">
          {infoTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveInfoTab(tab)} className={`pb-2 text-[14px] border-b-2 transition-colors ${activeInfoTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}>{tab}</button>
          ))}
        </div>
        {activeInfoTab === "Zoning" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div><p className="text-[12px] text-muted-foreground">Current Zoning</p><p className="text-[20px] text-foreground" style={{ fontWeight: 700 }}>Agricultural Zone</p></div>
              <span className="bg-[#ECFDF5] text-[#059669] px-3 py-1 rounded text-[12px]">A-2 Classification</span>
              <div className="text-[12px] text-muted-foreground"><p>Development Potential</p><p>Residential Subdivision</p><p>Up to 6 residential units permitted</p></div>
            </div>
            <button onClick={() => setViewMode("full")} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-[14px] hover:bg-primary/90">Full Details</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultView({ viewMode, setViewMode, showLegend, setShowLegend, satelliteView, setSatelliteView, terrain, setTerrain, boundaries, setBoundaries, labels, setLabels }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void; showLegend: boolean; setShowLegend: (v: boolean) => void; satelliteView: boolean; setSatelliteView: (v: boolean) => void; terrain: boolean; setTerrain: (v: boolean) => void; boundaries: boolean; setBoundaries: (v: boolean) => void; labels: boolean; setLabels: (v: boolean) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1">
        <MapPlaceholder />
        <div className="absolute top-4 right-4 flex gap-3">
          <ZoomControls />
          <div className="flex flex-col gap-3">
            <BorderLegend showLegend={showLegend} setShowLegend={setShowLegend} />
            <div className="bg-card border border-border rounded-xl p-4 w-[200px]">
              <p className="text-primary text-[12px] mb-3" style={{ fontWeight: 600 }}>LAYERS</p>
              <div className="space-y-3">
                <LayerToggle label="Satellite View" enabled={satelliteView} onChange={setSatelliteView} />
                <LayerToggle label="Terrain" enabled={terrain} onChange={setTerrain} />
                <LayerToggle label="Boundaries" enabled={boundaries} onChange={setBoundaries} />
                <LayerToggle label="Labels" enabled={labels} onChange={setLabels} />
              </div>
              <p className="text-primary text-[12px] mt-4 mb-3" style={{ fontWeight: 600 }}>TOOLS</p>
              <div className="space-y-2">
                <button className="flex items-center gap-2 text-[12px] text-foreground hover:bg-accent/50 w-full p-2 rounded"><Ruler className="w-4 h-4" />Measure Distance</button>
                <button className="flex items-center gap-2 text-[12px] text-foreground hover:bg-accent/50 w-full p-2 rounded"><Maximize2 className="w-4 h-4" />Measure Area</button>
                <button className="flex items-center gap-2 text-[12px] text-foreground hover:bg-accent/50 w-full p-2 rounded"><Compass className="w-4 h-4" />Reset View</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between">
        <div className="flex gap-8">
          <div><p className="text-[12px] text-muted-foreground">Total Area</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>2,450 m<sup>2</sup></p></div>
          <div><p className="text-[12px] text-muted-foreground">Zoning</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>Agricultural</p></div>
          <div><p className="text-[12px] text-muted-foreground">Elevation</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>125m</p></div>
          <div><p className="text-[12px] text-muted-foreground">Price/m2</p><p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>$245</p></div>
        </div>
        <button onClick={() => setViewMode("expanded")} className="text-muted-foreground hover:text-foreground"><Maximize2 className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function LayerToggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-foreground">{label}</span>
      <button onClick={() => onChange(!enabled)} className={`w-9 h-5 rounded-full transition-colors relative ${enabled ? "bg-primary" : "bg-muted"}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}