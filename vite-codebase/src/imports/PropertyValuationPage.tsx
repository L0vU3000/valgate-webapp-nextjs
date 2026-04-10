import clsx from "clsx";
import svgPaths from "./svg-umokoo5pa4";
type ButtonProps = {
  additionalClassNames?: string;
  text: string;
  additionalClassNames1?: string;
};

function Button({ children, additionalClassNames = "", text, additionalClassNames1 = "" }: React.PropsWithChildren<ButtonProps>) {
  return (
    <div className={clsx("bg-white relative rounded-[6px] shrink-0", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className={clsx("content-stretch flex items-center justify-center px-[16px] py-[8px] relative", additionalClassNames)}>
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
        </div>
      </div>
    </div>
  );
}
type Wrapper7Props = {
  additionalClassNames?: string;
};

function Wrapper7({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper7Props>) {
  return (
    <div className={clsx("bg-white relative rounded-[12px] self-stretch", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">{children}</div>
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

function Wrapper6({ children }: React.PropsWithChildren<{}>) {
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
type Wrapper5Props = {
  additionalClassNames?: string;
};

function Wrapper5({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper5Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">{children}</div>
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

function ListItem1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper2>
      <div className="content-stretch flex h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0" data-name="Button">
        {children}
      </div>
    </Wrapper2>
  );
}

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper2>
      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
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

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return (
    <div className={clsx("flex-[1_0_0] min-h-px min-w-px relative", additionalClassNames)}>
      <div className="flex flex-col items-end justify-center size-full">
        <div className="content-stretch flex flex-col items-end justify-center px-[8px] relative size-full">{children}</div>
      </div>
    </div>
  );
}

function Icon({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper4>
      <g id="Icon">{children}</g>
    </Wrapper4>
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
type Helper1Props = {
  text: string;
  text1: string;
  text2: string;
  text3: string;
  additionalClassNames?: string;
};

function Helper1({ text, text1, text2, text3, additionalClassNames = "" }: Helper1Props) {
  return (
    <div className={clsx("font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[14px] w-full", additionalClassNames)}>
      <p className="mb-0">{text}</p>
      <p className="mb-0">{text1}</p>
      <p className="mb-0">{text2}</p>
      <p>{text3}</p>
    </div>
  );
}
type BadgeProps = {
  text: string;
  text1: string;
};

function Badge({ text, text1 }: BadgeProps) {
  return (
    <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap">
      <p className="leading-[24px] relative shrink-0 text-[#515d66] text-[14px]">{text}</p>
      <p className="leading-[28px] relative shrink-0 text-[#14181b] text-[16px]">{text1}</p>
    </div>
  );
}

function TableHeader() {
  return (
    <Wrapper additionalClassNames="h-[37px]">
      <div className="content-stretch flex items-center justify-end relative shrink-0 w-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">{"View Contract"}</p>
      </div>
    </Wrapper>
  );
}
type Text2Props = {
  text: string;
  text1: string;
};

function Text2({ text, text1 }: Text2Props) {
  return (
    <div className="content-stretch flex flex-col items-end justify-center not-italic relative shrink-0 text-ellipsis w-full whitespace-nowrap">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] overflow-hidden relative shrink-0 text-[#14181b] text-[14px]">{text}</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[#515d66] text-[12px]">{text1}</p>
    </div>
  );
}
type TableHeaderTextProps = {
  text: string;
};

function TableHeaderText({ text }: TableHeaderTextProps) {
  return (
    <div className="content-stretch flex h-[37px] items-center px-[8px] relative shrink-0 w-[205px]">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}

function Text1() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">{` 3/2`}</p>
    </div>
  );
}
type TextText1Props = {
  text: string;
};

function TextText1({ text }: TextText1Props) {
  return (
    <div className="content-stretch flex flex-col items-start justify-center not-italic relative shrink-0 text-ellipsis whitespace-nowrap">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] overflow-hidden relative shrink-0 text-[#14181b] text-[14px]">{text}</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[#515d66] text-[12px]">{`Built '18`}</p>
    </div>
  );
}
type TextProps = {
  text: string;
  text1: string;
};

function Text({ text, text1 }: TextProps) {
  return (
    <div className="content-stretch flex flex-col items-start justify-center not-italic relative shrink-0 text-ellipsis w-full whitespace-nowrap">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] min-w-full overflow-hidden relative shrink-0 text-[#14181b] text-[14px] w-[min-content]">{text}</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[#515d66] text-[12px]">{text1}</p>
    </div>
  );
}
type TextTextProps = {
  text: string;
};

function TextText({ text }: TextTextProps) {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">{text}</p>
    </div>
  );
}

function Helper() {
  return (
    <div className="h-0 relative shrink-0 w-full">
      <div className="absolute inset-[-0.5px_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 301.333 1">
          <path d="M0 0.5H301.333" id="Line 3" stroke="var(--stroke-0, #D1D5DB)" />
        </svg>
      </div>
    </div>
  );
}
type Chart19HelperProps = {
  additionalClassNames?: string;
};

function Chart19Helper({ additionalClassNames = "" }: Chart19HelperProps) {
  return (
    <div className={clsx("col-1 h-0 ml-[27.58px] relative row-1 w-[635.14px]", additionalClassNames)}>
      <div className="absolute inset-[-1px_0_0_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 635.14 1">
          <line id="Line 8" stroke="var(--stroke-0, #E8EAED)" strokeDasharray="3 6" strokeLinecap="round" x1="0.5" x2="634.64" y1="0.5" y2="0.5" />
        </svg>
      </div>
    </div>
  );
}
type HeadingTextProps = {
  text: string;
};

function HeadingText({ text }: HeadingTextProps) {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] not-italic relative shrink-0 text-[#14181b] text-[30px] tracking-[-0.225px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type CardTitleTextProps = {
  text: string;
};

function CardTitleText({ text }: CardTitleTextProps) {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
}

function SidebarIcon5() {
  return (
    <Wrapper1>
      <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon4() {
  return (
    <Wrapper1>
      <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon3() {
  return (
    <Wrapper1>
      <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon2() {
  return (
    <Wrapper1>
      <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}

function SidebarIcon1() {
  return (
    <Wrapper1>
      <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
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
        <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">
          <p className="leading-[28px]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarIcon() {
  return (
    <Wrapper1>
      <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper1>
  );
}
type Text4Props = {
  text: string;
};

function Text4({ text }: Text4Props) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text3Props = {
  text: string;
};

function Text3({ text }: Text3Props) {
  return (
    <div className="bg-[#2563eb] flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[9999px]">
      <Text4 text={text} />
    </div>
  );
}
type SidebarTextProps = {
  text: string;
};

function SidebarText({ text }: SidebarTextProps) {
  return (
    <div className="bg-[#2563eb] relative rounded-[8px] shrink-0 size-[32px]">
      <Text4 text={text} />
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
              <Wrapper5 additionalClassNames="h-[20px] w-[85.438px]">
                <Wrapper1>
                  <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </Wrapper1>
                <HeaderPropertyText3>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[14px] text-center whitespace-nowrap">Property</p>
                </HeaderPropertyText3>
              </Wrapper5>
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
          <Wrapper5 additionalClassNames="h-[36px] w-[443.172px]">
            <div className={`bg-[#ecfdf5] relative rounded-[8px] shrink-0 ${isSafty ? "h-[36px]" : "h-[32px]"}`} data-name="Container">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] relative">
                <Wrapper6>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[116px]">28% health score</p>
                </Wrapper6>
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
          </Wrapper5>
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
                  <Wrapper6>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                  </Wrapper6>
                </div>
              </div>
              <div className="relative shrink-0" data-name="User Container">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center px-[24px] py-[12px] relative">
                  <div className="content-stretch flex items-start overflow-clip relative rounded-[9999px] shrink-0 size-[40px]" data-name="User Pic Container">
                    <Text3 text="JD" />
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
                      <Wrapper3 additionalClassNames="absolute left-[9px] top-[9px]">
                        <g clipPath="url(#clip0_1_15187)" id="Icon">
                          <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </g>
                        <defs>
                          <clipPath id="clip0_1_15187">
                            <rect fill="white" height="18" width="18" />
                          </clipPath>
                        </defs>
                      </Wrapper3>
                      <div className="absolute bg-[#059669] left-[24px] rounded-[9999px] size-[8px] top-[24px]" data-name="Text" />
                    </div>
                  </div>
                  <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="Container">
                    <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
                    <div className="content-stretch flex flex-col gap-[8px] items-start p-[12px] relative w-full">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                        <Wrapper4>
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
                        </Wrapper4>
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
                <Text3 text="JD" />
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

export default function PropertyValuationPage() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Property Valuation Page">
      <Sidebar className="bg-white relative rounded-[8px] self-stretch shrink-0 w-[280px]" />
      <div className="bg-[#f5f6f7] relative shrink-0 w-[1160px]" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
          <HeaderProperty className="bg-white h-[121px] relative shrink-0 w-full" property1="Valuation" />
          <div className="bg-[#f5f6f7] relative shrink-0 w-full" data-name="page-content">
            <div className="flex flex-col items-center size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[48px] items-center pb-[32px] pt-[48px] px-[32px] relative w-full">
                <div className="content-stretch flex items-center relative shrink-0 w-[1094px]" data-name="property-pin">
                  <p className="font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[0] not-italic relative shrink-0 text-[#14181b] text-[0px] text-[48px] tracking-[-0.576px] whitespace-nowrap">
                    <span className="font-['Inter:Regular',sans-serif] font-normal leading-[48px]">Valuation for</span>
                    <span className="leading-[48px]">{` SR00015`}</span>
                  </p>
                </div>
                <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0" data-name="cluster-pin">
                  <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-name="kpi-card">
                    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="trend-badge">
                      <div className="bg-white content-stretch flex flex-col gap-[16px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[349.333px]" data-name="Button">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="property-card">
                          <div className="content-stretch flex items-center relative shrink-0" data-name="card-title">
                            <CardTitleText text="Current Market Value" />
                          </div>
                          <HeadingText text="$485,000" />
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[201px]">↗ +$18,500 (3.96%)</p>
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] w-[201px]">Since last quarter</p>
                        </div>
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#2563eb] text-[14px] w-[201px]">Update Estimates →</p>
                      </div>
                      <div className="bg-white content-stretch flex flex-col gap-[16px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[349.333px]" data-name="Button">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="property-card">
                          <div className="content-stretch flex items-center relative shrink-0" data-name="card-title">
                            <CardTitleText text="Current Market Value" />
                          </div>
                          <HeadingText text="$2,850/mo" />
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] w-[201px]">Your current: $2,650</p>
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[201px]">↗ $200/mo potential</p>
                        </div>
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#2563eb] text-[14px] w-[201px]">View Rental →</p>
                      </div>
                      <div className="bg-white content-stretch flex flex-col gap-[16px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[349.333px]" data-name="Button">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="property-card">
                          <div className="content-stretch flex items-center relative shrink-0" data-name="card-title">
                            <CardTitleText text="Total Appreciation" />
                          </div>
                          <div className="content-stretch flex items-center relative shrink-0" data-name="Heading 4">
                            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] not-italic relative shrink-0 text-[#065f46] text-[30px] tracking-[-0.225px] whitespace-nowrap">+$112,500</p>
                          </div>
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[201px]">30.2% gain</p>
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] w-[201px]">Since purchase (Dec 2019)</p>
                        </div>
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#2563eb] text-[14px] w-[201px]">View Full History →</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[24px] items-start justify-end relative shrink-0 w-full" data-name="section-title-row">
                    <Wrapper7 additionalClassNames="flex-[1_0_0] min-h-px min-w-px">
                      <div className="content-stretch flex items-start relative shrink-0" data-name="header-row">
                        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Property Value History</p>
                      </div>
                      <div className="bg-white content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 w-full" data-name="chart - 18">
                        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="chart18">
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[29.82px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[82px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[134.18px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[189.35px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[244.51px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[299.68px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-gradient-to-b col-1 from-[rgba(252,252,253,0)] h-[219.141px] ml-[353.35px] mt-[70.89px] rounded-[16px] row-1 to-[rgba(52,179,241,0.13)] w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[405.53px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[457.72px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[509.9px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[562.08px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <div className="bg-[#f5f6f7] col-1 h-[219.141px] ml-[614.27px] mt-[70.89px] rounded-[16px] row-1 w-[37.273px]" />
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[36.53px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[36.316px]">Jan</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[24.934px] leading-[24px] ml-[1.49px] mt-[276.32px] not-italic relative row-1 text-[#14181b] text-[14px] w-[11.673px]">0</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[24.934px] leading-[24px] ml-[1.49px] mt-[240.21px] not-italic relative row-1 text-[#14181b] text-[14px] w-[11.673px]">2</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[24.934px] leading-[24px] ml-[1.49px] mt-[204.82px] not-italic relative row-1 text-[#14181b] text-[14px] w-[11.673px]">4</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[24.934px] leading-[24px] ml-[1.49px] mt-[167.36px] not-italic relative row-1 text-[#14181b] text-[14px] w-[11.673px]">6</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[24.934px] leading-[24px] ml-[1.49px] mt-[130.94px] not-italic relative row-1 text-[#14181b] text-[14px] w-[11.673px]">8</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[24.934px] leading-[24px] ml-0 mt-[94.51px] not-italic relative row-1 text-[#14181b] text-[14px] w-[20.752px]">10</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[24.934px] leading-[24px] ml-0 mt-[59.13px] not-italic relative row-1 text-[#14181b] text-[14px] w-[19.455px]">12</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[90.2px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[36.316px]">Feb</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[140.89px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[38.91px]">Mar</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[197.55px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[35.019px]">Apr</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[250.48px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[41.505px]">May</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[306.39px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[36.316px]">Jun</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[362.3px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[28.534px]">Jul</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[410.75px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[38.91px]">Aug</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[465.17px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[38.91px]">Sep</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[518.85px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[35.019px]">Oct</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[571.03px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[40.207px]">Nov</p>
                          <p className="col-1 font-['Inter:Regular',sans-serif] font-normal h-[29.089px] leading-[28px] ml-[624.7px] mt-[299.59px] not-italic relative row-1 text-[#14181b] text-[16px] w-[38.91px]">Dec</p>
                          <div className="col-1 content-stretch flex gap-[4px] h-[25.972px] items-center justify-center ml-[603px] mt-0 px-[8px] py-[2px] relative rounded-[8px] row-1" data-name="this week">
                            <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-[-0.5px] pointer-events-none rounded-[8.5px]" />
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px] text-center whitespace-nowrap">Year</p>
                            <div className="bg-[#14181b] overflow-clip relative shrink-0 size-[10.92px]" data-name="Arrow - Down 2">
                              <div className="absolute contents inset-[32.29%_17.71%]" data-name="Iconly/Light-Outline/Arrow---Down-2">
                                <div className="absolute inset-[32.29%_17.71%]" data-name="Arrow---Down-2">
                                  <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7.05275 3.86764">
                                    <g id="Arrow---Down-2">
                                      <path d={svgPaths.p3671a300} fill="var(--fill-0, #6B7684)" id="Stroke-1" />
                                    </g>
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-[2px] mt-[29.71px] place-items-start relative row-1">
                            <div className="bg-[#2563eb] col-1 h-[9.554px] ml-0 mt-[4.95px] rounded-[4px] row-1 w-[11.928px]" />
                            <p className="col-1 font-['Inter:Regular',sans-serif] font-normal leading-[21px] ml-[20.89px] mt-0 not-italic relative row-1 text-[#6b7684] text-[14px] whitespace-nowrap">Price</p>
                          </div>
                          <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-[74px] mt-[29.71px] place-items-start relative row-1">
                            <div className="bg-[#e8eaed] col-1 h-[9.554px] ml-0 mt-[4.95px] rounded-[4px] row-1 w-[11.928px]" />
                            <p className="col-1 font-['Inter:Regular',sans-serif] font-normal leading-[21px] ml-[20.89px] mt-0 not-italic relative row-1 text-[#6b7684] text-[14px] whitespace-nowrap">Market Price</p>
                          </div>
                          <Chart19Helper additionalClassNames="mt-[290.03px]" />
                          <Chart19Helper additionalClassNames="mt-[253.61px]" />
                          <Chart19Helper additionalClassNames="mt-[217.18px]" />
                          <Chart19Helper additionalClassNames="mt-[180.76px]" />
                          <Chart19Helper additionalClassNames="mt-[144.34px]" />
                          <Chart19Helper additionalClassNames="mt-[107.91px]" />
                          <Chart19Helper additionalClassNames="mt-[71.49px]" />
                          <div className="col-1 h-[123px] ml-[30px] mt-[102px] relative row-1 w-[642px]">
                            <div className="absolute inset-[-1.63%_-0.31%]">
                              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 646.001 127">
                                <path d={svgPaths.p2720a280} id="Vector 10" stroke="var(--stroke-0, #D1D5DB)" strokeLinecap="round" strokeWidth="4" />
                              </svg>
                            </div>
                          </div>
                          <div className="col-1 h-[103.301px] ml-[32.8px] mt-[92.98px] relative row-1 w-[638.867px]">
                            <div className="absolute inset-[-1.94%_-0.31%]">
                              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 642.868 107.301">
                                <path d={svgPaths.p2cdbb8c0} id="Vector 11" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeWidth="4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 size-[100px]" data-name="search-field" />
                        <div className="absolute contents left-[326px] top-[46px]">
                          <div className="absolute bg-[#14181b] content-stretch flex items-start left-[326px] px-[16px] py-[4px] rounded-[16px] top-[46px]" data-name="layout-1">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[12px] text-white whitespace-nowrap">$450,000</p>
                          </div>
                          <div className="absolute h-[7px] left-[357.5px] top-[74px] w-[25px]" data-name="layout-2">
                            <div className="absolute inset-[-17.86%_0_0_0]">
                              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 8.25">
                                <g id="layout-2">
                                  <path d={svgPaths.p6188b00} fill="var(--fill-0, #14181B)" id="Polygon 1" />
                                </g>
                              </svg>
                            </div>
                          </div>
                          <div className="absolute left-[369px] size-[6.897px] top-[91px]" data-name="layout-3">
                            <div className="absolute inset-[-29%]">
                              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.8971 10.8971">
                                <g id="layout-3">
                                  <circle cx="5.44854" cy="5.44854" fill="var(--fill-0, #2563EB)" id="Ellipse 11" r="4.44854" stroke="var(--stroke-0, #14181B)" strokeWidth="2" />
                                </g>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Wrapper7>
                    <div className="bg-white content-stretch flex flex-col gap-[24px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[349.333px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Market Insight</p>
                      <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="property-card">
                        <div className="content-stretch flex flex-col font-['Inter:Medium',sans-serif] font-medium items-start justify-center not-italic relative shrink-0" data-name="card-title">
                          <p className="leading-[20px] relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Your Neighbourhood</p>
                          <p className="leading-[14px] relative shrink-0 text-[#14181b] text-[14px] w-[201px]">Phnom Penh, Cambodia</p>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col gap-[8px] items-start not-italic relative shrink-0 w-full" data-name="card-row-1">
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Market Conditions</p>
                        <div className="h-[70px] relative shrink-0 w-[201px]" data-name="card-row-2">
                          <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-0 text-[#515d66] text-[12px] top-0 whitespace-nowrap">Avg. Days on Market</p>
                          <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[28px] left-0 text-[#14181b] text-[20px] top-[22px] whitespace-nowrap">42 days</p>
                          <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-0 text-[#065f46] text-[14px] top-[52px] w-[201px]">30.2% gain</p>
                        </div>
                      </div>
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Inventory Level</p>
                      <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0" data-name="Heading 4">
                        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] not-italic relative shrink-0 text-[#f59e0b] text-[30px] tracking-[-0.225px] whitespace-nowrap">Low</p>
                        <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="card-row-3">
                          <div className="bg-[#f59e0b] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#f59e0b] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#f59e0b] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#e8eaed] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#e8eaed] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0" data-name="Heading 5">
                        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] not-italic relative shrink-0 text-[#065f46] text-[30px] tracking-[-0.225px] whitespace-nowrap">High</p>
                        <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="card-row-3">
                          <div className="bg-[#059669] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#059669] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#059669] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#059669] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                          <div className="bg-[#059669] h-[10px] rounded-[2px] shrink-0 w-[24px]" />
                        </div>
                      </div>
                      <Helper />
                      <div className="content-stretch flex flex-col items-start leading-[24px] not-italic relative shrink-0 w-full" data-name="property-card-item">
                        <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#14181b] text-[16px] w-full">{`Market Trend: Seller's Market`}</p>
                        <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#515d66] text-[14px] w-full">Properties selling 12% above list price on average</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="container">
                    <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                    <div className="content-stretch flex flex-col gap-[12px] items-start p-[24px] relative w-full">
                      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="empty-placeholder">
                        <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="icon-pill">
                          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Comparable Properties in Your Area</p>
                          <Button text="View Full Report" />
                        </div>
                        <div className="content-stretch flex items-end relative shrink-0" data-name="body-text">
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Properties similar to yours that sold recently</p>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col items-start relative rounded-[6px] shrink-0 w-full" data-name="Table">
                        <div className="bg-[#f5f6f7] content-stretch flex h-[56px] items-center relative shrink-0 w-full" data-name="Header">
                          <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                          <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                            <TextText text="Address" />
                          </div>
                          <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                            <TextText text="Type" />
                          </div>
                          <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                            <TextText text="Beds/Bath" />
                          </div>
                          <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[205px]" data-name="Table header">
                            <TextText text="Sq Ft" />
                          </div>
                          <div className="content-stretch flex flex-col h-[40px] items-end justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                            <div className="content-stretch flex items-center justify-end relative shrink-0 w-full" data-name="Text">
                              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic overflow-hidden relative shrink-0 text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">Sold Price</p>
                            </div>
                          </div>
                          <Wrapper additionalClassNames="h-[40px]">
                            <div className="content-stretch flex items-center justify-end relative shrink-0 w-full" data-name="Text">
                              <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis text-right whitespace-nowrap">Sale Contract</p>
                            </div>
                          </Wrapper>
                        </div>
                        <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                          <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                            <Text text="1847 Oak Street" text1="0.3 mi away · Feb 2026" />
                          </div>
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                            <TextText1 text="House" />
                          </div>
                          <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                            <Text1 />
                          </div>
                          <TableHeaderText text="1,850" />
                          <div className="content-stretch flex flex-col items-end justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                            <Text2 text="$492,000" text1="$266/sqft" />
                          </div>
                          <TableHeader />
                        </div>
                        <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                          <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                            <Text text="1847 Oak Street" text1="0.3 mi away · Feb 2026" />
                          </div>
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                            <TextText1 text="House" />
                          </div>
                          <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                            <Text1 />
                          </div>
                          <TableHeaderText text="1,850" />
                          <div className="content-stretch flex flex-col items-end justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                            <Text2 text="$492,000" text1="$266/sqft" />
                          </div>
                          <TableHeader />
                        </div>
                        <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                          <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                            <Text text="1847 Oak Street" text1="0.3 mi away · Feb 2026" />
                          </div>
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                            <TextText1 text="House" />
                          </div>
                          <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                            <Text1 />
                          </div>
                          <TableHeaderText text="1,850" />
                          <div className="content-stretch flex flex-col items-end justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                            <Text2 text="$492,000" text1="$266/sqft" />
                          </div>
                          <TableHeader />
                        </div>
                        <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                          <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                            <Text text="1847 Oak Street" text1="0.3 mi away · Feb 2026" />
                          </div>
                          <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                            <TextText1 text="House" />
                          </div>
                          <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                            <Text1 />
                          </div>
                          <TableHeaderText text="1,850" />
                          <div className="content-stretch flex flex-col items-end justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                            <Text2 text="$492,000" text1="$266/sqft" />
                          </div>
                          <TableHeader />
                        </div>
                      </div>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[0] not-italic overflow-hidden relative shrink-0 text-[#64748b] text-[14px] text-ellipsis whitespace-nowrap">
                        <span className="leading-[24px]">{`Average comp price: `}</span>
                        <span className="font-['Inter:Bold',sans-serif] font-bold leading-[24px] text-[#1e293b]">$492,100</span>
                        <span className="leading-[24px]">{` · Your estimated value: `}</span>
                        <span className="font-['Inter:Bold',sans-serif] font-bold leading-[24px] text-[#1e293b]">$485,000</span>
                      </p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[24px] items-start relative shrink-0" data-name="card-actions">
                    <Wrapper7 additionalClassNames="shrink-0 w-[349.333px]">
                      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Investment Performance</p>
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="chart-legend">
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="ownership-chart">
                          <div className="h-[33px] relative shrink-0 w-[297.333px]" data-name="chart-donut">
                            <div className="absolute content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-center justify-between left-0 not-italic top-0 w-[297.333px] whitespace-nowrap" data-name="badge">
                              <p className="leading-[24px] relative shrink-0 text-[#515d66] text-[14px]">Cash-on-Cash Return</p>
                              <p className="leading-[28px] relative shrink-0 text-[#065f46] text-[16px]">8.4%</p>
                            </div>
                            <div className="absolute h-0 left-0 top-[33px] w-[297.333px]">
                              <div className="absolute inset-[-0.5px_0]">
                                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 297.333 1">
                                  <path d="M0 0.5H297.333" id="Line 3" stroke="var(--stroke-0, #D1D5DB)" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="chart-donut">
                          <Badge text="Cap Rate" text1="6.2%" />
                          <Helper />
                        </div>
                        <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="chart-legend">
                          <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap" data-name="badge">
                            <p className="leading-[24px] relative shrink-0 text-[#515d66] text-[14px]">Total ROI (Since Purchase)</p>
                            <p className="leading-[28px] relative shrink-0 text-[#065f46] text-[16px]">42.7%</p>
                          </div>
                          <Helper />
                        </div>
                        <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="chart-center">
                          <Badge text="Equity Gained" text1="$137,800" />
                          <Helper />
                        </div>
                      </div>
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#2563eb] text-[14px] w-[201px]">View Detailed Report →</p>
                    </Wrapper7>
                    <div className="bg-white relative rounded-[12px] self-stretch shrink-0 w-[349.333px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <div className="content-stretch flex flex-col gap-[24px] items-start not-italic p-[24px] relative size-full">
                        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">What Impacts Your Value</p>
                        <div className="content-stretch flex flex-col items-start leading-[24px] relative shrink-0 w-full" data-name="property-card-item">
                          <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#065f46] text-[16px] w-full">Positive Factors:</p>
                          <Helper1 text="✓ Recent kitchen renovation" text1="✓ Low crime area" text2="✓ Top-rated schools nearby" text3="✓ New transit line opening" additionalClassNames="text-[#515d66]" />
                        </div>
                        <div className="content-stretch flex flex-col items-start leading-[24px] relative shrink-0 w-full" data-name="card-actions">
                          <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#f59e0b] text-[16px] w-full">Improvement Opportunities:</p>
                          <div className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#515d66] text-[14px] w-full whitespace-pre-wrap">
                            <p className="mb-0">{`⚠ Outdated bathrooms `}</p>
                            <p className="mb-0">⚠ Aging HVAC system</p>
                            <p>⚠ Limited curb appeal</p>
                          </div>
                        </div>
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">Get Improvement Estimates →</p>
                      </div>
                    </div>
                    <div className="bg-white content-stretch flex flex-col gap-[24px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[349.333px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Get Professional Appraisal</p>
                      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="property-card-item">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[14px] w-full">Our estimates use public data and algorithms. For the most accurate valuation (required for refinancing or selling):</p>
                      </div>
                      <div className="bg-[#f5f6f7] relative rounded-[8px] shrink-0 w-full" data-name="chart-ring">
                        <div className="overflow-clip rounded-[inherit] size-full">
                          <div className="content-stretch flex flex-col gap-[4px] items-start p-[8px] relative w-full">
                            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] w-full">Professional Appraisal</p>
                            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="property-card-item">
                              <Helper1 text="• Licensed appraiser" text1="• Bank-acceptable report" text2="• 3-5 business days" text3="• Starting at $350" additionalClassNames="leading-[24px] not-italic text-[#14181b]" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#2563eb] relative rounded-[6px] shrink-0 w-full" data-name="button">
                        <div className="flex flex-row items-center justify-center size-full">
                          <div className="content-stretch flex items-center justify-center px-[16px] py-[8px] relative w-full">
                            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Request Appraisal</p>
                          </div>
                        </div>
                      </div>
                      <Button additionalClassNames="w-full" text="Learn More" additionalClassNames1="w-full" />
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