import clsx from "clsx";
import svgPaths from "./svg-4t0ur59i8d";
import imgItemImg from "figma:asset/3b30174df2009f0c712472320a75a95421580360.png";
import imgItemImg1 from "figma:asset/6d8c133809366078b5cb8b75d478dc1a07af673a.png";
import imgItemImg2 from "figma:asset/10d4dfabdc78a6e0aab77b317c544165cfdbd92e.png";
import imgItemImg3 from "figma:asset/49af050a08d684b3e5a4eb0cfd7daf91fc096cfb.png";
import imgItemImg4 from "figma:asset/eb19adba5ccd31a3e7e7bd78ef1d22b33eb439b2.png";
import imgItemImg5 from "figma:asset/cf91f5cb74fd68f75b6228e5d8d7aeba9ce91350.png";
import imgItemImg6 from "figma:asset/2961466da4b1d9599ee98e2b4fb0e110531f1f48.png";

function DocPaginationItemImg({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative rounded-[8px] w-full">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[8px]">
        {children}
      </div>
    </div>
  );
}

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative">{children}</div>
    </div>
  );
}
type Wrapper10Props = {
  additionalClassNames?: string;
};

function Wrapper10({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper10Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">{children}</div>
    </div>
  );
}

function Wrapper9({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative">{children}</div>
    </div>
  );
}

function HeaderPropertyText3({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center relative w-full">{children}</div>
    </div>
  );
}
type Wrapper8Props = {
  additionalClassNames?: string;
};

function Wrapper8({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper8Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">{children}</div>
    </div>
  );
}

function Wrapper7({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0">
      <Wrapper5>
        <g id="lucide/file">
          <rect fill="white" height="24" width="24" />
          <path d={svgPaths.p20d1ae60} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </Wrapper5>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center tracking-[-0.1504px] whitespace-nowrap">{children}</p>
    </div>
  );
}

function Wrapper6({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        {children}
      </svg>
    </div>
  );
}

function Wrapper5({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[24px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        {children}
      </svg>
    </div>
  );
}
type Wrapper4Props = {
  additionalClassNames?: string;
};

function Wrapper4({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper4Props>) {
  return (
    <div className={clsx("size-[18px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        {children}
      </svg>
    </div>
  );
}

function Wrapper3({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="content-center flex flex-wrap gap-y-[26px] items-center justify-center relative shrink-0 w-full">
      <div className="flex flex-[1_0_0] flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[13px] text-center text-ellipsis tracking-[-0.13px] whitespace-nowrap">{children}</div>
    </div>
  );
}

function Item1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-[#eef2f8] h-[120px] relative rounded-[8px] shrink-0 w-[180px]">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col gap-[8px] items-center justify-center pb-[16px] pt-[8px] px-[8px] relative size-full">{children}</div>
      </div>
    </div>
  );
}

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper3>
      <p className="leading-[18px] overflow-hidden whitespace-pre">{children}</p>
    </Wrapper3>
  );
}

function Item({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-[#eef2f8] relative rounded-[8px] shrink-0 w-[180px]">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[12px] py-[8px] relative w-full">{children}</div>
      </div>
    </div>
  );
}
type Icon2Props = {
  additionalClassNames?: string;
};

function Icon2({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon2Props>) {
  return (
    <Wrapper4 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper4>
  );
}

function Icon1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper5>
      <g id="Frame">{children}</g>
    </Wrapper5>
  );
}

function Icon({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper6>
      <g id="Icon">{children}</g>
    </Wrapper6>
  );
}

function Wrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="overflow-clip relative shrink-0 size-[52px]">
      <div className="absolute inset-[10.42%_18.75%]" data-name="Vector">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32.5 41.1667">
          <g id="Vector">{children}</g>
        </svg>
      </div>
    </div>
  );
}
type Text5Props = {
  text: string;
};

function Text5({ text, children }: React.PropsWithChildren<Text5Props>) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center py-[4px] relative size-full">
      <Icon>{children}</Icon>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text5Props = {
  text: string;
  additionalClassNames?: string;
};
type HeaderPropertyText2Props = {
  text: string;
};

function HeaderPropertyText2({ text, children }: React.PropsWithChildren<HeaderPropertyText2Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text5 text={text} additionalClassNames="px-[55px]">
        {children}
      </Text5>
    </div>
  );
}
type HeaderPropertyText1Props = {
  text: string;
};

function HeaderPropertyText1({ text, children }: React.PropsWithChildren<HeaderPropertyText1Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text5 text={text} additionalClassNames="px-[65px]">
        {children}
      </Text5>
    </div>
  );
}

function Component() {
  return (
    <Wrapper>
      <path clipRule="evenodd" d={svgPaths.p2c08db80} fill="var(--fill-0, #059669)" fillRule="evenodd" />
      <path clipRule="evenodd" d={svgPaths.p17bb0380} fill="var(--fill-0, #059669)" fillRule="evenodd" />
    </Wrapper>
  );
}
type Text4Props = {
  text: string;
};

function Text4({ text }: Text4Props) {
  return (
    <Wrapper3>
      <p className="leading-[18px] overflow-hidden">{text}</p>
    </Wrapper3>
  );
}

function ListGroup4Component() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]">
      <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[12px] left-1/2 top-1/2 w-[16px]" data-name="item-img">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 12">
          <path d={svgPaths.p13a8b900} fill="var(--fill-0, #2563EB)" id="item-img" />
        </svg>
      </div>
    </div>
  );
}
type Text3Props = {
  text: string;
};

function Text3({ text }: Text3Props) {
  return (
    <div className="content-center flex flex-[1_0_0] flex-wrap gap-y-[26px] items-center min-h-px min-w-px relative">
      <div className="flex flex-[1_0_0] flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] max-w-[124px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[13px] text-ellipsis tracking-[-0.13px] whitespace-nowrap">
        <p className="leading-[18px] overflow-hidden">{text}</p>
      </div>
    </div>
  );
}
type Text2Props = {
  text: string;
};

function Text2({ text }: Text2Props) {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      <p className="font-['Inter:Medium',sans-serif] font-[542] leading-[normal] not-italic relative shrink-0 text-[#515d66] text-[14px] tracking-[-0.0476px] whitespace-nowrap">{text}</p>
      <div className="relative shrink-0">
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex gap-[8px] items-center relative">
            <Wrapper1>
              <path d={svgPaths.p3ecb3680} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </Wrapper1>
            <Wrapper1>
              <path d={svgPaths.p2cb7dd00} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </Wrapper1>
          </div>
        </div>
      </div>
    </div>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text }: Text1Props) {
  return <Wrapper7>{text}</Wrapper7>;
}
type TextTextProps = {
  text: string;
};

function TextText({ text }: TextTextProps) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center relative w-full">
        <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">
          <p className="leading-[28px]">{text}</p>
        </div>
      </div>
    </div>
  );
}
type TextProps = {
  text: string;
};

function Text({ text }: TextProps) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">{text}</p>
    </div>
  );
}
type HeaderPropertyTextProps = {
  text: string;
  additionalClassNames?: string;
};

function HeaderPropertyText({ text, additionalClassNames = "" }: HeaderPropertyTextProps) {
  return (
    <Text5 text={text} additionalClassNames={additionalClassNames}>
      <path d={svgPaths.p277d2000} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M10 3.84267V13.8427" id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M6 2.15733V12.1573" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </Text5>
  );
}
type HeaderPropertyProps = {
  className?: string;
  property1?: "Overview" | "Documents" | "Safty" | "Spatial" | "Ownership" | "Rental" | "Valuation" | "Surrounding";
};

function HeaderProperty({ className, property1 = "Overview" }: HeaderPropertyProps) {
  const isRental = property1 === "Rental";
  const isSafty = property1 === "Safty";
  const isSurrounding = property1 === "Surrounding";
  return (
    <div className={className || "bg-white h-[121px] relative w-[1440px]"}>
      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start pb-[2px] pt-[16px] px-[24px] relative size-full">
        <div className="content-stretch flex h-[36px] items-center justify-between relative shrink-0 w-full" data-name="Container">
          <div className="h-[24px] relative shrink-0 w-[222.469px]" data-name="Container">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
              <Wrapper8 additionalClassNames="h-[20px] w-[85.438px]">
                <Icon1>
                  <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </Icon1>
                <HeaderPropertyText3>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[14px] text-center whitespace-nowrap">Property</p>
                </HeaderPropertyText3>
              </Wrapper8>
              <div className="h-[24px] relative shrink-0 w-[4.563px]" data-name="Text">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                  <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[24px] left-0 not-italic text-[#6b7684] text-[16px] top-0 whitespace-nowrap">/</p>
                </div>
              </div>
              <HeaderPropertyText3>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">SR00015 Land</p>
              </HeaderPropertyText3>
            </div>
          </div>
          <Wrapper8 additionalClassNames="h-[36px] w-[443.172px]">
            <div className={`bg-[#ecfdf5] relative rounded-[8px] shrink-0 ${isSafty ? "h-[36px]" : "h-[32px]"}`} data-name="Container">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] relative">
                <Wrapper9>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[116px]">28% health score</p>
                </Wrapper9>
                <Wrapper10 additionalClassNames="size-[14px]">
                  <div className="h-[14px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                    <div className="absolute inset-[8.33%]" data-name="Vector">
                      <div className="absolute inset-[-5%]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.8333 12.8333">
                          <path d={svgPaths.p13f5b400} id="Vector" stroke="var(--stroke-0, #065F46)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute bottom-[33.33%] left-1/2 right-1/2 top-1/2" data-name="Vector">
                      <div className="absolute inset-[-25%_-0.58px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.16667 3.5">
                          <path d="M0.583333 2.91667V0.583333" id="Vector" stroke="var(--stroke-0, #065F46)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute bottom-[66.67%] left-1/2 right-[49.96%] top-[33.33%]" data-name="Vector">
                      <div className="absolute inset-[-0.58px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.1725 1.16667">
                          <path d="M0.583333 0.583333H0.589167" id="Vector" stroke="var(--stroke-0, #065F46)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Wrapper10>
              </div>
            </div>
            <div className="bg-white h-[36px] relative rounded-[8px] shrink-0" data-name="Button">
              <div aria-hidden="true" className="absolute border border-[#14181b] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] py-[2px] relative">
                <Icon>
                  <path d={svgPaths.p185fb780} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d={svgPaths.p30ca5e80} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d={svgPaths.pac25b80} id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d="M5.7267 9.00667L10.28 11.66" id="Vector_4" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d="M10.2734 4.34L5.7267 6.99333" id="Vector_5" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                </Icon>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">Share</p>
              </div>
            </div>
            <div className="bg-[#2563eb] h-[36px] relative rounded-[8px] shrink-0" data-name="Button">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] py-[2px] relative">
                <Icon>
                  <path d={svgPaths.p1bd16b80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                </Icon>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">Get directions</p>
              </div>
            </div>
            <div className="relative rounded-[8px] shrink-0 size-[36px]" data-name="Button">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                <Icon2 additionalClassNames="relative shrink-0">
                  <path d={svgPaths.p3f4e600} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p2aca4e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p10b1cef0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </Icon2>
              </div>
            </div>
          </Wrapper8>
        </div>
        <div className={`content-stretch flex flex-col items-start relative shrink-0 w-full ${isRental ? "" : "h-[36px]"}`} data-name="Primitive.div">
          <div className={`bg-[#e8eaed] relative rounded-[16px] w-full ${isRental ? "h-[36px] shrink-0" : "flex-[1_0_0] min-h-px min-w-px"}`} data-name="Tab List">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center p-[4px] relative size-full">
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${["Surrounding", "Valuation", "Rental", "Safty", "Spatial", "Ownership", "Documents"].includes(property1) ? "" : "bg-white"}`} data-name="Primitive.button">
                  <div className="flex flex-row items-center justify-center size-full">
                    <HeaderPropertyText text="Overview" />
                  </div>
                </div>
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${property1 === "Documents" ? "bg-white" : ""}`} data-name="Primitive.button">
                  <div className="flex flex-row items-center justify-center size-full">
                    <Text5 text="Documents" additionalClassNames="px-[51px]">
                      <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    </Text5>
                  </div>
                </div>
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${isSafty ? "bg-white" : ""}`} data-name="Primitive.button">
                  <HeaderPropertyText1 text="Safety">
                    <path d={svgPaths.p37f49070} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  </HeaderPropertyText1>
                </div>
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${property1 === "Spatial" ? "bg-white" : ""}`} data-name="Primitive.button">
                  <div className="flex flex-row items-center justify-center size-full">
                    <HeaderPropertyText text="Spatial" additionalClassNames="px-[64px]" />
                  </div>
                </div>
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${property1 === "Ownership" ? "bg-white" : ""}`} data-name="Primitive.button">
                  <HeaderPropertyText1 text="Ownership">
                    <path d={svgPaths.p32887f80} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    <path d={svgPaths.p3694d280} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    <path d={svgPaths.p1f197700} id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    <path d={svgPaths.p3bf3e100} id="Vector_4" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  </HeaderPropertyText1>
                </div>
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${isRental ? "bg-white" : ""}`} data-name="Primitive.button">
                  <HeaderPropertyText2 text="Rental">
                    <path d="M8 1.33333V14.6667" id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    <path d={svgPaths.pfd86880} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  </HeaderPropertyText2>
                </div>
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${property1 === "Valuation" ? "bg-white" : ""}`} data-name="Primitive.button">
                  <HeaderPropertyText2 text="Valuation">
                    <path d={svgPaths.pea6a680} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    <path d={svgPaths.p3155f180} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  </HeaderPropertyText2>
                </div>
                <div className={`flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[16px] ${isSurrounding ? "bg-white" : ""}`} data-name="Primitive.button">
                  <div className="flex flex-row items-center justify-center size-full">
                    <div className={`bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center px-[45px] relative size-full ${isSurrounding ? "py-[4px]" : "py-[2px]"}`}>
                      <Icon>
                        <path d={svgPaths.p14548f00} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        <path d={svgPaths.p17781bc0} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      </Icon>
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">Surrounding</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDocumentsGridView() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Property Documents - Grid View">
      <Wrapper10 additionalClassNames="h-full w-[280px]">
        <div className="bg-[#f5f6f7] flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="Sidebar">
          <div aria-hidden="true" className="absolute border-[#d1d5db] border-r border-solid inset-0 pointer-events-none" />
          <div className="content-stretch flex flex-col items-start pr-px relative size-full">
            <div className="h-[81px] relative shrink-0 w-[279px]" data-name="Logo Container">
              <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center pb-px pl-[24px] relative size-full">
                <div className="bg-[#2563eb] relative rounded-[10px] shrink-0 size-[32px]" data-name="Icon Container">
                  <Text text="V" />
                </div>
                <Wrapper9>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                </Wrapper9>
              </div>
            </div>
            <div className="relative shrink-0" data-name="User Container">
              <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center px-[24px] py-[11px] relative">
                <div className="content-stretch flex items-start overflow-clip relative rounded-[33554400px] shrink-0 size-[40px]" data-name="User Pic Container">
                  <div className="bg-[#2563eb] flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[33554400px]" data-name="Text">
                    <Text text="JD" />
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-start relative shrink-0 w-[179px]" data-name="Container">
                  <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-full" data-name="Paragraph">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Jon Doe</p>
                  </div>
                  <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">3 Members</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-[1_0_0] min-h-px min-w-px relative w-[279px]" data-name="Navigation">
              <div className="overflow-clip rounded-[inherit] size-full">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[12px] pt-[16px] px-[12px] relative size-full">
                  <div className="content-stretch flex flex-col gap-[4px] h-[284px] items-start relative shrink-0 w-full" data-name="List">
                    <ListItem>
                      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                        <Icon1>
                          <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        </Icon1>
                        <TextText text="Home" />
                      </div>
                    </ListItem>
                    <ListItem>
                      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                        <Icon1>
                          <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        </Icon1>
                        <TextText text="Portfolio" />
                      </div>
                    </ListItem>
                    <ListItem>
                      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                        <Icon1>
                          <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        </Icon1>
                        <TextText text="Map" />
                      </div>
                    </ListItem>
                    <ListItem>
                      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                        <Icon1>
                          <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        </Icon1>
                        <TextText text="Analytics" />
                      </div>
                    </ListItem>
                    <ListItem>
                      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                        <Icon1>
                          <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        </Icon1>
                        <TextText text="Succession" />
                        <div className="bg-[#dbeafe] h-[20px] relative rounded-[33554400px] shrink-0 w-[45.391px]" data-name="Text">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start px-[8px] py-[2px] relative size-full">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#2563eb] text-[16px] text-center whitespace-nowrap">Soon</p>
                          </div>
                        </div>
                      </div>
                    </ListItem>
                    <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="List Item">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex h-full items-start relative">
                        <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                          <Icon1>
                            <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          </Icon1>
                          <TextText text="Settings" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative shrink-0 w-[279px]" data-name="Container">
              <div aria-hidden="true" className="absolute border-[#d1d5db] border-solid border-t inset-0 pointer-events-none" />
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start pb-[32px] pt-[17px] px-[12px] relative w-full">
                <div className="h-[36px] relative shrink-0 w-full" data-name="Container">
                  <div className="absolute content-stretch flex items-center justify-center left-0 rounded-[10px] size-[36px] top-0" data-name="Button">
                    <Icon2 additionalClassNames="relative shrink-0">
                      <path d={svgPaths.p137c7200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      <path d={svgPaths.p254f3200} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </Icon2>
                  </div>
                  <div className="absolute left-[44px] rounded-[10px] size-[36px] top-0" data-name="Button">
                    <Icon2 additionalClassNames="absolute left-[9px] top-[9px]">
                      <path d={svgPaths.p985d280} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      <path d={svgPaths.p2ac55e70} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </Icon2>
                    <div className="absolute bg-[#e11d48] left-[24px] rounded-[33554400px] size-[8px] top-[4px]" data-name="Text" />
                  </div>
                  <div className="absolute left-[88px] rounded-[10px] size-[36px] top-0" data-name="Button">
                    <Wrapper4 additionalClassNames="absolute left-[9px] top-[9px]">
                      <g clipPath="url(#clip0_1_15187)" id="Icon">
                        <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </g>
                      <defs>
                        <clipPath id="clip0_1_15187">
                          <rect fill="white" height="18" width="18" />
                        </clipPath>
                      </defs>
                    </Wrapper4>
                    <div className="absolute bg-[#059669] left-[24px] rounded-[33554400px] size-[8px] top-[24px]" data-name="Text" />
                  </div>
                </div>
                <div className="bg-white relative rounded-[10px] shrink-0 w-full" data-name="Container">
                  <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[10px]" />
                  <div className="content-stretch flex flex-col gap-[8px] items-start pb-px pt-[13px] px-[13px] relative w-full">
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                      <Wrapper6>
                        <g clipPath="url(#clip0_1_15144)" id="Icon">
                          <path d={svgPaths.p874e300} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M13.3333 2V4.66667" id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M14.6667 3.33333H12" id="Vector_3" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M2.66667 11.3333V12.6667" id="Vector_4" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M3.33333 12H2" id="Vector_5" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </g>
                        <defs>
                          <clipPath id="clip0_1_15144">
                            <rect fill="white" height="16" width="16" />
                          </clipPath>
                        </defs>
                      </Wrapper6>
                      <div className="h-[16px] relative shrink-0 w-[113.594px]" data-name="Text">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate Intelligence</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Paragraph">
                      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[28px] min-h-px min-w-px not-italic relative text-[#515d66] text-[16px]">AI-powered insights for your portfolio</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Wrapper10>
      <div className="bg-[#f5f6f7] flex-[1_0_0] h-full min-h-px min-w-px relative" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
          <HeaderProperty className="bg-white h-[121px] relative shrink-0 w-full" property1="Documents" />
          <div className="flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="page-body">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[10px] items-start justify-center relative size-full">
              <div className="content-stretch flex flex-col gap-[12px] items-start justify-center pt-[40px] relative shrink-0" data-name="content-panel">
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[14px] text-center tracking-[-0.1504px] whitespace-nowrap">Folders</p>
                <div className="content-stretch flex gap-[10px] items-start relative shrink-0" data-name="tab-content">
                  <Wrapper5>
                    <g id="lucide/folder">
                      <path d={svgPaths.p22da5e40} fill="var(--fill-0, #2563EB)" id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </g>
                  </Wrapper5>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center tracking-[-0.1504px] whitespace-nowrap">All Documents</p>
                </div>
                <div className="content-stretch flex gap-[10px] items-start pl-[12px] relative shrink-0" data-name="property-card-grid">
                  <div className="flex h-0 items-center justify-center relative self-center shrink-0 w-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "18" } as React.CSSProperties}>
                    <div className="flex-none h-full rotate-90">
                      <div className="h-full relative w-[96px]">
                        <div className="absolute inset-[-1px_0_0_0]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 96 1">
                            <line id="Line 1" stroke="var(--stroke-0, #D1D5DB)" x2="96" y1="0.5" y2="0.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-col gap-[12px] items-start justify-center relative shrink-0" data-name="filter-row">
                    <Text1 text="Title" />
                    <Text1 text="Sales" />
                    <Wrapper7>{`Tax Receipt `}</Wrapper7>
                  </div>
                </div>
              </div>
              <div className="h-full relative shrink-0 w-[872px]" data-name="content-block-2">
                <div className="flex flex-col items-center size-full">
                  <div className="content-stretch flex flex-col gap-[40px] items-center pb-[10px] pt-[40px] px-[40px] relative size-full">
                    <div className="content-stretch flex flex-col font-['Inter:Medium',sans-serif] gap-[24px] items-start justify-center leading-[normal] not-italic relative shrink-0 text-[#14181b] w-[792px] whitespace-nowrap" data-name="doc-grid">
                      <p className="font-[542] relative shrink-0 text-[14px] tracking-[-0.0476px]">{`<- Back`}</p>
                      <p className="font-medium relative shrink-0 text-[24px] tracking-[-0.0816px]">SR00015 Documents</p>
                    </div>
                    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[792px]" data-name="doc-table-header">
                      <Text2 text="Folders" />
                      <div className="content-start flex flex-wrap gap-[24px] items-start relative shrink-0 w-[792px]" data-name="list-group-4">
                        <Item>
                          <ListGroup4Component />
                          <Text3 text="Contract" />
                        </Item>
                        <Item>
                          <ListGroup4Component />
                          <Text3 text="Receipts" />
                        </Item>
                        <Item>
                          <ListGroup4Component />
                          <Text3 text="Tax" />
                        </Item>
                        <Item>
                          <ListGroup4Component />
                          <Text3 text="Rental" />
                        </Item>
                        <Item>
                          <ListGroup4Component />
                          <Text3 text="Images" />
                        </Item>
                        <Item>
                          <ListGroup4Component />
                          <Text3 text="Videos" />
                        </Item>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[792px]" data-name="doc-table-body">
                      <Text2 text="Files" />
                      <div className="content-start flex flex-wrap gap-[24px] items-start relative shrink-0 w-full" data-name="doc-pagination">
                        <Item1>
                          <DocPaginationItemImg>
                            <div className="absolute bg-[#e8eaed] inset-0 rounded-[8px]" />
                            <img alt="" className="absolute max-w-none object-cover rounded-[8px] size-full" src={imgItemImg} />
                          </DocPaginationItemImg>
                          <Wrapper2>{`familyReunion2022.jpg  `}</Wrapper2>
                        </Item1>
                        <Item1>
                          <DocPaginationItemImg>
                            <div className="absolute bg-[#e8eaed] inset-0 rounded-[8px]" />
                            <img alt="" className="absolute max-w-none object-cover rounded-[8px] size-full" src={imgItemImg1} />
                          </DocPaginationItemImg>
                          <Wrapper2>{`travelDiaryItaly.jpg  `}</Wrapper2>
                        </Item1>
                        <Item1>
                          <DocPaginationItemImg>
                            <div className="absolute bg-[#e8eaed] inset-0 rounded-[8px]" />
                            <img alt="" className="absolute max-w-none object-cover rounded-[8px] size-full" src={imgItemImg2} />
                          </DocPaginationItemImg>
                          <Wrapper2>{`sunset-beach.png  `}</Wrapper2>
                        </Item1>
                        <Item1>
                          <DocPaginationItemImg>
                            <div className="absolute bg-[#e8eaed] inset-0 rounded-[8px]" />
                            <img alt="" className="absolute max-w-none object-cover rounded-[8px] size-full" src={imgItemImg3} />
                          </DocPaginationItemImg>
                          <Wrapper2>{`animatedLogoFinal.gif  `}</Wrapper2>
                        </Item1>
                        <Item1>
                          <DocPaginationItemImg>
                            <div className="absolute bg-[#e8eaed] inset-0 rounded-[8px]" />
                            <img alt="" className="absolute max-w-none object-cover rounded-[8px] size-full" src={imgItemImg4} />
                          </DocPaginationItemImg>
                          <Wrapper2>{`nature_wallpaperHD.png  `}</Wrapper2>
                        </Item1>
                        <Item1>
                          <DocPaginationItemImg>
                            <div className="absolute bg-[#e8eaed] inset-0 rounded-[8px]" />
                            <img alt="" className="absolute max-w-none object-cover rounded-[8px] size-full" src={imgItemImg5} />
                          </DocPaginationItemImg>
                          <Text4 text="tree-trunk.png" />
                        </Item1>
                        <Item1>
                          <DocPaginationItemImg>
                            <div className="absolute bg-[#e8eaed] inset-0 rounded-[8px]" />
                            <img alt="" className="absolute max-w-none object-cover rounded-[8px] size-full" src={imgItemImg6} />
                          </DocPaginationItemImg>
                          <Wrapper2>{`birthday-party-1.jpg  `}</Wrapper2>
                        </Item1>
                        <div className="bg-[#eef2f8] content-stretch flex flex-col gap-[14px] items-center justify-center pb-[16px] pt-[20px] px-[8px] relative rounded-[8px] shrink-0 w-[180px]" data-name="Item">
                          <Wrapper>
                            <path clipRule="evenodd" d={svgPaths.p2c08db80} fill="var(--fill-0, #2563EB)" fillRule="evenodd" />
                            <path clipRule="evenodd" d={svgPaths.p30398180} fill="var(--fill-0, #2563EB)" fillRule="evenodd" />
                          </Wrapper>
                          <Text4 text="blog-artic.docx" />
                        </div>
                        <div className="bg-[#eef2f8] content-stretch flex flex-col gap-[14px] items-center justify-center pb-[16px] pt-[20px] px-[8px] relative rounded-[8px] shrink-0 w-[180px]" data-name="Item">
                          <Wrapper>
                            <path clipRule="evenodd" d={svgPaths.p2c08db80} fill="var(--fill-0, #515D66)" fillRule="evenodd" />
                            <path clipRule="evenodd" d={svgPaths.p3de78600} fill="var(--fill-0, #515D66)" fillRule="evenodd" />
                            <path clipRule="evenodd" d={svgPaths.p18ac0400} fill="var(--fill-0, #515D66)" fillRule="evenodd" />
                            <path clipRule="evenodd" d={svgPaths.p189c5400} fill="var(--fill-0, #515D66)" fillRule="evenodd" />
                            <path clipRule="evenodd" d={svgPaths.p23f2b400} fill="var(--fill-0, #515D66)" fillRule="evenodd" />
                            <path clipRule="evenodd" d={svgPaths.p4396e00} fill="var(--fill-0, #515D66)" fillRule="evenodd" />
                            <path clipRule="evenodd" d={svgPaths.p85f9a80} fill="var(--fill-0, #515D66)" fillRule="evenodd" />
                          </Wrapper>
                          <Text4 text="Vacation_Photos_Italy.zip" />
                        </div>
                        <div className="bg-[#eef2f8] content-stretch flex flex-col gap-[14px] items-center justify-center pb-[16px] pt-[20px] px-[8px] relative rounded-[8px] shrink-0 w-[180px]" data-name="Item">
                          <Wrapper>
                            <path clipRule="evenodd" d={svgPaths.p2c08db80} fill="var(--fill-0, #E11D48)" fillRule="evenodd" />
                            <path d={svgPaths.pe353a00} fill="var(--fill-0, #E11D48)" />
                          </Wrapper>
                          <Text4 text="Home_Renovation_Plan.xlsx" />
                        </div>
                        <div className="bg-[#eef2f8] content-stretch flex flex-col gap-[14px] items-center justify-center pb-[16px] pt-[20px] px-[8px] relative rounded-[8px] shrink-0 w-[180px]" data-name="Item">
                          <Component />
                          <Text4 text="IRS-Returns-2026.xlsx" />
                        </div>
                        <div className="bg-[#eef2f8] content-stretch flex flex-col gap-[14px] items-center justify-center pb-[16px] pt-[20px] px-[8px] relative rounded-[8px] shrink-0 w-[180px]" data-name="Item">
                          <Wrapper>
                            <path clipRule="evenodd" d={svgPaths.p2c08db80} fill="var(--fill-0, #F59E0B)" fillRule="evenodd" />
                            <path d={svgPaths.p2f957180} fill="var(--fill-0, #F59E0B)" />
                            <path d={svgPaths.p73bff80} fill="var(--fill-0, #F59E0B)" />
                          </Wrapper>
                          <Text4 text="Group_Project_Presentation.pptx" />
                        </div>
                        <div className="bg-[#eef2f8] content-stretch flex flex-col gap-[14px] items-center justify-center pb-[16px] pt-[20px] px-[8px] relative rounded-[8px] shrink-0 w-[180px]" data-name="Item">
                          <Component />
                          <Text4 text="Book_Wishlist_2025.xlsx" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}