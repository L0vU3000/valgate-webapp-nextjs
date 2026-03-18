import clsx from "clsx";
import svgPaths from "./svg-vm98xpmgwf";

function Button({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white relative rounded-[12px] self-stretch shrink-0 w-[510px]">
      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex gap-[40px] items-start p-[24px] relative size-full">{children}</div>
    </div>
  );
}

function Container1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full">
      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative w-full">{children}</div>
    </div>
  );
}

function Type1Helper({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="absolute inset-[-5.65%]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 128 128">
        {children}
      </svg>
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

function Wrapper8({ children }: React.PropsWithChildren<{}>) {
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
type Wrapper7Props = {
  additionalClassNames?: string;
};

function Wrapper7({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper7Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">{children}</div>
    </div>
  );
}

function Wrapper6({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">{children}</p>
    </div>
  );
}

function Wrapper5({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
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
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative">{children}</div>
    </div>
  );
}

function ListItem1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper3>
      <div className="content-stretch flex h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0" data-name="Button">
        {children}
      </div>
    </Wrapper3>
  );
}

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper3>
      <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
        {children}
      </div>
    </Wrapper3>
  );
}
type Icon3Props = {
  additionalClassNames?: string;
};

function Icon3({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon3Props>) {
  return (
    <Wrapper4 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper4>
  );
}

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}

function Container({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-[#ecfdf5] h-[24px] relative rounded-[33554400px] shrink-0">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[4px] h-full items-center justify-center px-[12px] py-[4px] relative">{children}</div>
      </div>
    </div>
  );
}
type Wrapper1Props = {
  additionalClassNames?: string;
};

function Wrapper1({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper1Props>) {
  return (
    <div className={clsx("flex-[1_0_0] min-h-px min-w-px relative", additionalClassNames)}>
      <div className="flex flex-col items-end justify-center size-full">
        <div className="content-stretch flex flex-col items-end justify-center px-[8px] relative size-full">{children}</div>
      </div>
    </div>
  );
}

function Icon2({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper5>
      <g id="Icon">{children}</g>
    </Wrapper5>
  );
}

function Wrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative self-stretch shrink-0">
      <div className="content-stretch flex flex-col h-full items-start py-[8px] relative">
        <div className="relative shrink-0 size-[10px]">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 10">
            {children}
          </svg>
        </div>
      </div>
    </div>
  );
}
type Text4Props = {
  text: string;
};

function Text4({ text, children }: React.PropsWithChildren<Text4Props>) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center py-[4px] relative size-full">
      <Icon2>{children}</Icon2>
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
type BodyTextText1Props = {
  text: string;
};

function BodyTextText1({ text }: BodyTextText1Props) {
  return (
    <div className="content-stretch flex items-end relative shrink-0">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[14px] w-[201px]">{text}</p>
    </div>
  );
}
type HeadingText1Props = {
  text: string;
};

function HeadingText1({ text }: HeadingText1Props) {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}

function Tag() {
  return (
    <Wrapper>
      <circle cx="5" cy="5" fill="var(--fill-0, #059669)" id="Ellipse 52" r="5" />
    </Wrapper>
  );
}

function TableHeader() {
  return (
    <Wrapper1 additionalClassNames="h-[37px]">
      <div className="content-stretch flex items-center justify-end relative shrink-0 w-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">{"View report"}</p>
      </div>
    </Wrapper1>
  );
}
type TableHeaderTextProps = {
  text: string;
};

function TableHeaderText({ text }: TableHeaderTextProps) {
  return (
    <div className="content-stretch flex h-[37px] items-center px-[8px] relative shrink-0 w-[249px]">
      <Container>
        <p className="font-['Inter:Bold',sans-serif] font-bold leading-[20px] not-italic relative shrink-0 text-[#065f46] text-[12px] whitespace-nowrap">{text}</p>
      </Container>
    </div>
  );
}
type TextText1Props = {
  text: string;
};

function TextText1({ text }: TextText1Props) {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextTextProps = {
  text: string;
};

function TextText({ text }: TextTextProps) {
  return <Wrapper6>{text}</Wrapper6>;
}
type InputWithButtonText2Props = {
  text: string;
};

function InputWithButtonText2({ text }: InputWithButtonText2Props) {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-between min-h-px min-w-px relative">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">{text}</p>
      <StatusBadgeText text="Fire Dept. District 3" />
    </div>
  );
}
type InputWithButtonText1Props = {
  text: string;
};

function InputWithButtonText1({ text }: InputWithButtonText1Props) {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-between min-h-px min-w-px relative">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">{text}</p>
      <StatusBadgeText text="Apr 29, 2026" />
    </div>
  );
}
type InputWithButtonTextProps = {
  text: string;
};

function InputWithButtonText({ text }: InputWithButtonTextProps) {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-between min-h-px min-w-px relative">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">{text}</p>
      <StatusBadgeText text="Apr 29, 2025" />
    </div>
  );
}
type StatusBadgeTextProps = {
  text: string;
};

function StatusBadgeText({ text }: StatusBadgeTextProps) {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type CardMetaTextProps = {
  text: string;
};

function CardMetaText({ text }: CardMetaTextProps) {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">{text}</p>
      <div className="bg-[#ecfdf5] content-stretch flex gap-[4px] h-[24px] items-center justify-center px-[12px] py-[4px] relative rounded-[9999px] shrink-0">
        <Icon1 />
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#065f46] text-[16px] whitespace-nowrap">{"Valid"}</p>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="h-[12px] relative shrink-0 w-[15px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 12">
        <g id="Icon">
          <path d="M13.5 2L5.25 10L1.5 6.36364" id="Vector" stroke="var(--stroke-0, #059669)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
type HelperProps = {
  text: string;
  text1: string;
};

function Helper({ text, text1 }: HelperProps) {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">{text}</p>
      <div className="bg-white relative rounded-[6px] shrink-0" data-name="button">
        <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[6px]" />
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex items-center justify-center px-[16px] py-[8px] relative">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text1}</p>
          </div>
        </div>
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

function Icon() {
  return (
    <div className="relative shrink-0 size-[48px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d={svgPaths.p9dab600} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
}
type BodyTextTextProps = {
  text: string;
};

function BodyTextText({ text }: BodyTextTextProps) {
  return (
    <div className="content-stretch flex items-end relative shrink-0">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] w-[201px]">{text}</p>
    </div>
  );
}
type Text3Props = {
  text: string;
  additionalClassNames?: string;
};

function Text3({ text, additionalClassNames = "" }: Text3Props) {
  return (
    <div className={clsx("content-stretch flex relative shrink-0", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
}

function SidebarIcon5() {
  return (
    <Wrapper2>
      <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper2>
  );
}

function SidebarIcon4() {
  return (
    <Wrapper2>
      <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper2>
  );
}

function SidebarIcon3() {
  return (
    <Wrapper2>
      <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper2>
  );
}

function SidebarIcon2() {
  return (
    <Wrapper2>
      <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper2>
  );
}

function SidebarIcon1() {
  return (
    <Wrapper2>
      <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper2>
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
    <Wrapper2>
      <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper2>
  );
}
type Text2Props = {
  text: string;
};

function Text2({ text }: Text2Props) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text }: Text1Props) {
  return (
    <div className="bg-[#2563eb] flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[9999px]">
      <Text2 text={text} />
    </div>
  );
}
type SidebarTextProps = {
  text: string;
};

function SidebarText({ text }: SidebarTextProps) {
  return (
    <div className="bg-[#2563eb] relative rounded-[8px] shrink-0 size-[32px]">
      <Text2 text={text} />
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
type TextProps = {
  text: string;
};

function Text({ text }: TextProps) {
  return (
    <div className="content-stretch flex items-start relative shrink-0">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">{text}</p>
    </div>
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
              <Wrapper7 additionalClassNames="h-[20px] w-[85.438px]">
                <Wrapper2>
                  <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </Wrapper2>
                <HeaderPropertyText3>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[14px] text-center whitespace-nowrap">Property</p>
                </HeaderPropertyText3>
              </Wrapper7>
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
          <Wrapper7 additionalClassNames="h-[36px] w-[443.172px]">
            <div className={`bg-[#ecfdf5] relative rounded-[8px] shrink-0 ${isSafty ? "h-[36px]" : "h-[32px]"}`} data-name="Container">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] relative">
                <Wrapper8>
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#065f46] text-[14px] w-[116px]">28% health score</p>
                </Wrapper8>
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
                <Icon2>
                  <path d={svgPaths.p185fb780} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d={svgPaths.p30ca5e80} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d={svgPaths.pac25b80} id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d="M5.7267 9.00667L10.28 11.66" id="Vector_4" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d="M10.2734 4.34L5.7267 6.99333" id="Vector_5" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                </Icon2>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">Share</p>
              </div>
            </div>
            <div className="bg-[#2563eb] h-[36px] relative rounded-[8px] shrink-0" data-name="Button">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[12px] py-[2px] relative">
                <Icon2>
                  <path d={svgPaths.p1bd16b80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                </Icon2>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] not-italic relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">Get directions</p>
              </div>
            </div>
            <div className="relative rounded-[8px] shrink-0 size-[36px]" data-name="Button">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                <Icon3 additionalClassNames="relative shrink-0">
                  <path d={svgPaths.p3f4e600} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p2aca4e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d={svgPaths.p10b1cef0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </Icon3>
              </div>
            </div>
          </Wrapper7>
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
                      <Icon2>
                        <path d={svgPaths.p14548f00} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        <path d={svgPaths.p17781bc0} id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      </Icon2>
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
                  <Wrapper8>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                  </Wrapper8>
                </div>
              </div>
              <div className="relative shrink-0" data-name="User Container">
                <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center px-[24px] py-[12px] relative">
                  <div className="content-stretch flex items-start overflow-clip relative rounded-[9999px] shrink-0 size-[40px]" data-name="User Pic Container">
                    <Text1 text="JD" />
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
                      <Icon3 additionalClassNames="relative shrink-0">
                        <path d={svgPaths.p137c7200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p254f3200} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon3>
                    </div>
                    <div className="absolute left-[44px] rounded-[8px] size-[36px] top-0" data-name="Button">
                      <Icon3 additionalClassNames="absolute left-[9px] top-[9px]">
                        <path d={svgPaths.p985d280} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p2ac55e70} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon3>
                      <div className="absolute bg-[#e11d48] left-[24px] rounded-[9999px] size-[8px] top-[4px]" data-name="Text" />
                    </div>
                    <div className="absolute left-[88px] rounded-[8px] size-[36px] top-0" data-name="Button">
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
                      <div className="absolute bg-[#059669] left-[24px] rounded-[9999px] size-[8px] top-[24px]" data-name="Text" />
                    </div>
                  </div>
                  <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="Container">
                    <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
                    <div className="content-stretch flex flex-col gap-[8px] items-start p-[12px] relative w-full">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                        <Wrapper5>
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
                        </Wrapper5>
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
                <Text1 text="JD" />
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

export default function PropertySafetyPage() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Property Safety Page">
      <Sidebar className="bg-white relative rounded-[8px] self-stretch shrink-0 w-[280px]" />
      <div className="bg-[#f5f6f7] relative shrink-0 w-[1160px]" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
          <HeaderProperty className="bg-white h-[121px] relative shrink-0 w-full" property1="Safty" />
          <div className="bg-[#f5f6f7] relative shrink-0 w-full" data-name="page-content">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[48px] items-start pb-[32px] pt-[48px] px-[32px] relative w-full">
              <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="search-bar">
                <p className="flex-[1_0_0] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[0] min-h-px min-w-px not-italic relative text-[#14181b] text-[0px] text-[48px] tracking-[-0.576px]">
                  <span className="font-['Inter:Regular',sans-serif] font-normal leading-[48px]">Safety for</span>
                  <span className="leading-[48px]">{` SR00015`}</span>
                </p>
              </div>
              <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="tooltip-card">
                <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-name="kpi-card">
                  <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="trend-badge">
                    <div className="bg-white content-stretch flex flex-col gap-[24px] items-center justify-center p-[24px] relative rounded-[12px] shrink-0 size-[256px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="Type 1">
                        <div className="col-1 flex items-center justify-center ml-0 mt-0 relative row-1 size-[115px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "18" } as React.CSSProperties}>
                          <div className="flex-none rotate-90">
                            <div className="relative size-[115px]" data-name="Background">
                              <Type1Helper>
                                <path d={svgPaths.p19887e00} id="Background" stroke="var(--stroke-0, #A7F3D0)" strokeWidth="13" />
                              </Type1Helper>
                            </div>
                          </div>
                        </div>
                        <div className="col-1 ml-0 mt-0 relative row-1 size-[115px]" data-name="Front">
                          <Type1Helper>
                            <path d={svgPaths.pd7e8500} id="Front" stroke="var(--stroke-0, #059669)" strokeLinecap="round" strokeWidth="13" />
                          </Type1Helper>
                        </div>
                        <p className="col-1 font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] ml-[14px] mt-[40px] not-italic relative row-1 text-[#065f46] text-[30px] tracking-[-0.225px] whitespace-nowrap">78.6%</p>
                      </div>
                      <div className="content-stretch flex items-start relative shrink-0" data-name="body-text">
                        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">All certifications current</p>
                      </div>
                    </div>
                    <div className="bg-white content-stretch flex flex-col items-start justify-between p-[24px] relative rounded-[12px] shrink-0 size-[256px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                        <div className="bg-[#ecfdf5] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                          <div className="h-[39px] relative shrink-0 w-[50px]" data-name="Icon">
                            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 50 39">
                              <g id="Icon">
                                <path d="M42 8L18.625 31L8 20.5455" id="Vector" stroke="var(--stroke-0, #059669)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                        <Text3 text="Compliance Status" additionalClassNames="items-center" />
                        <div className="content-stretch flex items-center relative shrink-0" data-name="Heading 4">
                          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] not-italic relative shrink-0 text-[#065f46] text-[30px] tracking-[-0.225px] whitespace-nowrap">Compliant</p>
                        </div>
                        <BodyTextText text="All certifications current" />
                      </div>
                    </div>
                    <div className="bg-white content-stretch flex flex-col items-start justify-between p-[24px] relative rounded-[12px] shrink-0 size-[256px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                        <div className="bg-[#fffbeb] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                          <Icon />
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                        <Text3 text="Next Inspection" additionalClassNames="items-center" />
                        <HeadingText text="18 days" />
                        <BodyTextText text="Fire safety - Apr 29, 2026" />
                      </div>
                    </div>
                    <div className="bg-white content-stretch flex flex-col items-start justify-between p-[24px] relative rounded-[12px] shrink-0 size-[256px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                      <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                        <div className="bg-[#dbeafe] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                          <div className="h-[48px] relative shrink-0 w-[44px]" data-name="Icon">
                            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 48">
                              <g id="Icon">
                                <path d={svgPaths.p1dcf2f90} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                        <Text3 text="Open Issues" additionalClassNames="items-center" />
                        <HeadingText text="2" />
                        <BodyTextText text="1 low priority, 1 medium" />
                      </div>
                    </div>
                  </div>
                </div>
                <Container1>
                  <Helper text="Safety Certifications" text1="Add Certificate" />
                  <div className="h-[363px] relative shrink-0 w-[1044px]" data-name="results-count">
                    <div className="absolute content-stretch flex gap-[24px] items-start left-0 top-0 w-[1044px]" data-name="card-image">
                      <div className="bg-white content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-[332px]" data-name="container">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <CardMetaText text="Fire Safty Certficate" />
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="card-stats">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText text="Issued:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-cell">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText1 text="Expires:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-label">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText2 text="Inspector:" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-[332px]" data-name="container">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <CardMetaText text="Electrical Safety" />
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="card-stats">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText text="Issued:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-cell">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText1 text="Expires:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-label">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText2 text="Inspector:" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-[332px]" data-name="container">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="card-meta">
                          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">Gas Safety</p>
                          <div className="bg-[#fffbeb] content-stretch flex gap-[4px] h-[24px] items-center justify-center px-[12px] py-[4px] relative rounded-[9999px] shrink-0" data-name="Container">
                            <div className="relative shrink-0 size-[14px]" data-name="lucide/circle-alert">
                              <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                                <g clipPath="url(#clip0_1_29309)" id="lucide/circle-alert">
                                  <path d={svgPaths.pb6be580} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                                </g>
                                <defs>
                                  <clipPath id="clip0_1_29309">
                                    <rect fill="white" height="14" width="14" />
                                  </clipPath>
                                </defs>
                              </svg>
                            </div>
                            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#f59e0b] text-[14px] whitespace-nowrap">Expires Soon</p>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="card-stats">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText text="Issued:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-cell">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText1 text="Expires:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-label">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText2 text="Inspector:" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute content-stretch flex gap-[24px] items-start left-0 top-[184px] w-[1044px]" data-name="card-meta">
                      <div className="bg-white content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-[332px]" data-name="container">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <CardMetaText text="Structural Integrity" />
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="card-stats">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText text="Issued:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-cell">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText1 text="Expires:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-label">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText2 text="Inspector:" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-[332px]" data-name="container">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="card-meta">
                          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">Asbestos Survey</p>
                          <Container>
                            <Icon1 />
                            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#065f46] text-[14px] whitespace-nowrap">Valid</p>
                          </Container>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="card-stats">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText text="Issued:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-cell">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText1 text="Expires:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-label">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText2 text="Inspector:" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-[332px]" data-name="container">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <CardMetaText text="EICR Certificate" />
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="card-stats">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText text="Issued:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-cell">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText1 text="Expires:" />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="stat-label">
                          <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="summary-row">
                            <InputWithButtonText2 text="Inspector:" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Container1>
                <Container1>
                  <Helper text="Inspection History" text1="Schedule Inspection" />
                  <div className="content-stretch flex flex-col items-start relative rounded-[6px] shrink-0 w-full" data-name="Table">
                    <div className="bg-[#f5f6f7] content-stretch flex h-[56px] items-center relative shrink-0 w-full" data-name="Header">
                      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                      <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[134px]" data-name="Table header">
                        <TextText text="Date" />
                      </div>
                      <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[169px]" data-name="Table header">
                        <TextText text="Type" />
                      </div>
                      <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[249px]" data-name="Table header">
                        <TextText text="Inspector" />
                      </div>
                      <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[249px]" data-name="Table header">
                        <TextText text="Status" />
                      </div>
                      <div className="content-stretch flex flex-col h-[40px] items-start justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                        <Wrapper6>{`Issue Found `}</Wrapper6>
                      </div>
                      <Wrapper1 additionalClassNames="h-[40px]">
                        <div className="content-stretch flex items-center justify-end relative shrink-0 w-full" data-name="Text">
                          <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[24px] min-h-px min-w-px not-italic overflow-hidden relative text-[#14181b] text-[14px] text-ellipsis text-right whitespace-nowrap">Report</p>
                        </div>
                      </Wrapper1>
                    </div>
                    <div className="content-stretch flex h-[56px] items-center relative shrink-0 w-full" data-name="Row">
                      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[134px]" data-name="Table header">
                        <TextText1 text="Apr 29, 2025" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[169px]" data-name="Table header">
                        <TextText1 text="Fire Safety" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[249px]" data-name="Table header">
                        <TextText1 text="Fire Dept. District 3" />
                      </div>
                      <TableHeaderText text="Passed" />
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                        <TextText1 text="0" />
                      </div>
                      <TableHeader />
                    </div>
                    <div className="content-stretch flex h-[56px] items-center relative shrink-0 w-full" data-name="Row">
                      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[134px]" data-name="Table header">
                        <TextText1 text="Apr 29, 2025" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[169px]" data-name="Table header">
                        <TextText1 text="Fire Safety" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[249px]" data-name="Table header">
                        <TextText1 text="Fire Dept. District 3" />
                      </div>
                      <TableHeaderText text="Satisfactory" />
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                        <TextText1 text="0" />
                      </div>
                      <TableHeader />
                    </div>
                    <div className="content-stretch flex h-[56px] items-center relative shrink-0 w-full" data-name="Row">
                      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[134px]" data-name="Table header">
                        <TextText1 text="Apr 29, 2025" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[169px]" data-name="Table header">
                        <TextText1 text="Fire Safety" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[249px]" data-name="Table header">
                        <TextText1 text="Fire Dept. District 3" />
                      </div>
                      <TableHeaderText text="Clear" />
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                        <TextText1 text="0" />
                      </div>
                      <TableHeader />
                    </div>
                    <div className="content-stretch flex h-[56px] items-center relative shrink-0 w-full" data-name="Row">
                      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[134px]" data-name="Table header">
                        <TextText1 text="Apr 29, 2025" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[169px]" data-name="Table header">
                        <TextText1 text="Fire Safety" />
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[249px]" data-name="Table header">
                        <TextText1 text="Fire Dept. District 3" />
                      </div>
                      <div className="content-stretch flex h-[37px] items-center px-[8px] relative shrink-0 w-[249px]" data-name="Table header">
                        <div className="bg-[#fffbeb] content-stretch flex h-[24px] items-center justify-center px-[12px] py-[4px] relative rounded-[9999px] shrink-0" data-name="Container">
                          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#f59e0b] text-[14px] whitespace-nowrap">Minor Issue</p>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col h-[37px] items-start justify-center px-[8px] relative shrink-0 w-[127px]" data-name="Table header">
                        <TextText1 text="2" />
                      </div>
                      <TableHeader />
                    </div>
                  </div>
                </Container1>
                <Container1>
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] tracking-[-0.1px] whitespace-nowrap">Risk Assessment</p>
                  <div className="h-[300px] relative shrink-0 w-[1044px]" data-name="view-toggle">
                    <div className="absolute bg-[#f5f6f7] content-stretch flex gap-[16px] items-start left-0 p-[16px] rounded-[12px] top-0 w-[1044px]" data-name="container">
                      <Tag />
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="tag-label">
                        <Text text="Minor Cosmetic Damage" />
                        <Text3 text="Small crack in exterior wall - monitored, no structural concern. Scheduled for cosmetic repair Q3 2026." additionalClassNames="items-start" />
                      </div>
                    </div>
                    <div className="absolute bg-[#f5f6f7] content-stretch flex gap-[16px] items-start left-0 p-[16px] rounded-[12px] top-[104px] w-[1044px]" data-name="container">
                      <Wrapper>
                        <circle cx="5" cy="5" fill="var(--fill-0, #F59E0B)" id="Ellipse 52" r="5" />
                      </Wrapper>
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="tag-label">
                        <Text text="Drainage System Maintenance" />
                        <div className="content-stretch flex items-start relative shrink-0" data-name="card-stats">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#515d66] text-[16px] w-[983px]">Annual drainage inspection due May 2026. Property in flood zone 2 - recommend maintaining comprehensive insurance coverage.</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute bg-[#f5f6f7] content-stretch flex gap-[16px] items-start left-0 p-[16px] rounded-[12px] top-[208px] w-[1044px]" data-name="container">
                      <Tag />
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="tag-label">
                        <Text text="Tree Maintenance" />
                        <Text3 text="Large oak tree near property boundary. Recommend annual arborist inspection to prevent potential subsidence issues." additionalClassNames="items-start" />
                      </div>
                    </div>
                  </div>
                </Container1>
                <Container1>
                  <Helper text="Emergency Contacts" text1="Edit Contacts" />
                  <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="map-panel">
                    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="sort-select">
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#fffbeb] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                          <Text text="Fire Department" />
                          <HeadingText1 text="+1 (555) 911-0001" />
                          <BodyTextText1 text="District 3 Fire Station" />
                        </div>
                      </Button>
                      <div className="bg-white content-stretch flex gap-[40px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[510px]" data-name="Button">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#fffbeb] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                          <Text text="Emergency Electrician" />
                          <HeadingText1 text="+1 (555) 911-0001" />
                          <BodyTextText1 text="SafeWire 24/7 Service" />
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="results-count">
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#fffbeb] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                          <Text text="Emergency Plumber" />
                          <HeadingText1 text="+1 (555) 911-0001" />
                          <BodyTextText1 text="QuickFix Plumbing" />
                        </div>
                      </Button>
                      <div className="bg-white content-stretch flex gap-[40px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[510px]" data-name="Button">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#fffbeb] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                          <Text text="Gas Emergency" />
                          <HeadingText1 text="+1 (555) 911-0001" />
                          <BodyTextText1 text="Gas Safe Emergency Line" />
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="pagination">
                      <Button>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#fffbeb] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                          <Text text="Property Insurance" />
                          <HeadingText1 text="+1 (555) 911-0001" />
                          <BodyTextText1 text="Guardian Property Insurance" />
                        </div>
                      </Button>
                      <div className="bg-white content-stretch flex gap-[40px] items-start p-[24px] relative rounded-[12px] shrink-0 w-[510px]" data-name="Button">
                        <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                          <div className="bg-[#fffbeb] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Container">
                            <Icon />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="property-card">
                          <Text text="Structural Engineer" />
                          <HeadingText1 text="+1 (555) 911-0001" />
                          <BodyTextText1 text="BuildRight Engineers" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Container1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}