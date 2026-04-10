import clsx from "clsx";
import svgPaths from "./svg-5uy60yam6p";

function Wrapper14({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[10px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 10">
        {children}
      </svg>
    </div>
  );
}

function Wrapper13({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white flex-[1_0_0] min-h-px min-w-px relative rounded-[12px] self-stretch">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
      <div className="content-stretch flex flex-col gap-[8px] items-start p-[24px] relative size-full">{children}</div>
    </div>
  );
}

function Wrapper12({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white flex-[1_0_0] min-h-px min-w-px relative rounded-[12px]">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
      <div className="content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full whitespace-nowrap">{children}</div>
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

function Wrapper11({ children }: React.PropsWithChildren<{}>) {
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
type Wrapper10Props = {
  additionalClassNames?: string;
};

function Wrapper10({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper10Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">{children}</div>
    </div>
  );
}

function Wrapper9({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-row items-center size-full">
      <div className="content-stretch flex items-center justify-between px-[32px] py-[16px] relative w-full">{children}</div>
    </div>
  );
}

function Wrapper8({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        {children}
      </svg>
    </div>
  );
}
type Wrapper7Props = {
  additionalClassNames?: string;
};

function Wrapper7({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper7Props>) {
  return (
    <div className={clsx("size-[18px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        {children}
      </svg>
    </div>
  );
}

function Wrapper6({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative">{children}</div>
    </div>
  );
}
type Wrapper5Props = {
  additionalClassNames?: string;
};

function Wrapper5({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper5Props>) {
  return (
    <div className={additionalClassNames}>
      <div aria-hidden="true" className="absolute border-[#d1d5db] border-solid border-t inset-[-1px_0_0_0] pointer-events-none" />
      <div className="flex flex-row items-center size-full">{children}</div>
    </div>
  );
}
type Wrapper4Props = {
  additionalClassNames?: string;
};

function Wrapper4({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper4Props>) {
  return (
    <Wrapper5 additionalClassNames={clsx("relative shrink-0 w-full", additionalClassNames)}>
      <div className="content-stretch flex items-center justify-between px-[32px] py-[16px] relative w-full">{children}</div>
    </Wrapper5>
  );
}

function Wrapper3({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[24px] py-[12px] relative w-full">{children}</div>
      </div>
    </div>
  );
}

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 w-full">
      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-[0_0_-1px_0] pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[24px] py-[12px] relative w-full">{children}</div>
      </div>
    </div>
  );
}

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper5 additionalClassNames="relative shrink-0 w-full">
      <div className="content-stretch flex gap-[12px] items-center px-[24px] py-[12px] relative w-full">{children}</div>
    </Wrapper5>
  );
}

function ListItem1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper6>
      <div className="content-stretch flex h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0" data-name="Button">
        {children}
      </div>
    </Wrapper6>
  );
}

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper6>
      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
        {children}
      </div>
    </Wrapper6>
  );
}
type Icon1Props = {
  additionalClassNames?: string;
};

function Icon1({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon1Props>) {
  return (
    <Wrapper7 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper7>
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
    <Wrapper8>
      <g id="Icon">{children}</g>
    </Wrapper8>
  );
}
type Text4Props = {
  text: string;
};

function Text4({ text, children }: React.PropsWithChildren<Text4Props>) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center py-[4px] relative size-full">
      <Icon>{children}</Icon>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text4Props = {
  text: string;
  additionalClassNames?: string;
};
type HeaderPropertyText2Props = {
  text: string;
};

function HeaderPropertyText2({ text, children }: React.PropsWithChildren<HeaderPropertyText2Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text4 text={text} additionalClassNames="px-[55px]">
        {children}
      </Text4>
    </div>
  );
}
type HeaderPropertyText1Props = {
  text: string;
};

function HeaderPropertyText1({ text, children }: React.PropsWithChildren<HeaderPropertyText1Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text4 text={text} additionalClassNames="px-[65px]">
        {children}
      </Text4>
    </div>
  );
}
type Helper2Props = {
  text: string;
  text1: string;
  text2: string;
  text3: string;
};

function Helper2({ text, text1, text2, text3 }: Helper2Props) {
  return (
    <Wrapper9>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[160px]">{text}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[180px]">{text1}</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[160px]">{text2}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] w-[160px]">{text3}</p>
      <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[200px]">
        <div className="bg-[#059669] rounded-[4px] shrink-0 size-[16px]" data-name="⚠️ ICON: lucide/circle-check [replace via Iconify]" />
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#059669] text-[14px] whitespace-nowrap">{"Paid"}</p>
      </div>
    </Wrapper9>
  );
}
type Helper1Props = {
  text: string;
  text1: string;
};

function Helper1({ text, text1 }: Helper1Props) {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] relative shrink-0 text-[#14181b] text-[14px]">{text}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#515d66] text-[12px]">{text1}</p>
    </div>
  );
}
type Text3Props = {
  text: string;
};

function Text3({ text }: Text3Props) {
  return (
    <div className="bg-white content-stretch flex items-center justify-center px-[16px] py-[8px] relative rounded-[8px] shrink-0">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[9px]" />
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type HelperProps = {
  text: string;
  text1: string;
  additionalClassNames?: string;
};

function Helper({ text, text1, additionalClassNames = "" }: HelperProps) {
  return (
    <div className={clsx("content-stretch flex items-start justify-between relative shrink-0 w-full", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] relative shrink-0 text-[#515d66]">{text}</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] relative shrink-0 text-[#14181b]">{text1}</p>
    </div>
  );
}
type Text2Props = {
  text: string;
  additionalClassNames?: string;
};

function Text2({ text, additionalClassNames = "" }: Text2Props) {
  return (
    <div className={clsx("content-stretch flex items-center relative w-full", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
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
    <Text4 text={text} additionalClassNames={additionalClassNames}>
      <path d={svgPaths.p277d2000} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M10 3.84267V13.8427" id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M6 2.15733V12.1573" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </Text4>
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
              <Wrapper10 additionalClassNames="h-[20px] w-[85.438px]">
                <Wrapper>
                  <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </Wrapper>
                <HeaderPropertyText3>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[14px] text-center whitespace-nowrap">Property</p>
                </HeaderPropertyText3>
              </Wrapper10>
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
          <Wrapper10 additionalClassNames="h-[36px] w-[443.172px]">
            <div className={`bg-[#ecfdf5] relative rounded-[8px] shrink-0 ${isSafty ? "h-[36px]" : "h-[32px]"}`} data-name="Container">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] relative">
                <Wrapper11>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[116px]">28% health score</p>
                </Wrapper11>
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
          </Wrapper10>
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
                    <Text4 text="Documents" additionalClassNames="px-[51px]">
                      <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    </Text4>
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
                  <Wrapper11>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                  </Wrapper11>
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
                      <Wrapper7 additionalClassNames="absolute left-[9px] top-[9px]">
                        <g clipPath="url(#clip0_1_15187)" id="Icon">
                          <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </g>
                        <defs>
                          <clipPath id="clip0_1_15187">
                            <rect fill="white" height="18" width="18" />
                          </clipPath>
                        </defs>
                      </Wrapper7>
                      <div className="absolute bg-[#059669] left-[24px] rounded-[9999px] size-[8px] top-[24px]" data-name="Text" />
                    </div>
                  </div>
                  <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="Container">
                    <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
                    <div className="content-stretch flex flex-col gap-[8px] items-start p-[12px] relative w-full">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                        <Wrapper8>
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
                        </Wrapper8>
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

export default function RentalPage() {
  return (
    <div className="bg-[#f5f6f7] content-stretch flex items-start relative size-full" data-name="Rental Page">
      <Sidebar className="bg-white relative rounded-[8px] self-stretch shrink-0 w-[280px]" />
      <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="content-area">
        <HeaderProperty className="bg-white h-[121px] relative shrink-0 w-full" property1="Rental" />
        <div className="content-stretch flex flex-col gap-[24px] items-start p-[32px] relative shrink-0 w-[1160px]" data-name="scroll-area">
          <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="page-header">
            <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
            <div className="flex flex-row items-center size-full">
              <div className="content-stretch flex items-center justify-between px-[32px] py-[24px] relative w-full">
                <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="headerLeft">
                  <div className="bg-[#dbeafe] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="unitIconBox">
                    <div className="bg-[#2563eb] rounded-[4px] shrink-0 size-[24px]" data-name="⚠️ ICON: lucide/building-2 [replace via Iconify]" />
                  </div>
                  <div className="content-stretch flex flex-col gap-[4px] items-start not-italic relative shrink-0" data-name="headerTitleArea">
                    <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] relative shrink-0 text-[#14181b] text-[20px] whitespace-nowrap">Unit 4B — 123 Maple St, Chicago, IL 60601</p>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] relative shrink-0 text-[#515d66] text-[14px] whitespace-pre">{`3 Bed / 2 Bath  |  1,250 sq ft  |  Floor 4`}</p>
                  </div>
                </div>
                <div className="bg-[#ecfdf5] content-stretch flex gap-[4px] items-center px-[12px] py-[4px] relative rounded-[12px] shrink-0" data-name="occupiedBadge">
                  <div className="relative shrink-0 size-[8px]" data-name="badgeDot">
                    <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" fill="var(--fill-0, #059669)" id="badgeDot" r="4" />
                    </svg>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#059669] text-[14px] whitespace-nowrap">Occupied</p>
                </div>
              </div>
            </div>
          </div>
          <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="Row1Stats">
            <Wrapper12>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px]">MONTHLY RENT</p>
              <p className="font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[43px] relative shrink-0 text-[#14181b] text-[36px] tracking-[-0.18px]">$2,450</p>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px]">/mo</p>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#059669] text-[12px]">↑ $150 above market avg</p>
            </Wrapper12>
            <Wrapper13>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">OCCUPANCY</p>
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#059669] text-[20px] whitespace-nowrap">Occupied</p>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Continuously for 6 months</p>
              <div className="bg-[#e8eaed] h-[6px] relative rounded-[4px] shrink-0 w-full" data-name="c2Bar">
                <div className="absolute bg-[#059669] h-[6px] left-0 rounded-[4px] top-0 w-[120px]" data-name="c2Fill" />
              </div>
            </Wrapper13>
            <Wrapper12>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px]">YTD NET INCOME</p>
              <p className="font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[43px] relative shrink-0 text-[#14181b] text-[36px] tracking-[-0.18px]">$21,875</p>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#059669] text-[12px]">↑ +8.2% vs last year</p>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px]">Rent collected minus expenses</p>
            </Wrapper12>
            <Wrapper13>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">BALANCE DUE</p>
              <p className="font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[43px] relative shrink-0 text-[#059669] text-[36px] tracking-[-0.18px] whitespace-nowrap">$0.00</p>
              <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="c4Status">
                <div className="bg-[#059669] rounded-[4px] shrink-0 size-[8px]" data-name="c4StatusDot" />
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#059669] text-[14px] whitespace-nowrap">Current</p>
              </div>
            </Wrapper13>
          </div>
          <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="Row2Chart">
            <div className="bg-white relative rounded-[12px] self-stretch shrink-0 w-[722px]" data-name="financial-chart">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
              <div className="content-stretch flex flex-col items-start justify-between p-[32px] relative size-full">
                <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="chartHeader">
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] whitespace-nowrap">Financial Overview</p>
                  <div className="bg-white content-stretch flex gap-[4px] items-center px-[12px] py-[4px] relative rounded-[8px] shrink-0" data-name="dateRange">
                    <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[9px]" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Jan – Jun 2025</p>
                    <div className="bg-[#6b7684] rounded-[4px] shrink-0 size-[16px]" data-name="⚠️ ICON: lucide/chevron-down [replace via Iconify]" />
                  </div>
                </div>
                <div className="content-stretch flex gap-[16px] h-[200px] items-end relative shrink-0 w-full" data-name="chart-bars">
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-full items-center justify-end min-h-px min-w-px relative" data-name="barJan">
                    <div className="bg-[#2563eb] h-[160px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="barJanFill" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Jan</p>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-full items-center justify-end min-h-px min-w-px relative" data-name="barFeb">
                    <div className="bg-[#2563eb] h-[145px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="barFebFill" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Feb</p>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-full items-center justify-end min-h-px min-w-px relative" data-name="barMar">
                    <div className="bg-[#2563eb] h-[170px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="barMarFill" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Mar</p>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-full items-center justify-end min-h-px min-w-px relative" data-name="barApr">
                    <div className="bg-[#2563eb] h-[155px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="barAprFill" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Apr</p>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-full items-center justify-end min-h-px min-w-px relative" data-name="barMay">
                    <div className="bg-[#2563eb] h-[140px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="barMayFill" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">May</p>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-full items-center justify-end min-h-px min-w-px relative" data-name="barJun">
                    <div className="bg-[#2563eb] h-[165px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="barJunFill" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Jun</p>
                  </div>
                </div>
                <div className="bg-[#e8eaed] h-px shrink-0 w-full" data-name="chartDivider" />
                <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap" data-name="chartSummary">
                  <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="summaryCol1">
                    <p className="leading-[18px] relative shrink-0 text-[#515d66] text-[12px]">Total Rent</p>
                    <p className="leading-[24px] relative shrink-0 text-[#14181b] text-[16px]">$14,700</p>
                  </div>
                  <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="summaryCol2">
                    <p className="leading-[18px] relative shrink-0 text-[#515d66] text-[12px]">Expenses</p>
                    <p className="leading-[24px] relative shrink-0 text-[#e11d48] text-[16px]">$3,250</p>
                  </div>
                  <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="summaryCol3">
                    <p className="leading-[18px] relative shrink-0 text-[#515d66] text-[12px]">Net Income</p>
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 text-[#059669]" data-name="sumVal3">
                      <p className="leading-[24px] relative shrink-0 text-[16px]">$11,450</p>
                      <p className="leading-[18px] relative shrink-0 text-[12px]">↑ vs prior</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[12px] shrink-0 w-[350px]" data-name="lease-summary">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
              <div className="relative shrink-0 w-full" data-name="leaseHeader">
                <div className="content-stretch flex flex-col gap-[4px] items-start pb-[16px] pt-[24px] px-[24px] relative w-full">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="leaseTitleRow">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[29px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">Lease Summary</p>
                    <div className="bg-[#dbeafe] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[4px] shrink-0" data-name="leaseTerm">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#2563eb] text-[12px] whitespace-nowrap">12-month</p>
                    </div>
                  </div>
                  <Text2 text="Jane Smith" additionalClassNames="shrink-0" />
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">→ View tenant profile</p>
                </div>
              </div>
              <div className="bg-[#e8eaed] h-px shrink-0 w-full" data-name="leaseDivider1" />
              <div className="relative shrink-0 w-full" data-name="leaseDetails">
                <div className="content-stretch flex flex-col gap-[12px] items-start not-italic px-[24px] py-[16px] relative w-full whitespace-nowrap">
                  <Helper text="Lease Start" text1="Mar 1, 2024" additionalClassNames="text-[14px]" />
                  <Helper text="Lease End" text1="Feb 28, 2025" additionalClassNames="text-[14px]" />
                  <Helper text="Rent" text1="$2,450/mo" additionalClassNames="text-[14px]" />
                  <Helper text="Deposit" text1="$4,900" additionalClassNames="text-[14px]" />
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="leaseRow5">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] relative shrink-0 text-[#515d66] text-[14px]">Auto-pay</p>
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 text-[#059669]" data-name="ld5v">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] relative shrink-0 text-[16px]">circle-check</p>
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] relative shrink-0 text-[14px]">Active</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[#e8eaed] h-px shrink-0 w-full" data-name="leaseDivider2" />
              <div className="bg-[#fffbeb] relative shrink-0 w-full" data-name="leaseWarning">
                <div className="flex flex-row items-center size-full">
                  <div className="content-stretch flex gap-[8px] items-center px-[16px] py-[12px] relative w-full">
                    <div className="bg-[#f59e0b] rounded-[4px] shrink-0 size-[16px]" data-name="⚠️ ICON: lucide/triangle-alert [replace via Iconify]" />
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#92400e] text-[14px] whitespace-nowrap">Expires in 47 days</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#2563eb] relative rounded-bl-[12px] rounded-br-[12px] shrink-0 w-full" data-name="renewBtn">
                <div className="flex flex-row justify-center size-full">
                  <div className="content-stretch flex items-start justify-center px-[24px] py-[12px] relative w-full">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Send Renewal Offer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="Row3Cards">
            <div className="bg-white content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative rounded-[12px]" data-name="tenant-profile">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
              <div className="relative shrink-0 w-full" data-name="tenantCardBody">
                <div className="content-stretch flex flex-col gap-[16px] items-start pb-[16px] pt-[24px] px-[24px] relative w-full">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="tenantCardHeader">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Tenant Profile</p>
                    <div className="bg-[#2563eb] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[40px]" data-name="tcAvatar">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">JS</p>
                    </div>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Jane Smith</p>
                  <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[4px] items-start leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap" data-name="tcContact">
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="tcEmail">
                      <p className="relative shrink-0">mail</p>
                      <p className="relative shrink-0">jane@email.com</p>
                    </div>
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="tcPhone">
                      <p className="relative shrink-0">phone</p>
                      <p className="relative shrink-0">(312) 555-0192</p>
                    </div>
                  </div>
                  <div className="bg-[#e8eaed] h-px shrink-0 w-full" data-name="tcDivider" />
                  <div className="content-stretch flex flex-col gap-[8px] items-start not-italic relative shrink-0 text-[14px] w-full whitespace-nowrap" data-name="tcMeta">
                    <Helper text="Moved in" text1="Mar 1, 2024" />
                    <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-center justify-between leading-[21px] relative shrink-0 w-full" data-name="tcPayRow">
                      <p className="relative shrink-0 text-[#515d66]">On-time payments</p>
                      <p className="relative shrink-0 text-[#059669]">98%</p>
                    </div>
                  </div>
                </div>
              </div>
              <Wrapper5 additionalClassNames="relative shrink-0 w-full">
                <div className="content-stretch flex items-center justify-between px-[24px] py-[12px] relative w-full">
                  <Text3 text="Message Tenant" />
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">View Full Profile →</p>
                </div>
              </Wrapper5>
            </div>
            <div className="bg-white content-stretch flex flex-[1_0_0] flex-col items-start justify-between min-h-px min-w-px relative rounded-[12px] self-stretch" data-name="Maintenance">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="table-footer">
                <div className="relative shrink-0 w-full" data-name="maintHeader">
                  <div className="flex flex-row items-center size-full">
                    <div className="content-stretch flex items-center justify-between px-[24px] py-[16px] relative w-full">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="maintTitleRow">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Maintenance</p>
                        <div className="bg-[#fff1f2] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[8px] shrink-0" data-name="maintBadge">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#e11d48] text-[12px] whitespace-nowrap">2 Open</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="maintBody">
                  <Wrapper1>
                    <Wrapper14>
                      <circle cx="5" cy="5" fill="var(--fill-0, #E11D48)" id="wo1Dot" r="5" />
                    </Wrapper14>
                    <Helper1 text="Leaky faucet — Kitchen" text1="High priority · Assigned: Bob V." />
                  </Wrapper1>
                  <Wrapper2>
                    <Wrapper14>
                      <circle cx="5" cy="5" fill="var(--fill-0, #F59E0B)" id="wo2Dot" r="5" />
                    </Wrapper14>
                    <Helper1 text="HVAC Filter Replacement" text1="Medium priority · Scheduled: Jun 15" />
                  </Wrapper2>
                </div>
              </div>
              <Wrapper3>
                <Text3 text="+ New Work Order" />
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">View All Orders →</p>
              </Wrapper3>
            </div>
            <div className="bg-white content-stretch flex flex-[1_0_0] flex-col items-start justify-between min-h-px min-w-px relative rounded-[12px] self-stretch" data-name="Documents">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="pagination-controls">
                <div className="relative shrink-0 w-full" data-name="docsHeader">
                  <div className="flex flex-row items-center size-full">
                    <Text2 text="Documents" additionalClassNames="justify-between px-[24px] py-[16px]" />
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="docsBody">
                  <Wrapper1>
                    <div className="bg-[#2563eb] rounded-[4px] shrink-0 size-[18px]" data-name="⚠️ ICON: lucide/file-text [replace via Iconify]" />
                    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px min-w-px relative" data-name="doc1Info">
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">Lease Agreement</p>
                      <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="doc1Status">
                        <div className="bg-[#ecfdf5] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0" data-name="doc1Badge">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#059669] text-[12px] whitespace-nowrap">Active</p>
                        </div>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Signed Mar 1, 2024</p>
                      </div>
                    </div>
                  </Wrapper1>
                  <Wrapper1>
                    <div className="bg-[#6b7684] rounded-[4px] shrink-0 size-[18px]" data-name="⚠️ ICON: lucide/clipboard-list [replace via Iconify]" />
                    <Helper1 text="Move-in Checklist" text1="Mar 1, 2024" />
                  </Wrapper1>
                  <Wrapper2>
                    <div className="bg-[#f59e0b] rounded-[4px] shrink-0 size-[18px]" data-name="⚠️ ICON: lucide/shield [replace via Iconify]" />
                    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px min-w-px relative" data-name="doc3Info">
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">Insurance Certificate</p>
                      <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="doc3Status">
                        <div className="bg-[#fffbeb] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0" data-name="doc3Badge">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#f59e0b] text-[12px] whitespace-nowrap">Expiring</p>
                        </div>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Exp: Dec 2025</p>
                      </div>
                    </div>
                  </Wrapper2>
                </div>
              </div>
              <Wrapper3>
                <Text3 text="Upload Document" />
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">View All Docs →</p>
              </Wrapper3>
            </div>
          </div>
          <div className="bg-white content-stretch flex flex-col items-start relative rounded-[12px] shrink-0 w-full" data-name="Row4Table">
            <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
            <div className="relative shrink-0 w-full" data-name="tableTopBar">
              <Wrapper9>
                <div className="content-stretch flex items-center relative shrink-0" data-name="tableTitleRow">
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] whitespace-nowrap">Payment History</p>
                </div>
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="tableActions">
                  <div className="bg-white content-stretch flex gap-[4px] items-center px-[12px] py-[8px] relative rounded-[8px] shrink-0" data-name="filterBtn">
                    <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[9px]" />
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Filter</p>
                    <div className="bg-[#6b7684] rounded-[4px] shrink-0 size-[14px]" data-name="⚠️ ICON: lucide/chevron-down [replace via Iconify]" />
                  </div>
                  <div className="bg-[#dbeafe] content-stretch flex gap-[4px] items-center px-[12px] py-[8px] relative rounded-[8px] shrink-0" data-name="exportBtn">
                    <div className="bg-[#2563eb] rounded-[4px] shrink-0 size-[14px]" data-name="⚠️ ICON: lucide/download [replace via Iconify]" />
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">Export CSV</p>
                  </div>
                </div>
              </Wrapper9>
            </div>
            <div className="bg-[#f5f6f7] relative shrink-0 w-full" data-name="tableHead">
              <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid border-t inset-[-1px_0] pointer-events-none" />
              <div className="flex flex-row items-center size-full">
                <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-center justify-between leading-[21px] not-italic px-[32px] py-[12px] relative text-[#515d66] text-[14px] w-full">
                  <p className="relative shrink-0 w-[160px]">Date</p>
                  <p className="relative shrink-0 w-[180px]">Type</p>
                  <p className="relative shrink-0 w-[160px]">Amount</p>
                  <p className="relative shrink-0 w-[160px]">Method</p>
                  <p className="relative shrink-0 w-[200px]">Status</p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="tableBody">
              <div className="relative shrink-0 w-full" data-name="tr1">
                <Helper2 text="Jun 1, 2025" text1="Rent" text2="$2,450" text3="ACH" />
              </div>
              <div className="relative shrink-0 w-full" data-name="tr2">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-solid border-t inset-[-1px_0_0_0] pointer-events-none" />
                <Helper2 text="May 1, 2025" text1="Rent" text2="$2,450" text3="ACH" />
              </div>
              <div className="relative shrink-0 w-full" data-name="tr3">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-solid border-t inset-[-1px_0_0_0] pointer-events-none" />
                <Helper2 text="Apr 3, 2025" text1="Late Fee" text2="$75.00" text3="Card" />
              </div>
              <Wrapper4 additionalClassNames="bg-[#fffbeb]">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[160px]">Apr 1, 2025</p>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[180px]">Rent</p>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[160px]">$2,450</p>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] w-[160px]">ACH</p>
                <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[200px]" data-name="tr4StatusFrame">
                  <div className="bg-[#f59e0b] rounded-[4px] shrink-0 size-[16px]" data-name="⚠️ ICON: lucide/triangle-alert [replace via Iconify]" />
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#f59e0b] text-[14px] whitespace-nowrap">Late (3 days)</p>
                </div>
              </Wrapper4>
              <div className="relative shrink-0 w-full" data-name="tr5">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-solid border-t inset-[-1px_0_0_0] pointer-events-none" />
                <Helper2 text="Mar 1, 2025" text1="Rent" text2="$2,450" text3="ACH" />
              </div>
              <Wrapper4>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[160px]">Mar 1, 2025</p>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[180px]">Security Deposit</p>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[160px]">$4,900</p>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] w-[160px]">Check</p>
                <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[200px]" data-name="tr6StatusFrame">
                  <div className="bg-[#6b7684] rounded-[4px] shrink-0 size-[16px]" data-name="⚠️ ICON: lucide/circle-check [replace via Iconify]" />
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Held in escrow</p>
                </div>
              </Wrapper4>
            </div>
            <Wrapper4>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Showing 1–6 of 24 payments</p>
              <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="pageControls">
                <div className="bg-white content-stretch flex gap-[4px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0" data-name="prevBtn">
                  <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[5px]" />
                  <div className="bg-[#6b7684] rounded-[4px] shrink-0 size-[14px]" data-name="⚠️ ICON: lucide/chevron-left [replace via Iconify]" />
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Prev</p>
                </div>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Page 1 of 4</p>
                <div className="bg-[#2563eb] content-stretch flex gap-[4px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0" data-name="nextBtn">
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Next</p>
                  <div className="bg-white rounded-[4px] shrink-0 size-[14px]" data-name="⚠️ ICON: lucide/chevron-right [replace via Iconify]" />
                </div>
              </div>
            </Wrapper4>
          </div>
        </div>
      </div>
    </div>
  );
}