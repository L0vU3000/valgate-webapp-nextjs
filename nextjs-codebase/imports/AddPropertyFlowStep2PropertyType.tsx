import clsx from "clsx";
import svgPaths from "./svg-inujxlrt6b";

function TabButton({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative rounded-[14px]">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="flex flex-row items-center justify-center size-full">{children}</div>
    </div>
  );
}

function ListItem2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex h-full items-start relative">{children}</div>
    </div>
  );
}

function Wrapper5({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <div className="content-stretch flex items-center justify-center px-[16px] py-[8px] relative">{children}</div>
    </div>
  );
}

function Wrapper4({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        {children}
      </svg>
    </div>
  );
}
type Wrapper3Props = {
  additionalClassNames?: string;
};

function Wrapper3({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper3Props>) {
  return (
    <div className={clsx("size-[18px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        {children}
      </svg>
    </div>
  );
}

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative">{children}</div>
    </div>
  );
}

function Button({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[10px]">
      <div aria-hidden="true" className="absolute border-2 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col gap-[13px] items-center justify-center px-[26px] py-[28px] relative size-full">{children}</div>
      </div>
    </div>
  );
}

function ListItem1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper2>
      <div className="content-stretch flex h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0" data-name="Button">
        {children}
      </div>
    </Wrapper2>
  );
}
type Icon1Props = {
  additionalClassNames?: string;
};

function Icon1({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon1Props>) {
  return (
    <Wrapper3 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper3>
  );
}

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper2>
      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
        {children}
      </div>
    </Wrapper2>
  );
}

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}

function Wrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper4>
      <g id="Icon">{children}</g>
    </Wrapper4>
  );
}
type BodyTextTextProps = {
  text: string;
};

function BodyTextText({ text }: BodyTextTextProps) {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#4b5563] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[32px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="Icon">
          <path d={svgPaths.p3b698600} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p2e828300} id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
        </g>
      </svg>
    </div>
  );
}
type ButtonTextProps = {
  text: string;
};

function ButtonText({ text }: ButtonTextProps) {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <Wrapper5>
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#0f172a] text-[14px] whitespace-nowrap">{text}</p>
      </Wrapper5>
    </div>
  );
}
type Text4Props = {
  text: string;
  additionalClassNames?: string;
};

function Text4({ text, additionalClassNames = "" }: Text4Props) {
  return (
    <div className={clsx("bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center py-[5px] relative w-full", additionalClassNames)}>
      <Wrapper>
        <path d={svgPaths.p277d2000} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        <path d="M10 3.84267V13.8427" id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        <path d="M6 2.15733V12.1573" id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      </Wrapper>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">{text}</p>
    </div>
  );
}

function SidebarIcon5() {
  return (
    <Wrapper1>
      <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon4() {
  return (
    <Wrapper1>
      <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon3() {
  return (
    <Wrapper1>
      <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon2() {
  return (
    <Wrapper1>
      <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon1() {
  return (
    <Wrapper1>
      <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}
type SidebarTextTextProps = {
  text: string;
};

function SidebarTextText({ text }: SidebarTextTextProps) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center relative w-full">
        <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#374151] text-[16px] whitespace-nowrap">
          <p className="leading-[28px]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarIcon() {
  return (
    <Wrapper1>
      <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}
type Text2Props = {
  text: string;
  additionalClassNames?: string;
};

function Text2({ text, additionalClassNames = "" }: Text2Props) {
  return (
    <div className={clsx("content-stretch flex relative shrink-0", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#111827] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text3Props = {
  text: string;
  additionalClassNames?: string;
};

function Text3({ text, additionalClassNames = "" }: Text3Props) {
  return (
    <div className={clsx("bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#111827] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text }: Text1Props) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextProps = {
  text: string;
};

function Text({ text }: TextProps) {
  return (
    <div className="bg-[#2563eb] flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[33554400px]">
      <Text1 text={text} />
    </div>
  );
}
type SidebarTextProps = {
  text: string;
};

function SidebarText({ text }: SidebarTextProps) {
  return (
    <div className="bg-[#2563eb] relative rounded-[10px] shrink-0 size-[32px]">
      <Text1 text={text} />
    </div>
  );
}
type SidebarProps = {
  className?: string;
  property1?: "Default (Extended)" | "Sidebar Collapse";
};

function Sidebar({ className, property1 = "Default (Extended)" }: SidebarProps) {
  const isSidebarCollapse = property1 === "Sidebar Collapse";
  return (
    <div className={className || `relative ${isSidebarCollapse ? "" : "h-[900px] w-[280px]"}`}>
      <div className={`content-stretch flex flex-col items-start relative ${isSidebarCollapse ? "" : "size-full"}`}>
        {property1 === "Default (Extended)" && (
          <div className="bg-[#f9fafb] flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="Sidebar">
            <div aria-hidden="true" className="absolute border-[#e5e7eb] border-r border-solid inset-0 pointer-events-none" />
            <div className="content-stretch flex flex-col items-start pr-px relative size-full">
              <div className="h-[81px] relative shrink-0 w-[279px]" data-name="Logo Container">
                <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center pb-px pl-[24px] relative size-full">
                  <SidebarText text="V" />
                  <div className="relative shrink-0" data-name="Text Container">
                    <Text3 text="Valgate" />
                  </div>
                </div>
              </div>
              <div className="relative shrink-0" data-name="User Container">
                <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center px-[24px] py-[11px] relative">
                  <div className="content-stretch flex items-start overflow-clip relative rounded-[33554400px] shrink-0 size-[40px]" data-name="User Pic Container">
                    <Text text="JD" />
                  </div>
                  <div className="content-stretch flex flex-col items-start relative shrink-0 w-[179px]" data-name="Container">
                    <Text2 text="Jon Doe" additionalClassNames="items-center overflow-clip w-full" />
                    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#6b7280] text-[16px] whitespace-nowrap">3 Members</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-[1_0_0] min-h-px min-w-px relative w-[279px]" data-name="Navigation">
                <div className="overflow-clip rounded-[inherit] size-full">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[12px] pt-[16px] px-[12px] relative size-full">
                    <div className="content-stretch flex flex-col gap-[4px] h-[284px] items-start relative shrink-0 w-full" data-name="List">
                      <ListItem>
                        <SidebarIcon />
                        <SidebarTextText text="Home" />
                      </ListItem>
                      <ListItem>
                        <SidebarIcon1 />
                        <SidebarTextText text="Portfolio" />
                      </ListItem>
                      <ListItem>
                        <SidebarIcon2 />
                        <SidebarTextText text="Map" />
                      </ListItem>
                      <ListItem>
                        <SidebarIcon3 />
                        <SidebarTextText text="Analytics" />
                      </ListItem>
                      <ListItem>
                        <SidebarIcon4 />
                        <SidebarTextText text="Succession" />
                        <div className="bg-[#eff6ff] h-[20px] relative rounded-[33554400px] shrink-0 w-[45.391px]" data-name="Text">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start px-[8px] py-[2px] relative size-full">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#2563eb] text-[16px] text-center whitespace-nowrap">Soon</p>
                          </div>
                        </div>
                      </ListItem>
                      <ListItem2>
                        <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                          <SidebarIcon5 />
                          <SidebarTextText text="Settings" />
                        </div>
                      </ListItem2>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative shrink-0 w-[279px]" data-name="Container">
                <div aria-hidden="true" className="absolute border-[#e5e7eb] border-solid border-t inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start pb-[32px] pt-[17px] px-[12px] relative w-full">
                  <div className="h-[36px] relative shrink-0 w-full" data-name="Container">
                    <div className="absolute content-stretch flex items-center justify-center left-0 rounded-[10px] size-[36px] top-0" data-name="Button">
                      <Icon1 additionalClassNames="relative shrink-0">
                        <path d={svgPaths.p137c7200} id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p254f3200} id="Vector_2" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon1>
                    </div>
                    <div className="absolute left-[44px] rounded-[10px] size-[36px] top-0" data-name="Button">
                      <Icon1 additionalClassNames="absolute left-[9px] top-[9px]">
                        <path d={svgPaths.p985d280} id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p2ac55e70} id="Vector_2" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon1>
                      <div className="absolute bg-[#ef4444] left-[24px] rounded-[33554400px] size-[8px] top-[4px]" data-name="Text" />
                    </div>
                    <div className="absolute left-[88px] rounded-[10px] size-[36px] top-0" data-name="Button">
                      <Wrapper3 additionalClassNames="absolute left-[9px] top-[9px]">
                        <g clipPath="url(#clip0_1_15101)" id="Icon">
                          <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </g>
                        <defs>
                          <clipPath id="clip0_1_15101">
                            <rect fill="white" height="18" width="18" />
                          </clipPath>
                        </defs>
                      </Wrapper3>
                      <div className="absolute bg-[#10b981] left-[24px] rounded-[33554400px] size-[8px] top-[24px]" data-name="Text" />
                    </div>
                  </div>
                  <div className="bg-white relative rounded-[10px] shrink-0 w-full" data-name="Container">
                    <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
                    <div className="content-stretch flex flex-col gap-[8px] items-start pb-px pt-[13px] px-[13px] relative w-full">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                        <Wrapper4>
                          <g clipPath="url(#clip0_1_15180)" id="Icon">
                            <path d={svgPaths.p874e300} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d="M13.3333 2V4.66667" id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d="M14.6667 3.33333H12" id="Vector_3" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d="M2.66667 11.3333V12.6667" id="Vector_4" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d="M3.33333 12H2" id="Vector_5" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </g>
                          <defs>
                            <clipPath id="clip0_1_15180">
                              <rect fill="white" height="16" width="16" />
                            </clipPath>
                          </defs>
                        </Wrapper4>
                        <div className="h-[16px] relative shrink-0 w-[113.594px]" data-name="Text">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#111827] text-[16px] whitespace-nowrap">Valgate Intelligence</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Paragraph">
                        <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[28px] min-h-px min-w-px not-italic relative text-[#4b5563] text-[16px]">AI-powered insights for your portfolio</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {isSidebarCollapse && (
          <div className="bg-white content-stretch flex flex-col h-[900px] items-center relative shrink-0">
            <div className="content-stretch flex h-[81px] items-center pb-[3px] pt-[2px] px-[24px] relative shrink-0" data-name="Logo Container">
              <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
              <SidebarText text="V" />
            </div>
            <div className="content-stretch flex items-center px-[19px] py-[11px] relative shrink-0" data-name="User Container">
              <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
              <div className="content-stretch flex items-start overflow-clip relative rounded-[33554400px] shrink-0 size-[40px]" data-name="User Pic Container">
                <Text text="JD" />
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[4px] h-[284px] items-start relative shrink-0" data-name="List">
              <ListItem1>
                <SidebarIcon />
              </ListItem1>
              <ListItem1>
                <SidebarIcon1 />
              </ListItem1>
              <ListItem1>
                <SidebarIcon2 />
              </ListItem1>
              <ListItem1>
                <SidebarIcon3 />
              </ListItem1>
              <ListItem1>
                <SidebarIcon4 />
              </ListItem1>
              <ListItem2>
                <div className="content-stretch flex h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0" data-name="Button">
                  <SidebarIcon5 />
                </div>
              </ListItem2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddPropertyFlowStep2PropertyType() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Add Property Flow - Step 2: Property Type">
      <Sidebar className="relative self-stretch shrink-0 w-[280px]" />
      <div className="bg-[#fbfbfb] flex-[1_0_0] min-h-px min-w-px relative" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
          <div className="bg-white h-[121px] relative shrink-0 w-full" data-name="Container">
            <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start pb-px pt-[16px] px-[32px] relative size-full">
              <div className="content-stretch flex h-[36px] items-center justify-between relative shrink-0 w-full" data-name="Container">
                <div className="h-[24px] relative shrink-0" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] h-full items-center relative">
                    <div className="h-[20px] relative shrink-0" data-name="Button">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[10px] h-full items-center relative">
                        <div className="h-[20px] relative shrink-0 w-[9px]" data-name="Icon">
                          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 20">
                            <g clipPath="url(#clip0_1_31345)" id="Icon">
                              <path d="M5 15L0 10L5 5" id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </g>
                            <defs>
                              <clipPath id="clip0_1_31345">
                                <rect fill="white" height="20" width="9" />
                              </clipPath>
                            </defs>
                          </svg>
                        </div>
                        <div className="relative shrink-0" data-name="Text">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center relative">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#4b5563] text-[16px] text-center whitespace-nowrap">Property</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="h-[24px] relative shrink-0 w-[4.563px]" data-name="Text">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                        <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#9ca3af] text-[16px] top-0 whitespace-nowrap">/</p>
                      </div>
                    </div>
                    <div className="relative shrink-0 w-[119.906px]" data-name="Text">
                      <Text3 text="SR00015 Land" additionalClassNames="flex-col w-full" />
                    </div>
                  </div>
                </div>
                <div className="h-[36px] relative shrink-0 w-[443.172px]" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
                    <div className="bg-[rgba(16,185,129,0.1)] h-[32px] relative rounded-[10px] shrink-0" data-name="Container">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] relative">
                        <div className="relative shrink-0" data-name="Text">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#10b981] text-[16px] whitespace-nowrap">28% health score</p>
                          </div>
                        </div>
                        <div className="relative shrink-0 size-[14px]" data-name="Button">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
                            <div className="h-[14px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                              <div className="absolute inset-[8.33%]" data-name="Vector">
                                <div className="absolute inset-[-5%]">
                                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.8333 12.8333">
                                    <path d={svgPaths.p13f5b400} id="Vector" stroke="var(--stroke-0, #10B981)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                                  </svg>
                                </div>
                              </div>
                              <div className="absolute bottom-[33.33%] left-1/2 right-1/2 top-1/2" data-name="Vector">
                                <div className="absolute inset-[-25%_-0.58px]">
                                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.16667 3.5">
                                    <path d="M0.583333 2.91667V0.583333" id="Vector" stroke="var(--stroke-0, #10B981)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                                  </svg>
                                </div>
                              </div>
                              <div className="absolute bottom-[66.67%] left-1/2 right-[49.96%] top-[33.33%]" data-name="Vector">
                                <div className="absolute inset-[-0.58px]">
                                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.1725 1.16667">
                                    <path d="M0.583333 0.583333H0.589167" id="Vector" stroke="var(--stroke-0, #10B981)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white relative rounded-[8px] shrink-0" data-name="Button">
                      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center px-[10px] py-[2px] relative">
                        <Wrapper>
                          <path d={svgPaths.p185fb780} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d={svgPaths.p30ca5e80} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d={svgPaths.pac25b80} id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M5.7267 9.00667L10.28 11.66" id="Vector_4" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M10.2734 4.34L5.7267 6.99333" id="Vector_5" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </Wrapper>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">Share</p>
                      </div>
                    </div>
                    <div className="bg-[#2563eb] relative rounded-[8px] shrink-0" data-name="Button">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[7px] items-center px-[9px] py-[2px] relative">
                        <Wrapper>
                          <path d={svgPaths.p1bd16b80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </Wrapper>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap">Get directions</p>
                      </div>
                    </div>
                    <div className="relative rounded-[10px] shrink-0 size-[36px]" data-name="Button">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                        <Icon1 additionalClassNames="relative shrink-0">
                          <path d={svgPaths.p3f4e600} id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          <path d={svgPaths.p2aca4e80} id="Vector_2" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          <path d={svgPaths.p10b1cef0} id="Vector_3" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </Icon1>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col h-[36px] items-start relative shrink-0 w-full" data-name="tab-nav">
                <div className="bg-[#ececf0] flex-[1_0_0] min-h-px min-w-px relative rounded-[14px] w-full" data-name="Tab List">
                  <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center px-[3px] relative size-full">
                      <TabButton>
                        <Text4 text="Overview" additionalClassNames="px-[49px]" />
                      </TabButton>
                      <TabButton>
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[7px] items-center justify-center px-[51px] py-[5px] relative w-full">
                          <Wrapper>
                            <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </Wrapper>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">Documents</p>
                        </div>
                      </TabButton>
                      <TabButton>
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[7px] items-center justify-center px-[65px] py-[5px] relative w-full">
                          <Wrapper>
                            <path d={svgPaths.p37f49070} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </Wrapper>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">Safety</p>
                        </div>
                      </TabButton>
                      <TabButton>
                        <Text4 text="Spatial" additionalClassNames="px-[64px]" />
                      </TabButton>
                      <TabButton>
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center px-[65px] py-[5px] relative w-full">
                          <Wrapper>
                            <path d={svgPaths.p32887f80} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.p3694d280} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.p1f197700} id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.p3bf3e100} id="Vector_4" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </Wrapper>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">Ownership</p>
                        </div>
                      </TabButton>
                      <div className="bg-white flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[10px]" data-name="tab-button">
                        <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[10px]" />
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[7px] items-center justify-center relative size-full">
                          <Wrapper>
                            <path d="M8 1.33333V14.6667" id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.pfd86880} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </Wrapper>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">Rental</p>
                        </div>
                      </div>
                      <TabButton>
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center px-[55px] py-[5px] relative w-full">
                          <Wrapper>
                            <path d={svgPaths.pea6a680} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.p3155f180} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </Wrapper>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">Valuation</p>
                        </div>
                      </TabButton>
                      <TabButton>
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center px-[45px] py-px relative w-full">
                          <Wrapper>
                            <path d={svgPaths.p14548f00} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.p17781bc0} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </Wrapper>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[16px] text-center whitespace-nowrap">Surrounding</p>
                        </div>
                      </TabButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative shrink-0 w-full" data-name="property-type-options">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[32px] relative w-full">
              <div className="relative shrink-0 w-full" data-name="section-title">
                <div className="flex flex-row items-center size-full">
                  <div className="content-stretch flex items-center justify-between px-[32px] py-[12px] relative w-full">
                    <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] not-italic relative shrink-0 text-[#6b7280] text-[30px] tracking-[-0.225px] whitespace-nowrap">Add New Property</p>
                    <ButtonText text="Save as Draft" />
                  </div>
                </div>
              </div>
              <div className="max-w-[1160px] relative shrink-0 w-full" data-name="progress-bar">
                <div className="content-stretch flex flex-col gap-[10px] items-start max-w-[inherit] p-[32px] relative w-full">
                  <div className="h-[16px] relative shrink-0 w-full" data-name="progress">
                    <div className="absolute bg-[#f1f5f9] inset-0 rounded-[40px]" data-name="area" />
                    <div className="absolute bg-[#2463eb] inset-[0_83.33%_0_0] rounded-[40px]" data-name="progress" />
                  </div>
                  <p className="font-['Inter:Bold',sans-serif] font-bold leading-[28px] not-italic relative shrink-0 text-[#2463eb] text-[16px] whitespace-nowrap">Step 1 of 6: Property Type</p>
                </div>
              </div>
              <div className="max-w-[1160px] relative shrink-0 w-full" data-name="Container">
                <div className="flex flex-col items-center max-w-[inherit] size-full">
                  <div className="content-stretch flex flex-col gap-[24px] items-center max-w-[inherit] px-[22px] py-[32px] relative w-full">
                    <div className="content-stretch flex gap-[8px] h-[20px] items-center relative shrink-0 w-full" data-name="Button">
                      <Wrapper1>
                        <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </Wrapper1>
                      <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px relative" data-name="Text">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                          <p className="-translate-x-1/2 absolute font-['Inter:Regular',sans-serif] font-normal leading-[28px] left-[55px] not-italic text-[#4b5563] text-[16px] text-center top-0 whitespace-nowrap">Back to Portfolio</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
                      <div className="h-[32px] relative shrink-0 w-full" data-name="subsection-title">
                        <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] left-0 not-italic text-[#111827] text-[30px] top-0 tracking-[-0.225px] whitespace-nowrap">What type of property are you adding?</p>
                      </div>
                      <div className="h-[20px] relative shrink-0 w-full" data-name="body-text">
                        <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#4b5563] text-[16px] top-0 whitespace-nowrap">Select the category that best describes your property</p>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[24px] h-[196px] items-start relative shrink-0 w-full" data-name="Container">
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Residential House" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Single family detached" />
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Commercial Building" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Office or mixed use" />
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Multi-Unit Complex" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Apartments, condos" />
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Retail Space" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Shop or storefront" />
                      </Button>
                    </div>
                    <div className="content-stretch flex gap-[24px] h-[196px] items-start relative shrink-0 w-full" data-name="Container">
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Land" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Vacant plot or lot" />
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Industrial" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Warehouse or factory" />
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Under Construction" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Development project" />
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#eff6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <Text2 text="Other" additionalClassNames="flex-col items-start justify-center" />
                        <BodyTextText text="Custom type" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white h-[73px] max-w-[1160px] relative shrink-0 w-[1160px]" data-name="action-bar">
            <div aria-hidden="true" className="absolute border-[#e5e7eb] border-solid border-t-2 inset-0 pointer-events-none" />
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[32px] relative size-full">
              <ButtonText text="Save as Draft" />
              <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="button-group">
                <ButtonText text="Go Back" />
                <div className="bg-[#2463eb] relative rounded-[6px] shrink-0" data-name="button">
                  <Wrapper5>
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Continue</p>
                  </Wrapper5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}