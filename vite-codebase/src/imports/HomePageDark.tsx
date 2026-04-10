import clsx from "clsx";
import svgPaths from "./svg-15lj9g58y1";
import imgBasemapImage from "figma:asset/1433fa21204c50e1491674f97690e91e209c1aa6.png";
import imgChartLegendItem from "figma:asset/0c4b91d017b16f80b7ec6eb0a74461682e28af0b.png";
import imgImageErrorLoadingImage from "figma:asset/7a6a72a0130aed30a2a19b7e27ee34663b11e5af.png";

function Container1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] h-[38px] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[2px] items-start relative size-full">{children}</div>
    </div>
  );
}

function Container({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-[#111420] relative rounded-[12px] shrink-0 size-[48px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">{children}</div>
    </div>
  );
}

function Wrapper4({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-[rgba(22,25,38,0.4)] relative rounded-[12px] shrink-0">
      <div className="content-stretch flex items-start overflow-clip p-[8px] relative rounded-[inherit]">{children}</div>
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.12)] border-solid inset-0 pointer-events-none rounded-[12px] shadow-[0px_4px_20px_0px_rgba(0,0,0,0.45)]" />
    </div>
  );
}
type Wrapper3Props = {
  additionalClassNames?: string;
};

function Wrapper3({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper3Props>) {
  return (
    <div className={additionalClassNames}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        {children}
      </svg>
    </div>
  );
}

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="h-[16px] relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">{children}</div>
    </div>
  );
}

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="absolute left-[8px] size-[12px] top-[4px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        {children}
      </svg>
    </div>
  );
}
type VectorProps = {
  additionalClassNames?: string;
};

function Vector({ children, additionalClassNames = "" }: React.PropsWithChildren<VectorProps>) {
  return (
    <div className={clsx("absolute", additionalClassNames)}>
      <div className="absolute inset-[-7.14%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          {children}
        </svg>
      </div>
    </div>
  );
}

function Wrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper1>
      <g id="Icon">{children}</g>
    </Wrapper1>
  );
}
type TextText6Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText6({ text, additionalClassNames = "" }: TextText6Props) {
  return (
    <div className={clsx("absolute h-[17px] left-[16px] top-[32.5px]", additionalClassNames)}>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-0 not-italic text-[#8591a0] text-[14px] top-[-1px] w-[64px]">{text}</p>
    </div>
  );
}
type TextText5Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText5({ text, additionalClassNames = "" }: TextText5Props) {
  return (
    <Wrapper2 additionalClassNames={additionalClassNames}>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 not-italic text-[#10b981] text-[12px] top-0 tracking-[0.012px] w-[27px]">{text}</p>
    </Wrapper2>
  );
}
type TextText4Props = {
  text: string;
};

function TextText4({ text }: TextText4Props) {
  return (
    <div className="absolute h-[17px] left-[16px] top-[32.5px] w-[57.953px]">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#6b7684] text-[14px] top-[-1px] w-[58px]">{text}</p>
    </div>
  );
}
type TextText3Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText3({ text, additionalClassNames = "" }: TextText3Props) {
  return (
    <div className={clsx("absolute h-[17px] left-[16px] top-[32.5px]", additionalClassNames)}>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-0 not-italic text-[#8591a0] text-[14px] top-[-1px] w-[66px]">{text}</p>
    </div>
  );
}
type Text1Props = {
  text: string;
  additionalClassNames?: string;
};

function Text1({ text, additionalClassNames = "" }: Text1Props) {
  return (
    <div className={clsx("absolute bg-[#78350f] content-stretch flex h-[20px] items-center left-[16px] px-[8px] py-[2px] rounded-[8px] top-[32.5px]", additionalClassNames)}>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#f59e0b] text-[12px] tracking-[0.012px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type PropertyTypeBadgeTextProps = {
  text: string;
};

function PropertyTypeBadgeText({ text }: PropertyTypeBadgeTextProps) {
  return (
    <div className="absolute bg-[#111420] h-[20px] left-[16px] rounded-[8px] top-[30.5px] w-[60.391px]">
      <Wrapper>
        <path d={svgPaths.p36c7f800} id="Vector" stroke="var(--stroke-0, #10B981)" strokeLinecap="round" strokeLinejoin="round" />
      </Wrapper>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[24px] not-italic text-[#10b981] text-[12px] top-[2px] tracking-[0.012px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextText2Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText2({ text, additionalClassNames = "" }: TextText2Props) {
  return (
    <div className={clsx("absolute h-[17px] left-[16px] top-[32.5px]", additionalClassNames)}>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#6b7684] text-[14px] top-[-1px] w-[47px]">{text}</p>
    </div>
  );
}
type TextProps = {
  text: string;
  additionalClassNames?: string;
};

function Text({ text, additionalClassNames = "" }: TextProps) {
  return (
    <div className={clsx("absolute bg-[#064e3b] content-stretch flex h-[20px] items-center left-[16px] px-[8px] py-[2px] rounded-[8px] top-[32.5px]", additionalClassNames)}>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#10b981] text-[12px] tracking-[0.012px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextText1Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText1({ text, additionalClassNames = "" }: TextText1Props) {
  return (
    <div className={clsx("absolute content-stretch flex h-[17px] items-start left-[16px] top-[32.5px]", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}

function Button() {
  return (
    <div className="relative rounded-[4px] shrink-0 size-[16px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[2px] px-[2px] relative size-full">
        <div className="h-[12px] overflow-clip relative shrink-0 w-full">
          <Vector additionalClassNames="inset-[33.33%_8.33%_8.33%_33.33%]">
            <path d={svgPaths.p29b26600} id="Vector" stroke="var(--stroke-0, #6B7684)" strokeLinecap="round" strokeLinejoin="round" />
          </Vector>
          <Vector additionalClassNames="inset-[8.33%_33.33%_33.33%_8.33%]">
            <path d={svgPaths.p5643a80} id="Vector" stroke="var(--stroke-0, #6B7684)" strokeLinecap="round" strokeLinejoin="round" />
          </Vector>
        </div>
      </div>
    </div>
  );
}
type TextTextProps = {
  text: string;
  additionalClassNames?: string;
};

function TextText({ text, additionalClassNames = "" }: TextTextProps) {
  return (
    <div className={clsx("h-[16px] relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#8591a0] text-[12px] whitespace-nowrap">{text}</p>
      </div>
    </div>
  );
}
type BodyTextTextProps = {
  text: string;
};

function BodyTextText({ text }: BodyTextTextProps) {
  return (
    <div className="h-[20px] overflow-clip relative shrink-0 w-full">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-0 not-italic text-[#8591a0] text-[14px] top-0 whitespace-nowrap">{text}</p>
    </div>
  );
}

function ImageErrorLoadingImageImage() {
  return (
    <div className="relative shrink-0 size-[48px]">
      <img alt="" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImageErrorLoadingImage} />
    </div>
  );
}
type TableCellTextProps = {
  text: string;
};

function TableCellText({ text }: TableCellTextProps) {
  return (
    <div className="h-[81px] relative shrink-0 w-[55.875px]">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-[16px] not-italic text-[#8591a0] text-[14px] top-[30.5px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type IconProps = {
  additionalClassNames?: string;
};

function Icon({ additionalClassNames = "" }: IconProps) {
  return (
    <div className={clsx("absolute size-[12px] top-[6px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="Icon">
          <path d="M10.5 8L8.5 10L6.5 8" id="Vector" stroke="var(--stroke-0, #8591A0)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 10V2" id="Vector_2" stroke="var(--stroke-0, #8591A0)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1.5 4L3.5 2L5.5 4" id="Vector_3" stroke="var(--stroke-0, #8591A0)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 2V10" id="Vector_4" stroke="var(--stroke-0, #8591A0)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
type HeaderCellTextProps = {
  text: string;
  additionalClassNames?: string;
};

function HeaderCellText({ text, additionalClassNames = "" }: HeaderCellTextProps) {
  return (
    <div className={clsx("h-[56.5px] relative shrink-0", additionalClassNames)}>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[16px] not-italic text-[#8591a0] text-[12px] top-[20px] tracking-[0.012px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type LucideCircle1Props = {
  additionalClassNames?: string;
};

function LucideCircle1({ additionalClassNames = "" }: LucideCircle1Props) {
  return (
    <Wrapper3 additionalClassNames={clsx("absolute size-[24px]", additionalClassNames)}>
      <g id="lucide/circle">
        <path d={svgPaths.pace200} fill="var(--fill-0, #3B82F6)" id="Vector" stroke="var(--stroke-0, #F5F6F7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </g>
    </Wrapper3>
  );
}
type LucideCircleProps = {
  additionalClassNames?: string;
};

function LucideCircle({ additionalClassNames = "" }: LucideCircleProps) {
  return (
    <div className={clsx("absolute content-stretch flex flex-col items-start justify-end overflow-clip p-[2px] size-[32px]", additionalClassNames)}>
      <div className="relative shrink-0 size-[20px]" data-name="Vector">
        <div className="absolute inset-[-5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
            <path d={svgPaths.pb60700} fill="var(--fill-0, #3B82F6)" id="Vector" stroke="var(--stroke-0, #F5F6F7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <div className="absolute bg-[#202334] content-stretch flex flex-col items-center justify-center left-[14px] overflow-clip px-[4px] rounded-[8px] size-[17px] top-[8px]">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 size-[10px] text-[#f5f6f7] text-[12px] text-center">{"2"}</p>
      </div>
    </div>
  );
}

function Attribution() {
  return (
    <Wrapper4>
      <Wrapper3 additionalClassNames="relative shrink-0 size-[24px]">
        <g id="lucide/sticky-note">
          <path d={svgPaths.pbc09e80} id="Vector" stroke="var(--stroke-0, #F5F6F7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </Wrapper3>
    </Wrapper4>
  );
}

function ScaleBar() {
  return (
    <Wrapper4>
      <Wrapper3 additionalClassNames="relative shrink-0 size-[24px]">
        <g id="lucide/zoom-out">
          <path d={svgPaths.p39d6100} id="Vector" stroke="var(--stroke-0, #F5F6F7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </Wrapper3>
    </Wrapper4>
  );
}

function CompassRose() {
  return (
    <Wrapper4>
      <Wrapper3 additionalClassNames="relative shrink-0 size-[24px]">
        <g id="lucide/zoom-in">
          <path d={svgPaths.p1b9cc900} id="Vector" stroke="var(--stroke-0, #F5F6F7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </Wrapper3>
    </Wrapper4>
  );
}

function Helper() {
  return (
    <Wrapper4>
      <Wrapper3 additionalClassNames="relative shrink-0 size-[24px]">
        <g id="lucide/refresh-ccw">
          <path d={svgPaths.p30631780} id="Vector" stroke="var(--stroke-0, #F5F6F7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </Wrapper3>
    </Wrapper4>
  );
}
type LayoutTextProps = {
  text: string;
};

function LayoutText({ text }: LayoutTextProps) {
  return (
    <div className="col-1 content-stretch flex gap-[4px] items-center ml-0 mt-0 relative row-1">
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[19px] not-italic opacity-62 relative shrink-0 text-[#f5f6f7] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}

export default function HomePageDark() {
  return (
    <div className="bg-[#f5f6f7] content-stretch flex flex-col items-start relative size-full" data-name="Home Page - Dark">
      <div className="absolute h-[900px] left-0 top-0 w-[1440px]" data-name="Figmap" />
      <div className="h-[900px] relative shrink-0 w-[1440px]" data-name="map-canvas">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[24px] items-start p-[12px] relative size-full">
          <div className="absolute h-[1013px] left-0 top-0 w-[1441px]" data-name="Basemap image">
            <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={imgBasemapImage} />
          </div>
          <div className="content-stretch flex gap-[16px] items-start justify-center relative shrink-0 w-[1416px]" data-name="map-toolbar">
            <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-h-px min-w-px relative" data-name="map-overlay">
              <div className="h-[30px] overflow-clip relative shrink-0 w-[39px]" data-name="Asset 2 1">
                <div className="absolute inset-[6.78%_8.22%_9.66%_8.22%]" data-name="Layer 1">
                  <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32.5889 25.0687">
                    <g id="Layer 1">
                      <path d={svgPaths.p60c4800} fill="var(--fill-0, #006AFF)" id="Vector" />
                      <g id="Group">
                        <path d={svgPaths.p3c450880} fill="var(--fill-0, #006AFF)" id="Vector_2" />
                        <path d={svgPaths.p15a61300} fill="var(--fill-0, #006AFF)" id="Vector_3" />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
              <p className="font-['Helvetica_Neue:Light',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#f5f6f7] text-[32px] tracking-[0.64px] whitespace-nowrap">Valgate</p>
            </div>
            <div className="content-stretch flex gap-[8px] items-start justify-center relative shrink-0" data-name="map-controls">
              <div className="bg-[#3b82f6] content-stretch flex flex-col items-start px-[16px] py-[8px] relative rounded-[6px] shrink-0" data-name="navigation menu item">
                <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.22)] border-solid inset-0 pointer-events-none rounded-[6px]" />
                <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
                  <div className="col-1 content-stretch flex items-center ml-0 mt-0 relative row-1" data-name="layout-1">
                    <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[19px] not-italic relative shrink-0 text-[#f5f6f7] text-[14px] whitespace-nowrap">Home</p>
                  </div>
                </div>
              </div>
              <div className="bg-[rgba(22,25,38,0.4)] content-stretch flex flex-col items-start px-[16px] py-[8px] relative rounded-[6px] shrink-0" data-name="navigation menu item">
                <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.12)] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_4px_20px_0px_rgba(0,0,0,0.45)]" />
                <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
                  <LayoutText text="Portfolio" />
                </div>
              </div>
              <div className="bg-[rgba(22,25,38,0.4)] content-stretch flex flex-col items-start px-[16px] py-[8px] relative rounded-[6px] shrink-0" data-name="navigation menu item">
                <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.12)] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_4px_20px_0px_rgba(0,0,0,0.45)]" />
                <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
                  <LayoutText text="Map" />
                </div>
              </div>
              <div className="bg-[rgba(22,25,38,0.4)] content-stretch flex flex-col items-start px-[16px] py-[8px] relative rounded-[6px] shrink-0" data-name="navigation menu item">
                <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.12)] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_4px_20px_0px_rgba(0,0,0,0.45)]" />
                <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
                  <LayoutText text="Analytics" />
                </div>
              </div>
              <div className="bg-[rgba(22,25,38,0.4)] content-stretch flex flex-col items-start px-[16px] py-[8px] relative rounded-[6px] shrink-0" data-name="navigation menu item">
                <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.12)] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_4px_20px_0px_rgba(0,0,0,0.45)]" />
                <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
                  <LayoutText text="Succession" />
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-[1_0_0] gap-[12px] items-start justify-end min-h-px min-w-px relative" data-name="tab-content">
              <Helper />
              <CompassRose />
              <ScaleBar />
              <Attribution />
            </div>
          </div>
          <div className="flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="sidebar-controls">
            <div className="overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex items-start justify-between px-[32px] py-[8px] relative size-full">
                <LucideCircle additionalClassNames="left-[446px] top-[400px]" />
                <LucideCircle additionalClassNames="left-[666px] top-[288px]" />
                <LucideCircle additionalClassNames="left-[648px] top-[193px]" />
                <div className="content-stretch flex flex-col gap-[8px] h-full items-start relative shrink-0" data-name="section-divider">
                  <div className="content-stretch flex flex-col gap-[8px] items-start not-italic relative shrink-0 text-[#f5f6f7] text-shadow-[0px_4px_8.8px_rgba(0,0,0,0.37)]" data-name="action-strip">
                    <div className="font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[48px] relative shrink-0 text-[48px] tracking-[-0.576px] whitespace-nowrap">
                      <p className="mb-0">Jon Doe’s</p>
                      <p>Properties</p>
                    </div>
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] relative shrink-0 text-[12px] w-[223px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>
                  <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-name="tab-content">
                    <Helper />
                    <CompassRose />
                    <ScaleBar />
                    <Attribution />
                  </div>
                </div>
                <div className="content-stretch flex flex-col h-full items-start justify-end relative shrink-0 w-[349px]" data-name="action-strip">
                  <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="notification-row">
                    <div className="backdrop-blur-[30px] content-stretch flex flex-col gap-[12px] items-start relative shrink-0" data-name="tab-content">
                      <Helper />
                      <Helper />
                      <CompassRose />
                      <ScaleBar />
                      <Attribution />
                    </div>
                    <div className="bg-[rgba(15,17,23,0.6)] relative rounded-[12px] shrink-0 w-[292px]" data-name="chart-legend">
                      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
                        <div className="h-[205px] relative shrink-0 w-full" data-name="chart-legend-item">
                          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgChartLegendItem} />
                          <div className="flex flex-col items-end overflow-clip rounded-[inherit] size-full">
                            <div className="content-stretch flex flex-col items-end p-[8px] relative size-full">
                              <div className="bg-[#f5f6f7] content-stretch flex flex-col items-center justify-center overflow-clip p-[8px] relative rounded-[16px] shrink-0 size-[28px]" data-name="chart-y-axis">
                                <div className="relative shrink-0 size-[9px]" data-name="lucide/x">
                                  <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 9">
                                    <g clipPath="url(#clip0_1_14829)" id="lucide/x">
                                      <path d="M9 0L0 9M0 0L9 9" id="Vector" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" />
                                    </g>
                                    <defs>
                                      <clipPath id="clip0_1_14829">
                                        <rect fill="white" height="9" width="9" />
                                      </clipPath>
                                    </defs>
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="relative shrink-0 w-full" data-name="property-card-item">
                          <div className="content-stretch flex flex-col items-start pb-[12px] pt-[8px] px-[12px] relative w-full">
                            <div className="content-stretch flex gap-[4px] items-start relative shrink-0 w-full" data-name="chart-tooltip">
                              <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[4px] items-start not-italic relative shrink-0 text-[#f5f6f7] whitespace-nowrap" data-name="chart-x-axis">
                                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="chart-bar">
                                  <p className="leading-[24px] relative shrink-0 text-[16px]">House in Phnom Penh</p>
                                  <p className="leading-[20px] relative shrink-0 text-[14px]">Modern Studio</p>
                                  <p className="leading-[20px] relative shrink-0 text-[14px]">1 bed</p>
                                </div>
                                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="chart-bar-label">
                                  <p className="leading-[0] relative shrink-0 text-[0px] text-[14px]">
                                    <span className="leading-[20px]">$36</span>
                                    <span className="leading-[20px]">{` for 1 night`}</span>
                                  </p>
                                  <p className="leading-[15px] relative shrink-0 text-[10px]">Free cancellation</p>
                                </div>
                              </div>
                              <div className="content-stretch flex flex-[1_0_0] items-start justify-end min-h-px min-w-px relative self-stretch" data-name="chart-grid">
                                <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0" data-name="chart-bar">
                                  <div className="relative shrink-0 size-[18px]" data-name="lucide/star">
                                    <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
                                      <g id="lucide/star">
                                        <path d={svgPaths.pe1f5000} fill="var(--fill-0, #F5F6F7)" id="Vector" />
                                      </g>
                                    </svg>
                                  </div>
                                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#f5f6f7] text-[14px] whitespace-nowrap">New</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.16)] border-solid inset-0 pointer-events-none rounded-[12px] shadow-[0px_12px_56px_0px_rgba(0,0,0,0.68)]" />
                    </div>
                  </div>
                </div>
                <LucideCircle1 additionalClassNames="left-[563px] top-[171px]" />
                <LucideCircle1 additionalClassNames="left-[812px] top-[218px]" />
                <LucideCircle1 additionalClassNames="left-[429px] top-[276px]" />
                <LucideCircle1 additionalClassNames="left-[353px] top-[159px]" />
                <LucideCircle1 additionalClassNames="left-[599px] top-[378px]" />
                <LucideCircle1 additionalClassNames="left-[836px] top-[390px]" />
                <LucideCircle1 additionalClassNames="left-[377px] top-[28px]" />
                <LucideCircle1 additionalClassNames="left-[644px] top-[60px]" />
              </div>
            </div>
          </div>
          <div className="content-stretch flex flex-col h-[291px] items-start relative shrink-0 w-full" data-name="info-panel">
            <div className="bg-[rgba(15,17,23,0.75)] relative rounded-[12px] shrink-0 w-full" data-name="Container">
              <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
                <div className="relative shrink-0 w-full" data-name="icon-pill">
                  <div className="flex flex-row items-center size-full">
                    <div className="content-stretch flex items-center justify-between p-[12px] relative w-full">
                      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[33px] not-italic relative shrink-0 text-[#f5f6f7] text-[24px] whitespace-nowrap">Properties</p>
                      <div className="bg-[#e8eaed] content-stretch flex items-center justify-center px-[16px] py-[8px] relative rounded-[6px] shrink-0" data-name="button">
                        <div aria-hidden="true" className="absolute border border-[#171b2b] border-solid inset-0 pointer-events-none rounded-[6px]" />
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#0f1117] text-[14px] whitespace-nowrap">Full List</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative shrink-0 w-full" data-name="Container (Dark)">
                  <div className="overflow-clip rounded-[inherit] size-full">
                    <div className="content-stretch flex flex-col items-start p-[2px] relative w-full">
                      <div className="backdrop-blur-[26.1px] content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Table">
                        <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.01)] border-solid inset-0 pointer-events-none" />
                        <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Table Header">
                          <div className="bg-[#14181b] content-stretch flex flex-[1_0_0] items-center justify-between min-h-px min-w-px relative" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[56.5px] relative shrink-0 w-[48px]" data-name="Header Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[19px]" data-name="tab-button" />
                            </div>
                            <HeaderCellText text="#" additionalClassNames="w-[55.875px]" />
                            <HeaderCellText text="Property" additionalClassNames="w-[398.016px]" />
                            <HeaderCellText text="Type" additionalClassNames="w-[158.156px]" />
                            <HeaderCellText text="Province" additionalClassNames="w-[221.609px]" />
                            <HeaderCellText text="Status" additionalClassNames="w-[126.938px]" />
                            <div className="h-[56.5px] relative shrink-0 w-[129.547px]" data-name="Header Cell">
                              <div className="absolute h-[24px] left-[16px] top-[16px] w-[47.172px]" data-name="Button">
                                <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[19px] left-[16.5px] not-italic text-[#8591a0] text-[16px] text-center top-0 whitespace-nowrap">Size</p>
                                <Icon additionalClassNames="left-[35.17px]" />
                              </div>
                            </div>
                            <div className="h-[56.5px] relative shrink-0 w-[153.906px]" data-name="Header Cell">
                              <div className="absolute h-[24px] left-[16px] top-[16px] w-[44.328px]" data-name="Button">
                                <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[19px] left-[14px] not-italic text-[#8591a0] text-[16px] text-center top-0 whitespace-nowrap">Buy</p>
                                <Icon additionalClassNames="left-[32.33px]" />
                              </div>
                            </div>
                            <HeaderCellText text="Title" additionalClassNames="w-[145.109px]" />
                            <div className="h-[56.5px] relative shrink-0 w-[137.844px]" data-name="Header Cell">
                              <div className="absolute h-[24px] left-[16px] top-[16px] w-[64.547px]" data-name="Button">
                                <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[19px] left-[24.5px] not-italic text-[#8591a0] text-[16px] text-center top-0 whitespace-nowrap">Health</p>
                                <Icon additionalClassNames="left-[52.55px]" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Table Body">
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="1" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Land near river" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="PP00016 PH" additionalClassNames="w-[71.047px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <div className="absolute bg-[#0f1117] h-[20px] left-[16px] rounded-[8px] top-[30.5px] w-[68.891px]" data-name="PropertyTypeBadge">
                                <Wrapper>
                                  <path d={svgPaths.pa3d8f20} id="Vector" stroke="var(--stroke-0, #60A5FA)" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d={svgPaths.pd0d4d00} id="Vector_2" stroke="var(--stroke-0, #60A5FA)" strokeLinecap="round" strokeLinejoin="round" />
                                </Wrapper>
                                <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[24px] not-italic text-[#60a5fa] text-[12px] top-[2px] tracking-[0.012px] whitespace-nowrap">House</p>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Phnom Penh" additionalClassNames="w-[81.281px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text text="Rented" additionalClassNames="w-[56.953px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <TextText2 text="850 m²" additionalClassNames="w-[46.422px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <div className="absolute h-[17px] left-[16px] top-[32.5px] w-[74.344px]" data-name="Text">
                                <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-0 not-italic text-[#8591a0] text-[14px] top-[-1px] w-[75px]">$1,278,000</p>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text text="Hard title" additionalClassNames="w-[69.688px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#10b981] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <Wrapper2 additionalClassNames="w-[32.859px]">
                                  <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 not-italic text-[#10b981] text-[12px] top-0 tracking-[0.012px] w-[33px]">100%</p>
                                </Wrapper2>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="2" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Siem Reap Land Plot" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="SR00015 Land" additionalClassNames="w-[82.344px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <PropertyTypeBadgeText text="Land" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Siem Reap" additionalClassNames="w-[68.359px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text1 text="Vacant" additionalClassNames="w-[55.75px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <div className="absolute h-[17px] left-[16px] top-[32.5px] w-[55.828px]" data-name="Text">
                                <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#6b7684] text-[14px] top-[-1px] w-[56px]">1,200 m²</p>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <TextText3 text="$456,000" additionalClassNames="w-[65.563px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text1 text="Soft title" additionalClassNames="w-[65.813px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#f43f5e] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <Wrapper2 additionalClassNames="w-[26.844px]">
                                  <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 not-italic text-[#f43f5e] text-[12px] top-0 tracking-[0.012px] w-[27px]">28%</p>
                                </Wrapper2>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="3" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Kampong Chhnang Property" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="KPC00013" additionalClassNames="w-[59.891px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <PropertyTypeBadgeText text="Land" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Kampong Chhnang" additionalClassNames="w-[123.281px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text1 text="Vacant" additionalClassNames="w-[55.75px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <TextText4 text="2,500 m²" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <div className="absolute h-[17px] left-[16px] top-[32.5px] w-[62.563px]" data-name="Text">
                                <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-0 not-italic text-[#8591a0] text-[14px] top-[-1px] w-[63px]">$125,000</p>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text text="Hard title" additionalClassNames="w-[69.688px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#f59e0b] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <Wrapper2 additionalClassNames="w-[27.141px]">
                                  <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 not-italic text-[#f59e0b] text-[12px] top-0 tracking-[0.012px] w-[28px]">43%</p>
                                </Wrapper2>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="4" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Angkor Property" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="SR00007 Land" additionalClassNames="w-[83.516px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <PropertyTypeBadgeText text="Land" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Siem Reap" additionalClassNames="w-[68.359px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text1 text="Vacant" additionalClassNames="w-[55.75px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <TextText2 text="900 m²" additionalClassNames="w-[46.563px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <TextText3 text="$234,000" additionalClassNames="w-[65.266px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text1 text="Soft title" additionalClassNames="w-[65.813px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#f59e0b] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <Wrapper2 additionalClassNames="w-[26.359px]">
                                  <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 not-italic text-[#f59e0b] text-[12px] top-0 tracking-[0.012px] w-[27px]">67%</p>
                                </Wrapper2>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="5" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Temple View Land" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="SR00006 Land" additionalClassNames="w-[84.547px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <PropertyTypeBadgeText text="Land" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Siem Reap" additionalClassNames="w-[68.359px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text1 text="Vacant" additionalClassNames="w-[55.75px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <div className="absolute h-[17px] left-[16px] top-[32.5px] w-[53.734px]" data-name="Text">
                                <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#6b7684] text-[14px] top-[-1px] w-[54px]">1,100 m²</p>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <TextText3 text="$345,000" additionalClassNames="w-[65.391px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text text="Hard title" additionalClassNames="w-[69.688px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#10b981] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <TextText5 text="82%" additionalClassNames="w-[26.844px]" />
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="6" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Central Siem Reap" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="SR00005 Land" additionalClassNames="w-[84.328px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <PropertyTypeBadgeText text="Land" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Siem Reap" additionalClassNames="w-[68.359px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text text="Rented" additionalClassNames="w-[56.953px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <div className="absolute h-[17px] left-[16px] top-[32.5px] w-[45.313px]" data-name="Text">
                                <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#6b7684] text-[14px] top-[-1px] w-[46px]">750 m²</p>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <TextText6 text="$567,000" additionalClassNames="w-[63.453px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text text="Hard title" additionalClassNames="w-[69.688px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#10b981] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <TextText5 text="95%" additionalClassNames="w-[26.984px]" />
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="7" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Commercial Building" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="SR00004 Building" additionalClassNames="w-[102.359px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <div className="absolute bg-[#0f1117] h-[20px] left-[16px] rounded-[8px] top-[30.5px] w-[78.828px]" data-name="PropertyTypeBadge">
                                <Wrapper1>
                                  <g clipPath="url(#clip0_1_14845)" id="Icon">
                                    <path d={svgPaths.p3eccb680} id="Vector" stroke="var(--stroke-0, #8B5CF6)" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d={svgPaths.p34cd6600} id="Vector_2" stroke="var(--stroke-0, #8B5CF6)" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d={svgPaths.p36b1f500} id="Vector_3" stroke="var(--stroke-0, #8B5CF6)" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M5 3H7" id="Vector_4" stroke="var(--stroke-0, #8B5CF6)" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M5 5H7" id="Vector_5" stroke="var(--stroke-0, #8B5CF6)" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M5 7H7" id="Vector_6" stroke="var(--stroke-0, #8B5CF6)" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M5 9H7" id="Vector_7" stroke="var(--stroke-0, #8B5CF6)" strokeLinecap="round" strokeLinejoin="round" />
                                  </g>
                                  <defs>
                                    <clipPath id="clip0_1_14845">
                                      <rect fill="white" height="12" width="12" />
                                    </clipPath>
                                  </defs>
                                </Wrapper1>
                                <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[24px] not-italic text-[#8b5cf6] text-[12px] top-[2px] tracking-[0.012px] whitespace-nowrap">Building</p>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Siem Reap" additionalClassNames="w-[68.359px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text text="Rented" additionalClassNames="w-[56.953px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <TextText2 text="450 m²" additionalClassNames="w-[46.484px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <TextText3 text="$890,000" additionalClassNames="w-[65.625px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text text="Hard title" additionalClassNames="w-[69.688px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#10b981] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <Wrapper2 additionalClassNames="w-[27.328px]">
                                  <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 not-italic text-[#10b981] text-[12px] top-0 tracking-[0.012px] w-[28px]">88%</p>
                                </Wrapper2>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Table Row">
                            <div aria-hidden="true" className="absolute border-[#202334] border-b border-solid inset-0 pointer-events-none" />
                            <div className="h-[81px] relative shrink-0 w-[48px]" data-name="Table Cell">
                              <div className="absolute bg-[#111420] border border-[#8591a0] border-solid left-[16px] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] size-[16px] top-[31.5px]" data-name="tab-button" />
                            </div>
                            <TableCellText text="8" />
                            <div className="h-[81px] relative shrink-0 w-[398.016px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[12px] h-[48px] items-center left-[16px] top-[16.5px] w-[366.016px]" data-name="Container">
                                <Container>
                                  <div className="bg-[#111420] content-stretch flex h-[48px] items-center justify-center relative shrink-0 w-full" data-name="ImageWithFallback">
                                    <ImageErrorLoadingImageImage />
                                  </div>
                                </Container>
                                <Container1>
                                  <BodyTextText text="Prey Veng Agricultural" />
                                  <div className="content-stretch flex gap-[4px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
                                    <TextText text="PV00002 Land" additionalClassNames="w-[84.266px]" />
                                    <Button />
                                  </div>
                                </Container1>
                              </div>
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[158.156px]" data-name="Table Cell">
                              <PropertyTypeBadgeText text="Land" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[221.609px]" data-name="Table Cell">
                              <TextText1 text="Prey Veng" additionalClassNames="w-[65.516px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[126.938px]" data-name="Table Cell">
                              <Text1 text="Vacant" additionalClassNames="w-[55.75px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[129.547px]" data-name="Table Cell">
                              <TextText4 text="5,000 m²" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[153.906px]" data-name="Table Cell">
                              <TextText6 text="$180,000" additionalClassNames="w-[63.203px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[145.109px]" data-name="Table Cell">
                              <Text1 text="Soft title" additionalClassNames="w-[65.813px]" />
                            </div>
                            <div className="h-[81px] relative shrink-0 w-[137.844px]" data-name="Table Cell">
                              <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[16px] top-[32.5px] w-[105.844px]" data-name="HealthScore">
                                <div className="bg-[#f43f5e] rounded-[9999px] shrink-0 size-[6px]" data-name="Text" />
                                <Wrapper2 additionalClassNames="w-[27.141px]">
                                  <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 not-italic text-[#f43f5e] text-[12px] top-0 tracking-[0.012px] w-[28px]">34%</p>
                                </Wrapper2>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div aria-hidden="true" className="absolute border border-[#202334] border-solid inset-0 pointer-events-none" />
                </div>
              </div>
              <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.22)] border-solid inset-0 pointer-events-none rounded-[12px] shadow-[0px_12px_56px_0px_rgba(0,0,0,0.68)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}