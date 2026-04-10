import clsx from "clsx";
import svgPaths from "./svg-rwgppkdjtx";
import imgDocExample1 from "figma:asset/4ed98f65a759fb11787b36f0ccf23f9041b787ce.png";

function ListItem2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex h-full items-start relative">{children}</div>
    </div>
  );
}

function Wrapper7({ children }: React.PropsWithChildren<{}>) {
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
type Wrapper6Props = {
  additionalClassNames?: string;
};

function Wrapper6({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper6Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">{children}</div>
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

function Wrapper4({ children }: React.PropsWithChildren<{}>) {
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

function Wrapper3({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        {children}
      </svg>
    </div>
  );
}
type Wrapper2Props = {
  additionalClassNames?: string;
};

function Wrapper2({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper2Props>) {
  return (
    <div className={clsx("size-[18px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        {children}
      </svg>
    </div>
  );
}

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative">{children}</div>
    </div>
  );
}

function ListItem1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper1>
      <div className="content-stretch flex h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0" data-name="Button">
        {children}
      </div>
    </Wrapper1>
  );
}

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper1>
      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
        {children}
      </div>
    </Wrapper1>
  );
}
type Icon1Props = {
  additionalClassNames?: string;
};

function Icon1({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon1Props>) {
  return (
    <Wrapper2 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper2>
  );
}

function Wrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}

function Icon({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper3>
      <g id="Icon">{children}</g>
    </Wrapper3>
  );
}
type Text3Props = {
  text: string;
};

function Text3({ text, children }: React.PropsWithChildren<Text3Props>) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center py-[4px] relative size-full">
      <Icon>{children}</Icon>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text3Props = {
  text: string;
  additionalClassNames?: string;
};
type HeaderPropertyText2Props = {
  text: string;
};

function HeaderPropertyText2({ text, children }: React.PropsWithChildren<HeaderPropertyText2Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text3 text={text} additionalClassNames="px-[55px]">
        {children}
      </Text3>
    </div>
  );
}
type HeaderPropertyText1Props = {
  text: string;
};

function HeaderPropertyText1({ text, children }: React.PropsWithChildren<HeaderPropertyText1Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text3 text={text} additionalClassNames="px-[65px]">
        {children}
      </Text3>
    </div>
  );
}

function Helper2() {
  return (
    <div className="flex flex-row items-center size-full">
      <div className="content-stretch flex items-center p-[5px] relative w-full">
        <div className="aspect-[1131/1600] flex-[1_0_0] min-h-px min-w-px relative">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgDocExample1} />
        </div>
      </div>
    </div>
  );
}

function Helper1() {
  return (
    <div className="content-stretch flex flex-col h-[156px] items-start justify-between overflow-clip py-[10px] relative shrink-0 w-[109px]">
      <Helper text="Bought Price" text1="$100,000" />
      <Helper text="Bought Price" text1="$100,000" />
    </div>
  );
}
type HelperProps = {
  text: string;
  text1: string;
};

function Helper({ text, text1 }: HelperProps) {
  return (
    <div className="content-stretch flex flex-col h-[58px] items-start relative shrink-0">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] relative shrink-0 text-[#515d66] text-[12px]">{text}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] relative shrink-0 text-[#14181b] text-[16px]">{text1}</p>
    </div>
  );
}
type Text2Props = {
  text: string;
};

function Text2({ text }: Text2Props) {
  return <Wrapper4>{text}</Wrapper4>;
}

function SidebarIcon5() {
  return (
    <Wrapper>
      <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper>
  );
}

function SidebarIcon4() {
  return (
    <Wrapper>
      <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper>
  );
}

function SidebarIcon3() {
  return (
    <Wrapper>
      <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper>
  );
}

function SidebarIcon2() {
  return (
    <Wrapper>
      <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper>
  );
}

function SidebarIcon1() {
  return (
    <Wrapper>
      <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper>
  );
}
type SidebarTextTextProps = {
  text: string;
};

function SidebarTextText({ text }: SidebarTextTextProps) {
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

function SidebarIcon() {
  return (
    <Wrapper>
      <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper>
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
    <div className="bg-[#2563eb] flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[9999px]">
      <Text1 text={text} />
    </div>
  );
}
type SidebarTextProps = {
  text: string;
};

function SidebarText({ text }: SidebarTextProps) {
  return (
    <div className="bg-[#2563eb] relative rounded-[8px] shrink-0 size-[32px]">
      <Text1 text={text} />
    </div>
  );
}
type HeaderPropertyTextProps = {
  text: string;
  additionalClassNames?: string;
};

function HeaderPropertyText({ text, additionalClassNames = "" }: HeaderPropertyTextProps) {
  return (
    <Text3 text={text} additionalClassNames={additionalClassNames}>
      <path d={svgPaths.p277d2000} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M10 3.84267V13.8427" id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M6 2.15733V12.1573" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </Text3>
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
              <Wrapper6 additionalClassNames="h-[20px] w-[85.438px]">
                <Wrapper>
                  <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </Wrapper>
                <HeaderPropertyText3>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[14px] text-center whitespace-nowrap">Property</p>
                </HeaderPropertyText3>
              </Wrapper6>
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
          <Wrapper6 additionalClassNames="h-[36px] w-[443.172px]">
            <div className={`bg-[#ecfdf5] relative rounded-[8px] shrink-0 ${isSafty ? "h-[36px]" : "h-[32px]"}`} data-name="Container">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] relative">
                <Wrapper7>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[116px]">28% health score</p>
                </Wrapper7>
                <div className="relative shrink-0 size-[14px]" data-name="Button">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
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
                  </div>
                </div>
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
                <Icon1 additionalClassNames="relative shrink-0">
                  <path d={svgPaths.p3f4e600} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p2aca4e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p10b1cef0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </Icon1>
              </div>
            </div>
          </Wrapper6>
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
                    <Text3 text="Documents" additionalClassNames="px-[51px]">
                      <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    </Text3>
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
type SidebarProps = {
  className?: string;
  property1?: "Default (Extended)" | "Sidebar Collapse";
};

function Sidebar({ className, property1 = "Default (Extended)" }: SidebarProps) {
  const isSidebarCollapse = property1 === "Sidebar Collapse";
  return (
    <div className={className || `bg-white h-[900px] relative rounded-[8px] ${isSidebarCollapse ? "" : "w-[280px]"}`}>
      <div className={`content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] ${isSidebarCollapse ? "h-full" : "size-full"}`}>
        {property1 === "Default (Extended)" && (
          <div className="flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="Sidebar">
            <div aria-hidden="true" className="absolute border-[#d1d5db] border-r border-solid inset-0 pointer-events-none" />
            <div className="content-stretch flex flex-col items-start pr-px relative size-full">
              <div className="h-[81px] relative shrink-0 w-[279px]" data-name="Logo Container">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center pb-px pl-[24px] relative size-full">
                  <SidebarText text="V" />
                  <Wrapper7>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                  </Wrapper7>
                </div>
              </div>
              <div className="relative shrink-0" data-name="User Container">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center px-[24px] py-[12px] relative">
                  <div className="content-stretch flex items-start overflow-clip relative rounded-[9999px] shrink-0 size-[40px]" data-name="User Pic Container">
                    <Text text="JD" />
                  </div>
                  <div className="content-stretch flex flex-col items-start relative shrink-0 w-[179px]" data-name="Container">
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-full" data-name="Paragraph">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Jon Doe</p>
                    </div>
                    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#6b7684] text-[16px] whitespace-nowrap">3 Members</p>
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
                        <div className="bg-[#dbeafe] relative rounded-[9999px] shrink-0" data-name="Text">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[8px] py-[4px] relative">
                            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#2563eb] text-[14px] text-center whitespace-nowrap">Soon</p>
                          </div>
                        </div>
                      </ListItem>
                      <ListItem2>
                        <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                          <SidebarIcon5 />
                          <SidebarTextText text="Settings" />
                        </div>
                      </ListItem2>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative shrink-0 w-[279px]" data-name="Container">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-solid border-t inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start p-[12px] relative w-full">
                  <div className="h-[36px] relative shrink-0 w-full" data-name="Container">
                    <div className="absolute content-stretch flex items-center justify-center left-0 rounded-[8px] size-[36px] top-0" data-name="Button">
                      <Icon1 additionalClassNames="relative shrink-0">
                        <path d={svgPaths.p137c7200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p254f3200} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon1>
                    </div>
                    <div className="absolute left-[44px] rounded-[8px] size-[36px] top-0" data-name="Button">
                      <Icon1 additionalClassNames="absolute left-[9px] top-[9px]">
                        <path d={svgPaths.p985d280} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p2ac55e70} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon1>
                      <div className="absolute bg-[#e11d48] left-[24px] rounded-[9999px] size-[8px] top-[4px]" data-name="Text" />
                    </div>
                    <div className="absolute left-[88px] rounded-[8px] size-[36px] top-0" data-name="Button">
                      <Wrapper2 additionalClassNames="absolute left-[9px] top-[9px]">
                        <g clipPath="url(#clip0_1_15187)" id="Icon">
                          <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </g>
                        <defs>
                          <clipPath id="clip0_1_15187">
                            <rect fill="white" height="18" width="18" />
                          </clipPath>
                        </defs>
                      </Wrapper2>
                      <div className="absolute bg-[#059669] left-[24px] rounded-[9999px] size-[8px] top-[24px]" data-name="Text" />
                    </div>
                  </div>
                  <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="Container">
                    <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
                    <div className="content-stretch flex flex-col gap-[8px] items-start p-[12px] relative w-full">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                        <Wrapper3>
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
                        </Wrapper3>
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
        )}
        {isSidebarCollapse && (
          <div className="content-stretch flex flex-col h-[900px] items-center relative shrink-0">
            <div className="content-stretch flex h-[81px] items-center justify-center pb-px relative shrink-0 w-full" data-name="Logo Container">
              <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
              <SidebarText text="V" />
            </div>
            <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative shrink-0" data-name="User Container">
              <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
              <div className="content-stretch flex items-start overflow-clip relative rounded-[9999px] shrink-0 size-[40px]" data-name="User Pic Container">
                <Text text="JD" />
              </div>
            </div>
            <div className="flex-[1_0_0] min-h-px min-w-px relative w-full">
              <div className="flex flex-col items-center size-full">
                <div className="content-stretch flex flex-col items-center py-[8px] relative size-full">
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
                      <div className="content-stretch flex h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0" data-name="Button">
                        <SidebarIcon5 />
                      </div>
                    </ListItem2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

export default function PropertyDocumentPagesView() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Property Document - Pages View">
      <Sidebar className="bg-white h-full relative rounded-[8px] shrink-0 w-[280px]" />
      <div className="bg-[#f5f6f7] flex-[1_0_0] min-h-px min-w-px relative" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
          <HeaderProperty className="bg-white h-[121px] relative shrink-0 w-full" property1="Documents" />
          <div className="h-[1409px] relative shrink-0 w-full" data-name="page-content">
            <div className="flex flex-row justify-center size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[32px] items-start justify-center p-[32px] relative size-full">
                <div className="content-stretch flex flex-col gap-[12px] items-start pt-[40px] relative shrink-0" data-name="content-panel">
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
                          <div className="absolute inset-[-2px_0_0_0]">
                            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 96 2">
                              <line id="Line 1" stroke="var(--stroke-0, #D1D5DB)" strokeLinecap="round" strokeWidth="2" x1="1" x2="95" y1="1" y2="1" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[12px] items-start justify-center relative shrink-0" data-name="filter-row">
                      <Text2 text="Title" />
                      <Text2 text="Sales" />
                      <Wrapper4>{`Tax Receipt `}</Wrapper4>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-h-px min-w-px relative" data-name="breadcrumb">
                  <div className="content-stretch flex flex-col font-['Inter:Medium',sans-serif] gap-[24px] items-start justify-center leading-[normal] not-italic relative shrink-0 text-[#14181b] w-full whitespace-nowrap" data-name="doc-grid">
                    <p className="font-[542] relative shrink-0 text-[14px] tracking-[-0.0476px]">{`<- Back`}</p>
                    <p className="font-medium relative shrink-0 text-[24px] tracking-[-0.0816px]">SR00015 Documents</p>
                  </div>
                  <div className="content-stretch flex gap-[12px] h-[836.019px] items-start relative shrink-0 w-full" data-name="quick-actions">
                    <div className="content-stretch flex flex-[1_0_0] items-start min-h-px min-w-px relative self-stretch" data-name="page-title-row">
                      <div className="flex-[1_0_0] h-full min-h-px min-w-px relative" data-name="stat-card-row">
                        <div className="overflow-clip rounded-[inherit] size-full">
                          <div className="content-stretch flex flex-col gap-[12px] items-start not-italic pb-[25px] pr-[25px] relative size-full">
                            <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full" data-name="stat-card">
                              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[32px] relative shrink-0 text-[#14181b] text-[24px] text-center tracking-[-0.144px] whitespace-nowrap">{`Document Summary `}</p>
                              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-full relative shrink-0 text-[#374151] text-[0px] text-[16px] w-[min-content] whitespace-pre-wrap">
                                <span className="leading-[28px]">{`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sodales  sed sapien quis rutrum. Integer viverra a neque in rhoncus. Pellentesque ut nisi velit. Cras commodo nec urna vitae eleifend. Donec ut augue  tincidunt, sagittis enim in, lacinia eros. Proin nec tincidunt magna,  quis lobortis nunc. Nulla congue, purus quis eleifend semper, arcu velit pellentesque odio, ut dictum nunc ipsum non magna. `}</span>
                                <span className="leading-[28px] text-[#2563eb]">Read More</span>
                              </p>
                            </div>
                            <div className="content-stretch flex h-[156px] items-start justify-between overflow-clip relative shrink-0 text-center w-full whitespace-nowrap" data-name="chart-card">
                              <Helper1 />
                              <Helper1 />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f5f6f7] content-stretch flex flex-col items-start overflow-clip p-[20px] relative shrink-0" data-name="filter-chips">
                        <div className="h-[459px] relative shrink-0 w-[324px]" data-name="doc example 1">
                          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgDocExample1} />
                        </div>
                      </div>
                    </div>
                    <div className="relative self-stretch shrink-0 w-[166px]" data-name="sort-bar">
                      <div className="overflow-clip rounded-[inherit] size-full">
                        <div className="content-stretch flex flex-col gap-[26px] items-start px-[10px] py-[40px] relative size-full">
                          <div className="content-stretch flex gap-[9px] items-end justify-end relative shrink-0 w-full" data-name="portfolio-row-1">
                            <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[21px] justify-center leading-[0] not-italic relative shrink-0 text-[#14181b] text-[16px] w-[12px]">
                              <p className="leading-[28px]">1.</p>
                            </div>
                            <div className="bg-[#dbeafe] flex-[1_0_0] min-h-px min-w-px relative" data-name="table-cell-content">
                              <div aria-hidden="true" className="absolute border-[#2563eb] border-l-5 border-solid inset-0 pointer-events-none" />
                              <Helper2 />
                            </div>
                          </div>
                          <div className="content-stretch flex gap-[9px] items-end justify-end relative shrink-0 w-full" data-name="portfolio-row-2">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">2.</p>
                            <div className="bg-[#dbeafe] flex-[1_0_0] min-h-px min-w-px relative" data-name="table-cell-content">
                              <Helper2 />
                            </div>
                          </div>
                          <div className="content-stretch flex gap-[9px] items-end justify-end relative shrink-0 w-full" data-name="portfolio-row-3">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">3.</p>
                            <div className="bg-[#dbeafe] flex-[1_0_0] min-h-px min-w-px relative" data-name="table-cell-content">
                              <Helper2 />
                            </div>
                          </div>
                          <div className="content-stretch flex gap-[9px] items-end justify-end relative shrink-0 w-full" data-name="portfolio-row-4">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">4.</p>
                            <div className="bg-[#dbeafe] flex-[1_0_0] min-h-px min-w-px relative" data-name="table-cell-content">
                              <Helper2 />
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
      </div>
    </div>
  );
}