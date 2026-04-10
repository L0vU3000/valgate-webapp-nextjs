import clsx from "clsx";
import svgPaths from "./svg-pjkuc3oqnv";

function Button({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white relative rounded-[12px] self-stretch shrink-0 w-[349.333px]">
      <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[24px] relative size-full">{children}</div>
    </div>
  );
}

function Wrapper6({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[24px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        {children}
      </svg>
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

function Wrapper5({ children }: React.PropsWithChildren<{}>) {
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
type Wrapper4Props = {
  additionalClassNames?: string;
};

function Wrapper4({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper4Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">{children}</div>
    </div>
  );
}

function Wrapper3({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">{children}</p>
    </div>
  );
}

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">{children}</p>
    </div>
  );
}

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        {children}
      </svg>
    </div>
  );
}
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return (
    <div className={clsx("size-[18px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        {children}
      </svg>
    </div>
  );
}
type Icon2Props = {
  additionalClassNames?: string;
};

function Icon2({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon2Props>) {
  return (
    <Wrapper additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper>
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

function Icon({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper1>
      <g id="Icon">{children}</g>
    </Wrapper1>
  );
}
type Text2Props = {
  text: string;
};

function Text2({ text, children }: React.PropsWithChildren<Text2Props>) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center py-[4px] relative size-full">
      <Icon>{children}</Icon>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text2Props = {
  text: string;
  additionalClassNames?: string;
};
type HeaderPropertyText2Props = {
  text: string;
};

function HeaderPropertyText2({ text, children }: React.PropsWithChildren<HeaderPropertyText2Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text2 text={text} additionalClassNames="px-[55px]">
        {children}
      </Text2>
    </div>
  );
}
type HeaderPropertyText1Props = {
  text: string;
};

function HeaderPropertyText1({ text, children }: React.PropsWithChildren<HeaderPropertyText1Props>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <Text2 text={text} additionalClassNames="px-[65px]">
        {children}
      </Text2>
    </div>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text, children }: React.PropsWithChildren<Text1Props>) {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none rotate-180">
          <div className="h-0 relative w-[29px]">
            <div className="absolute inset-[-3px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29 3">
                {children}
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type CardRowProps = {
  text: string;
  text1: string;
};

function CardRow({ text, text1 }: CardRowProps) {
  return (
    <div className="content-stretch flex flex-col font-['Inter:Medium',sans-serif] font-medium items-start justify-center relative shrink-0 text-[#515d66]">
      <p className="leading-[14px] relative shrink-0 text-[14px]">{text}</p>
      <p className="leading-[20px] relative shrink-0 text-[12px]">{text1}</p>
    </div>
  );
}
type TableHeaderTextProps = {
  text: string;
};

function TableHeaderText({ text }: TableHeaderTextProps) {
  return (
    <div className="content-stretch flex h-[37px] items-center px-[8px] relative shrink-0 w-[145px]">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextText4Props = {
  text: string;
};

function TextText4({ text }: TextText4Props) {
  return <Wrapper2>{text}</Wrapper2>;
}
type TextText3Props = {
  text: string;
};

function TextText3({ text }: TextText3Props) {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic overflow-hidden relative shrink-0 text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextText2Props = {
  text: string;
};

function TextText2({ text }: TextText2Props) {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic overflow-hidden relative shrink-0 text-[#14181b] text-[14px] text-ellipsis w-full whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextText1Props = {
  text: string;
};

function TextText1({ text }: TextText1Props) {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">{text}</p>
    </div>
  );
}

function Helper1() {
  return (
    <div className="h-0 relative shrink-0 w-[297.333px]">
      <div className="absolute inset-[-0.5px_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 297.333 1">
          <path d="M0 0.5H297.333" id="Line 3" stroke="var(--stroke-0, #D1D5DB)" />
        </svg>
      </div>
    </div>
  );
}
type HelperProps = {
  text: string;
  text1: string;
};

function Helper({ text, text1 }: HelperProps) {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] relative shrink-0 text-[12px]">{text}</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[24px] relative shrink-0 text-[14px]">{text1}</p>
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
  return <Wrapper3>{text}</Wrapper3>;
}

function LucideBox() {
  return (
    <div className="relative shrink-0 size-[118px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 118 118">
        <g id="lucide/box">
          <path d={svgPaths.p14c26f0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
        </g>
      </svg>
    </div>
  );
}
type TextTextProps = {
  text: string;
};

function TextText({ text }: TextTextProps) {
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
    <Text2 text={text} additionalClassNames={additionalClassNames}>
      <path d={svgPaths.p277d2000} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M10 3.84267V13.8427" id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M6 2.15733V12.1573" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </Text2>
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
              <Wrapper4 additionalClassNames="h-[20px] w-[85.438px]">
                <Icon1>
                  <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </Icon1>
                <HeaderPropertyText3>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[14px] text-center whitespace-nowrap">Property</p>
                </HeaderPropertyText3>
              </Wrapper4>
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
          <Wrapper4 additionalClassNames="h-[36px] w-[443.172px]">
            <div className={`bg-[#ecfdf5] relative rounded-[8px] shrink-0 ${isSafty ? "h-[36px]" : "h-[32px]"}`} data-name="Container">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] relative">
                <Wrapper5>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[116px]">28% health score</p>
                </Wrapper5>
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
                <Icon2 additionalClassNames="relative shrink-0">
                  <path d={svgPaths.p3f4e600} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p2aca4e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p10b1cef0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </Icon2>
              </div>
            </div>
          </Wrapper4>
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
                    <Text2 text="Documents" additionalClassNames="px-[51px]">
                      <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    </Text2>
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

export default function PropertySpatialFull() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Property Spatial - Full">
      <div className="bg-[#f5f6f7] relative self-stretch shrink-0 w-[280px]" data-name="Sidebar">
        <div aria-hidden="true" className="absolute border-[#e8eaed] border-r border-solid inset-0 pointer-events-none" />
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[32px] pr-px relative size-full">
          <div className="h-[81px] relative shrink-0 w-[279px]" data-name="Logo Container">
            <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center pb-px pl-[24px] relative size-full">
              <div className="bg-[#2563eb] relative rounded-[10px] shrink-0 size-[32px]" data-name="Icon Container">
                <Text text="V" />
              </div>
              <Wrapper5>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#111827] text-[16px] whitespace-nowrap">Valgate</p>
              </Wrapper5>
            </div>
          </div>
          <div className="relative shrink-0" data-name="User Container">
            <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center px-[24px] py-[11px] relative">
              <div className="content-stretch flex items-start overflow-clip relative rounded-[33554400px] shrink-0 size-[40px]" data-name="User Pic Container">
                <div className="bg-[#2563eb] flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[33554400px]" data-name="Text">
                  <Text text="JD" />
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-[179px]" data-name="Container">
                <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-full" data-name="Paragraph">
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#111827] text-[16px] whitespace-nowrap">Jon Doe</p>
                </div>
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
                    <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                      <Icon1>
                        <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </Icon1>
                      <TextText text="Home" />
                    </div>
                  </ListItem>
                  <ListItem>
                    <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                      <Icon1>
                        <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </Icon1>
                      <TextText text="Portfolio" />
                    </div>
                  </ListItem>
                  <ListItem>
                    <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                      <Icon1>
                        <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </Icon1>
                      <TextText text="Map" />
                    </div>
                  </ListItem>
                  <ListItem>
                    <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                      <Icon1>
                        <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </Icon1>
                      <TextText text="Analytics" />
                    </div>
                  </ListItem>
                  <ListItem>
                    <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[10px] shrink-0 w-[255px]" data-name="Button">
                      <Icon1>
                        <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </Icon1>
                      <TextText text="Succession" />
                      <div className="bg-[#eff6ff] h-[20px] relative rounded-[33554400px] shrink-0 w-[45.391px]" data-name="Text">
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
                          <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #374151)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
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
            <div aria-hidden="true" className="absolute border-[#e5e7eb] border-solid border-t inset-0 pointer-events-none" />
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start pb-[32px] pt-[17px] px-[12px] relative w-full">
              <div className="h-[36px] relative shrink-0 w-full" data-name="Container">
                <div className="absolute content-stretch flex items-center justify-center left-0 rounded-[10px] size-[36px] top-0" data-name="Button">
                  <Icon2 additionalClassNames="relative shrink-0">
                    <path d={svgPaths.p137c7200} id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <path d={svgPaths.p254f3200} id="Vector_2" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </Icon2>
                </div>
                <div className="absolute left-[44px] rounded-[10px] size-[36px] top-0" data-name="Button">
                  <Icon2 additionalClassNames="absolute left-[9px] top-[9px]">
                    <path d={svgPaths.p985d280} id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <path d={svgPaths.p2ac55e70} id="Vector_2" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </Icon2>
                  <div className="absolute bg-[#ef4444] left-[24px] rounded-[33554400px] size-[8px] top-[4px]" data-name="Text" />
                </div>
                <div className="absolute left-[88px] rounded-[10px] size-[36px] top-0" data-name="Button">
                  <Wrapper additionalClassNames="absolute left-[9px] top-[9px]">
                    <g clipPath="url(#clip0_1_15101)" id="Icon">
                      <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #4B5563)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_15101">
                        <rect fill="white" height="18" width="18" />
                      </clipPath>
                    </defs>
                  </Wrapper>
                  <div className="absolute bg-[#10b981] left-[24px] rounded-[33554400px] size-[8px] top-[24px]" data-name="Text" />
                </div>
              </div>
              <div className="bg-white relative rounded-[10px] shrink-0 w-full" data-name="Container">
                <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
                <div className="content-stretch flex flex-col gap-[8px] items-start pb-px pt-[13px] px-[13px] relative w-full">
                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                    <Wrapper1>
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
                    </Wrapper1>
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
      <div className="bg-[#f5f6f7] flex-[1_0_0] min-h-px min-w-px relative" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
          <HeaderProperty className="bg-white h-[121px] relative shrink-0 w-full" property1="Spatial" />
          <div className="bg-[#f5f6f7] relative shrink-0 w-full" data-name="page-body">
            <div className="flex flex-col items-center size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[48px] items-center pb-[32px] pt-[48px] px-[32px] relative w-full">
                <div className="content-stretch flex items-center relative shrink-0 w-[1094px]" data-name="property-pin">
                  <p className="font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[0] not-italic relative shrink-0 text-[#14181b] text-[0px] text-[48px] tracking-[-0.576px] whitespace-nowrap">
                    <span className="font-['Inter:Regular',sans-serif] font-normal leading-[48px]">Valuation for</span>
                    <span className="leading-[48px]">{` SR00015`}</span>
                  </p>
                </div>
                <div className="bg-[#14181b] content-stretch flex flex-col h-[546px] items-end justify-between overflow-clip p-[24px] relative rounded-[8px] shrink-0 w-[1096px]" data-name="search-results">
                  <div className="content-stretch flex gap-[24px] items-start justify-end overflow-clip relative shrink-0 w-full" data-name="layer-toggle">
                    <div className="content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-[44px]" data-name="tab-content">
                      <div className="bg-white content-stretch flex items-start overflow-clip p-[8px] relative rounded-[8px] shrink-0" data-name="compass-rose">
                        <Wrapper6>
                          <g id="lucide/zoom-in">
                            <path d={svgPaths.p1b9cc900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </Wrapper6>
                      </div>
                      <div className="bg-white content-stretch flex items-start overflow-clip p-[8px] relative rounded-[8px] shrink-0" data-name="scale-bar">
                        <Wrapper6>
                          <g id="lucide/zoom-out">
                            <path d={svgPaths.p39d6100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </Wrapper6>
                      </div>
                    </div>
                    <div className="bg-white content-stretch flex flex-col items-start p-[24px] relative rounded-[8px] shrink-0 w-[280px]" data-name="content-panel">
                      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="drawing-tools">
                        <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0" data-name="tool-group">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">BORDER LEGEND</p>
                          <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="filter-panel">
                            <Text1 text="Property Line">
                              <line id="Line 15" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeWidth="3" x1="1.5" x2="27.5" y1="1.5" y2="1.5" />
                            </Text1>
                            <Text1 text="Easement">
                              <line id="Line 15" stroke="var(--stroke-0, #E11D48)" strokeLinecap="round" strokeWidth="3" x1="1.5" x2="27.5" y1="1.5" y2="1.5" />
                            </Text1>
                            <Text1 text="Setback Zone">
                              <line id="Line 15" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="3" x1="1.5" x2="27.5" y1="1.5" y2="1.5" />
                            </Text1>
                          </div>
                        </div>
                        <Wrapper6>
                          <g id="lucide/plus">
                            <path d="M5 12H19M12 5V19" id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </Wrapper6>
                      </div>
                    </div>
                    <div className="absolute content-stretch flex flex-col gap-[8px] h-[357px] items-center justify-center left-[284px] overflow-clip top-[82px] w-[464px]" data-name="map-badge">
                      <LucideBox />
                      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[32px] not-italic relative shrink-0 text-[#515d66] text-[24px] tracking-[-0.144px] whitespace-nowrap">3D Aerial View</p>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Interactive terrain scan - Full immersive mode</p>
                    </div>
                  </div>
                  <div className="bg-[#2563eb] relative rounded-[6px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0" data-name="Button">
                    <div className="flex flex-row items-center justify-center size-full">
                      <div className="content-stretch flex items-center justify-center px-[24px] py-[10px] relative">
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[19px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">Full Screen View</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[1094px]" data-name="cluster-pin">
                  <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-name="kpi-card">
                    <div className="content-stretch flex gap-[24px] h-[244px] items-start relative shrink-0 w-full" data-name="trend-badge">
                      <Button>
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="property-card">
                          <div className="content-stretch flex items-center relative shrink-0" data-name="card-title">
                            <CardTitleText text="Total Land Size" />
                          </div>
                          <HeadingText text="2,450 m²" />
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] w-[201px]">0.245 hectares</p>
                        </div>
                        <Helper1 />
                        <div className="content-stretch flex items-start not-italic relative shrink-0 text-[#515d66] w-full whitespace-nowrap" data-name="list-item-badge">
                          <Helper text="Width" text1="45.2m" />
                          <Helper text="Length" text1="54.3m" />
                        </div>
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="property-card">
                          <div className="content-stretch flex items-center relative shrink-0" data-name="card-title">
                            <CardTitleText text="Current Zoning" />
                          </div>
                          <HeadingText text="Agricultural Zone" />
                          <div className="bg-[#ecfdf5] content-stretch flex h-[24px] items-center justify-center px-[12px] py-[4px] relative rounded-[9999px] shrink-0" data-name="Container">
                            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#065f46] text-[14px] whitespace-nowrap">A-2 Classification</p>
                          </div>
                        </div>
                        <Helper1 />
                        <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="list-item-badge">
                          <div className="content-stretch flex flex-[1_0_0] flex-col font-['Inter:Medium',sans-serif] font-medium items-start leading-[20px] min-h-px min-w-px not-italic relative text-[#515d66] text-[12px] whitespace-nowrap" data-name="list-item">
                            <p className="relative shrink-0">Development Potential</p>
                            <p className="relative shrink-0">Residential Subdivision</p>
                            <p className="relative shrink-0">Up to 6 residential units permitted</p>
                          </div>
                        </div>
                      </Button>
                      <Button>
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="property-card">
                          <div className="content-stretch flex items-center relative shrink-0" data-name="card-title">
                            <Wrapper3>{`Elevation Range `}</Wrapper3>
                          </div>
                          <HeadingText text="125m" />
                          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] w-[201px]">Above sea level</p>
                        </div>
                        <Helper1 />
                        <div className="content-stretch flex items-start not-italic relative shrink-0 text-[#515d66] w-full whitespace-nowrap" data-name="list-item-badge">
                          <Helper text="Slope" text1="2.5°" />
                          <Helper text="Terrain" text1="Flat" />
                        </div>
                      </Button>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[24px] items-start justify-end relative shrink-0 w-full" data-name="section-title-row">
                    <div className="bg-white flex-[1_0_0] min-h-px min-w-px relative rounded-[12px]" data-name="container">
                      <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <div className="content-stretch flex flex-col gap-[12px] items-start p-[24px] relative w-full">
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="empty-placeholder">
                          <div className="content-stretch flex items-end justify-between relative shrink-0 w-full" data-name="icon-pill">
                            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Comparable Properties in Your Area</p>
                            <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="sidebar-section">
                              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">{`Export Coordinates `}</p>
                              <div className="relative shrink-0 size-[14px]" data-name="lucide/download">
                                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                                  <g id="lucide/download">
                                    <rect fill="white" height="14" width="14" />
                                    <path d={svgPaths.p316cfc80} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" />
                                  </g>
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex items-end relative shrink-0" data-name="body-text">
                            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Properties similar to yours that sold recently</p>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Table">
                          <div className="bg-[#f5f6f7] content-stretch flex h-[56px] items-center relative shrink-0 w-full" data-name="Header">
                            <div aria-hidden="true" className="absolute border-[#e8eaed] border-b border-solid inset-0 pointer-events-none" />
                            <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                              <TextText1 text="CORNER" />
                            </div>
                            <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                              <TextText1 text="LATITUDE" />
                            </div>
                            <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                              <TextText1 text="LONGTITUDE" />
                            </div>
                            <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[145px]" data-name="Table header">
                              <TextText1 text="BEARING" />
                            </div>
                          </div>
                          <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                            <div aria-hidden="true" className="absolute border-[#e8eaed] border-b border-solid inset-0 pointer-events-none" />
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                              <TextText2 text="Northeast" />
                            </div>
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                              <TextText3 text="11.5564°N" />
                            </div>
                            <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                              <TextText4 text="104.9282°E" />
                            </div>
                            <TableHeaderText text="45°" />
                          </div>
                          <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                            <div aria-hidden="true" className="absolute border-[#e8eaed] border-b border-solid inset-0 pointer-events-none" />
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                              <TextText2 text="Northeast" />
                            </div>
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                              <TextText3 text="11.5564°N" />
                            </div>
                            <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                              <TextText4 text="104.9282°E" />
                            </div>
                            <TableHeaderText text="45°" />
                          </div>
                          <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                            <div aria-hidden="true" className="absolute border-[#e8eaed] border-b border-solid inset-0 pointer-events-none" />
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                              <TextText2 text="Northeast" />
                            </div>
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                              <TextText3 text="11.5564°N" />
                            </div>
                            <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                              <TextText4 text="104.9282°E" />
                            </div>
                            <TableHeaderText text="45°" />
                          </div>
                          <div className="content-stretch flex h-[68px] items-center relative shrink-0 w-full" data-name="Row">
                            <div aria-hidden="true" className="absolute border-[#e8eaed] border-b border-solid inset-0 pointer-events-none" />
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[240px]" data-name="Table header">
                              <TextText2 text="Northeast" />
                            </div>
                            <div className="content-stretch flex flex-col items-start justify-center px-[8px] relative shrink-0 w-[133px]" data-name="Table header">
                              <TextText3 text="11.5564°N" />
                            </div>
                            <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[152px]" data-name="Table header">
                              <Wrapper2>{` 104.9282°E`}</Wrapper2>
                            </div>
                            <TableHeaderText text="45°" />
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
                    <div className="bg-white relative rounded-[12px] self-stretch shrink-0 w-[349.333px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
                        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Investment Metrics</p>
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="property-card">
                          <div className="content-stretch flex items-center relative shrink-0" data-name="card-title">
                            <CardTitleText text="Price per m²" />
                          </div>
                          <HeadingText text="$245" />
                          <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="card-body">
                            <div className="bg-[#ecfdf5] content-stretch flex gap-[4px] h-[24px] items-center justify-center px-[12px] py-[4px] relative rounded-[9999px] shrink-0" data-name="Container">
                              <div className="h-[16px] relative shrink-0 w-[17px]" data-name="lucide/arrow-up">
                                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 16">
                                  <g id="lucide/arrow-up">
                                    <rect fill="white" height="16" width="17" />
                                    <path d={svgPaths.p65e213e} id="Vector" stroke="var(--stroke-0, #059669)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                  </g>
                                </svg>
                              </div>
                              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#065f46] text-[14px] whitespace-nowrap">+12%</p>
                            </div>
                            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] w-[201px]">vs. avg area price</p>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="card-header">
                          <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="chart-legend">
                            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="chart-donut">
                              <div className="content-stretch flex items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap" data-name="badge">
                                <CardRow text="2,380 m² nearby" text1="0.3 km away • 2 months ago" />
                                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] relative shrink-0 text-[#14181b] text-[16px]">$238/m²</p>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="chart-center">
                            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="chart-donut">
                              <div className="content-stretch flex items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap" data-name="badge">
                                <CardRow text="2,650 m² nearby" text1="0.5 km away • 4 months ago" />
                                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] relative shrink-0 text-[#14181b] text-[16px]">$252/m²</p>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="chart-ring">
                            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="chart-donut">
                              <div className="content-stretch flex items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap" data-name="badge">
                                <CardRow text="2,100 m² nearby" text1="0.8 km away • 5 months ago" />
                                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] relative shrink-0 text-[#14181b] text-[16px]">$229/m²</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#2563eb] text-[14px] w-[201px]">View all comparables →</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute h-[357px] left-[calc(25%+54px)] top-[355px] w-[464px]" data-name="map-badge">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-center justify-center overflow-clip relative rounded-[inherit] size-full">
              <LucideBox />
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[32px] not-italic relative shrink-0 text-[#515d66] text-[24px] tracking-[-0.144px] whitespace-nowrap">3D Aerial View</p>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Interactive terrain scan - Full immersive mode</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}