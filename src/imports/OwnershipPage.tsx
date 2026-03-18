import clsx from "clsx";
import svgPaths from "./svg-xzm4k0icjq";

function ListItem2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex h-full items-start relative">{children}</div>
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
    <div className="flex flex-row items-center justify-center size-full">
      <div className="content-stretch flex items-center justify-center px-[16px] py-[8px] relative">{children}</div>
    </div>
  );
}
type Wrapper6Props = {
  additionalClassNames?: string;
};

function Wrapper6({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper6Props>) {
  return (
    <div className={clsx("content-stretch flex flex-col items-start justify-center pb-[16px] pt-[32px] relative size-full", additionalClassNames)}>
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[25px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">{children}</p>
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

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-row items-center size-full">
      <div className="content-stretch flex items-center justify-between px-[40px] py-[16px] relative w-full">{children}</div>
    </div>
  );
}

function Doc({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 w-full">
      <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
      <Wrapper2>{children}</Wrapper2>
    </div>
  );
}

function RadioGrpRadio({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center relative">{children}</div>
      </div>
    </div>
  );
}
type CardContentProps = {
  additionalClassNames?: string;
};

function CardContent({ children, additionalClassNames = "" }: React.PropsWithChildren<CardContentProps>) {
  return (
    <div className={clsx("relative shrink-0 w-full", additionalClassNames)}>
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-start justify-center p-[32px] relative w-full">{children}</div>
      </div>
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
type Icon1Props = {
  additionalClassNames?: string;
};

function Icon1({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon1Props>) {
  return (
    <Wrapper4 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper4>
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

function Icon({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper5>
      <g id="Icon">{children}</g>
    </Wrapper5>
  );
}
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return (
    <div className={clsx("h-[68px] relative shrink-0 w-full", additionalClassNames)}>
      <div className="flex flex-col justify-center size-full">
        <Wrapper6 additionalClassNames="px-[32px]">{children}</Wrapper6>
      </div>
    </div>
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
type ActProps = {
  text: string;
  text1: string;
  text2: string;
};

function Act({ text, text1, text2 }: ActProps) {
  return (
    <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full">
      <p className="leading-[21px] relative shrink-0 text-[#6b7684] text-[14px] w-[100px]">{text}</p>
      <p className="leading-[29px] relative shrink-0 text-[18px] text-[transparent] whitespace-nowrap">{text1}</p>
      <p className="leading-[21px] relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text2}</p>
    </div>
  );
}
type DocNameProps = {
  text: string;
  text1: string;
};

function DocName({ text, text1 }: DocNameProps) {
  return (
    <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-center not-italic relative shrink-0 text-[#14181b] w-[220px] whitespace-nowrap">
      <p className="leading-[29px] relative shrink-0 text-[18px]">{text}</p>
      <p className="leading-[21px] relative shrink-0 text-[14px]">{text1}</p>
    </div>
  );
}
type ExpRowProps = {
  text: string;
  text1: string;
};

function ExpRow({ text, text1 }: ExpRowProps) {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
      <p className="relative shrink-0 text-[#14181b]">{text}</p>
      <p className="relative shrink-0 text-[#6b7684]">{text1}</p>
    </div>
  );
}
type ButtonText1Props = {
  text: string;
};

function ButtonText1({ text }: ButtonText1Props) {
  return (
    <div className="bg-[#2563eb] relative rounded-[6px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0">
      <Wrapper7>
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">{text}</p>
      </Wrapper7>
    </div>
  );
}
type TaxRowTextProps = {
  text: string;
};

function TaxRowText({ text }: TaxRowTextProps) {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
      <p className="relative shrink-0 text-[#6b7684]">{text}</p>
      <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
        <p className="relative shrink-0 text-[#059669]">{"✅"}</p>
        <p className="relative shrink-0 text-[#14181b]">{"On file (2024)"}</p>
      </div>
    </div>
  );
}
type ContactProps = {
  text: string;
  text1: string;
};

function Contact({ text, text1 }: ContactProps) {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <p className="leading-[24px] relative shrink-0 text-[#6b7684] text-[16px]">{text}</p>
      <p className="leading-[21px] relative shrink-0 text-[#14181b] text-[14px]">{text1}</p>
    </div>
  );
}
type Helper1Props = {
  text: string;
  text1: string;
};

function Helper1({ text, text1 }: Helper1Props) {
  return (
    <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-start justify-between leading-[21px] not-italic relative shrink-0 text-[14px] w-full whitespace-nowrap">
      <p className="relative shrink-0 text-[#6b7684]">{text}</p>
      <p className="relative shrink-0 text-[#14181b]">{text1}</p>
    </div>
  );
}
type BadgeTextProps = {
  text: string;
  additionalClassNames?: string;
};

function BadgeText({ text, additionalClassNames = "" }: BadgeTextProps) {
  return (
    <div className={clsx("relative rounded-[9999px] shrink-0", additionalClassNames)}>
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[8px] py-[4px] relative">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[13px] not-italic relative shrink-0 text-[12px] text-white tracking-[0.024px] whitespace-nowrap">{text}</p>
        </div>
      </div>
    </div>
  );
}
type OwnerLeftProps = {
  text: string;
  text1: string;
};

function OwnerLeft({ text, text1 }: OwnerLeftProps) {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
      <div className="bg-[#f5f3ff] relative rounded-[9999px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[48px]" data-name="Avatar">
        <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[22px] left-[12px] not-italic text-[#8b5cf6] text-[16px] top-[14px] whitespace-nowrap">{text}</p>
      </div>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[29px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">{text1}</p>
    </div>
  );
}
type ButtonTextProps = {
  text: string;
};

function ButtonText({ text }: ButtonTextProps) {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0">
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <Wrapper7>
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
      </Wrapper7>
    </div>
  );
}
type CardHeaderTextProps = {
  text: string;
};

function CardHeaderText({ text }: CardHeaderTextProps) {
  return <Wrapper>{text}</Wrapper>;
}
type HelperProps = {
  text: string;
  text1: string;
};

function Helper({ text, text1 }: HelperProps) {
  return (
    <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0">
      <p className="leading-[18px] relative shrink-0 text-[#6b7684] text-[12px]">{text}</p>
      <p className="leading-[24px] relative shrink-0 text-[#14181b] text-[16px]">{text1}</p>
    </div>
  );
}
type CardHeaderProps = {
  text: string;
  text1: string;
  text2: string;
};

function CardHeader({ text, text1, text2 }: CardHeaderProps) {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col gap-[4px] items-start justify-center not-italic p-[24px] relative w-full whitespace-nowrap">
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#6b7684] text-[12px]">{text}</p>
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] relative shrink-0 text-[#14181b] text-[20px]">{text1}</p>
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#6b7684] text-[12px]">{text2}</p>
        </div>
      </div>
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
    <Text2 text={text} additionalClassNames={additionalClassNames}>
      <path d={svgPaths.p277d2000} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M10 3.84267V13.8427" id="Vector_2" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M6 2.15733V12.1573" id="Vector_3" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </Text2>
  );
}
type SeparatorProps = {
  className?: string;
  orientation?: "Horizontal" | "Vertical";
};

function Separator({ className, orientation = "Horizontal" }: SeparatorProps) {
  return <div className={className || `bg-[#d1d5db] ${orientation === "Vertical" ? "h-[80px] w-px" : "h-px w-[200px]"}`} />;
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
                <Wrapper1>
                  <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </Wrapper1>
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
                  <Wrapper9>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                  </Wrapper9>
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

export default function OwnershipPage() {
  return (
    <div className="bg-[#f5f6f7] content-stretch flex items-center relative size-full" data-name="Ownership Page">
      <div className="flex flex-row items-center self-stretch">
        <Sidebar className="bg-white h-full relative rounded-[8px] shrink-0 w-[280px]" />
      </div>
      <div className="bg-[#f5f6f7] content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="main-content">
        <HeaderProperty className="bg-white h-[121px] relative shrink-0 w-full" property1="Ownership" />
        <div className="bg-[#f5f6f7] content-stretch flex flex-col gap-[24px] items-start p-[32px] relative shrink-0 w-[1160px]" data-name="content">
          <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="snapshotStatsRow">
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[256px]" data-name="stat1OwnershipType">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardHeader text="OWNERSHIP TYPE" text1="Tenancy in Common" text2="Joint ownership" />
            </div>
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[256px]" data-name="stat2TotalOwners">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardHeader text="TOTAL OWNERS" text1="2" text2="co-owners" />
            </div>
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[256px]" data-name="stat3Acquisition">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardHeader text="ACQUISITION PRICE" text1="$485,000" text2="Mar 2021" />
            </div>
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[256px]" data-name="stat4HoldingPeriod">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardHeader text="HOLDING PERIOD" text1="4 yrs 3 mos" text2="Since Mar 2021" />
            </div>
          </div>
          <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="equityRow">
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] self-stretch shrink-0 w-[722.67px]" data-name="equityFinancialCard">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <div className="h-[68px] relative shrink-0 w-full" data-name="Card Header">
                <div className="flex flex-row items-center size-full">
                  <div className="content-stretch flex items-center pb-[16px] pt-[32px] px-[40px] relative size-full">
                    <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[25px] min-h-px min-w-px not-italic relative text-[#14181b] text-[18px]">{`EQUITY & FINANCIAL POSITION`}</p>
                  </div>
                </div>
              </div>
              <div className="flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="Card Content">
                <div className="content-stretch flex flex-col items-start justify-between p-[40px] relative size-full">
                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="quick-settings">
                    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full whitespace-nowrap" data-name="valuesRow">
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="currentValue">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px]">Current Estimated Value</p>
                        <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#14181b] text-[30px]">$612,000</p>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#059669] text-[14px]">▲ +26.2% since purchase</p>
                      </div>
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="mortgageValue">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px]">Remaining Mortgage</p>
                        <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#14181b] text-[30px]">$341,200</p>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px]">Fixed 30yr @ 3.875%</p>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="equityBar">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#6b7684] text-[12px] whitespace-nowrap">Equity Bar</p>
                      <div className="bg-[#e8eaed] h-[12px] relative rounded-[6px] shrink-0 w-full" data-name="barBackground">
                        <div className="absolute bg-[#14181b] h-[12px] left-0 rounded-[6px] top-0 w-[280px]" data-name="barFill" />
                      </div>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">$270,800 (44.2%)</p>
                    </div>
                  </div>
                  <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal gap-[32px] items-start not-italic relative shrink-0 w-full whitespace-nowrap" data-name="bottomStats">
                    <Helper text="LTV Ratio" text1="55.8%" />
                    <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0" data-name="paymentStat">
                      <p className="leading-[18px] relative shrink-0 text-[#6b7684] text-[12px]">{`Monthly P&I`}</p>
                      <p className="leading-[24px] relative shrink-0 text-[#14181b] text-[16px]">$1,612/mo</p>
                    </div>
                    <Helper text="Next Payment Due" text1="Feb 01, 2026" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[349.33px]" data-name="ownershipSplitCard">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardHeaderText text="OWNERSHIP SPLIT" />
              <div className="relative shrink-0 w-full" data-name="Card Content">
                <div className="flex flex-col items-center justify-center size-full">
                  <div className="content-stretch flex flex-col gap-[16px] items-center justify-center p-[32px] relative w-full">
                    <div className="bg-[#f5f6f7] relative rounded-[9999px] shrink-0 size-[180px]" data-name="donutChart">
                      <div aria-hidden="true" className="absolute border-2 border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[9999px]" />
                      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[29px] left-0 not-italic text-[#6b7684] text-[18px] top-0 whitespace-nowrap">60% • 40%</p>
                    </div>
                    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="legend">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="legend1">
                        <div className="bg-[#14181b] rounded-[6px] shrink-0 size-[12px]" data-name="container" />
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">J. Smith 60%</p>
                      </div>
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="legend2">
                        <div className="bg-[#059669] rounded-[6px] shrink-0 size-[12px]" data-name="container" />
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">M. Jones 40%</p>
                      </div>
                    </div>
                    <ButtonText text="Edit Split" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="ownerCardsRow">
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[536px]" data-name="owner1Card">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardContent>
                <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="ownerHeader">
                  <OwnerLeft text="JS" text1="James Smith" />
                  <BadgeText text="Primary Owner" additionalClassNames="bg-[#2563eb]" />
                </div>
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="shareSection">
                  <Helper1 text="Ownership Share" text1="60%" />
                  <div className="bg-[#e8eaed] h-[8px] relative rounded-[8px] shrink-0 w-full" data-name="shareBar1">
                    <div className="absolute bg-[#14181b] h-[8px] left-0 rounded-[4px] top-0 w-[288px]" data-name="container" />
                  </div>
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[22px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Equity Value: $162,480</p>
                </div>
                <Separator className="bg-[#d1d5db] h-px shrink-0 w-[472px]" />
                <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start not-italic relative shrink-0 whitespace-nowrap" data-name="contactSection">
                  <Contact text="mail" text1="james.smith@email.com" />
                  <Contact text="phone" text1="(312) 555-0147" />
                  <Contact text="map-pin" text1="456 Owner Ave, Chicago IL 60601" />
                </div>
                <Separator className="bg-[#d1d5db] h-px shrink-0 w-[472px]" />
                <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start leading-[21px] not-italic relative shrink-0 text-[14px] w-full whitespace-nowrap" data-name="taxSection1">
                  <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="taxRow1">
                    <p className="relative shrink-0 text-[#6b7684]">SSN / EIN</p>
                    <p className="relative shrink-0 text-[#14181b]">***-**-4832</p>
                  </div>
                  <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="taxRow2">
                    <p className="relative shrink-0 text-[#6b7684]">Tax Entity</p>
                    <p className="relative shrink-0 text-[#14181b]">Individual</p>
                  </div>
                  <TaxRowText text="1099 Status" />
                </div>
                <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="btnRow1">
                  <ButtonText text="Edit Owner" />
                  <ButtonText1 text="Save changes" />
                </div>
              </CardContent>
            </div>
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[536px]" data-name="owner2Card">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardContent>
                <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="ownerHeader2">
                  <OwnerLeft text="MJ" text1="Maria Jones" />
                  <BadgeText text="Badge" additionalClassNames="bg-[#059669]" />
                </div>
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="shareSection2">
                  <Helper1 text="Ownership Share" text1="40%" />
                  <div className="bg-[#e8eaed] h-[8px] relative rounded-[4px] shrink-0 w-full" data-name="shareBar2">
                    <div className="absolute bg-[#059669] h-[8px] left-0 rounded-[4px] top-0 w-[192px]" data-name="container" />
                  </div>
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[22px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Equity Value: $108,320</p>
                </div>
                <Separator className="bg-[#d1d5db] h-px shrink-0 w-[472px]" />
                <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start not-italic relative shrink-0 w-full whitespace-nowrap" data-name="contactSection2">
                  <Contact text="mail" text1="m.jones@email.com" />
                  <Contact text="phone" text1="(312) 555-0192" />
                  <Contact text="map-pin" text1="789 Partner St, Chicago IL 60602" />
                </div>
                <Separator className="bg-[#d1d5db] h-px shrink-0 w-[472px]" />
                <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start leading-[21px] not-italic relative shrink-0 text-[14px] w-full whitespace-nowrap" data-name="taxSection2">
                  <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="taxRow4">
                    <p className="relative shrink-0 text-[#6b7684]">SSN / EIN</p>
                    <p className="relative shrink-0 text-[#14181b]">***-**-7710</p>
                  </div>
                  <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="taxRow5">
                    <p className="relative shrink-0 text-[#6b7684]">Tax Entity</p>
                    <p className="relative shrink-0 text-[#14181b]">LLC — Jones Prop Holdings</p>
                  </div>
                  <TaxRowText text="1099 Status" />
                </div>
                <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="btnRow2">
                  <ButtonText text="Edit Owner" />
                  <ButtonText text="View Documents" />
                </div>
              </CardContent>
            </div>
          </div>
          <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="acquisitionRow">
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[629.33px]" data-name="acquisitionDetailsCard">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <CardHeaderText text="Acquisition Details" />
              <div className="relative shrink-0 w-full" data-name="Card Content">
                <div className="flex flex-col justify-center size-full">
                  <div className="content-stretch flex flex-col gap-[12px] items-start justify-center p-[32px] relative w-full">
                    <Helper1 text="Purchase Price" text1="$485,000" />
                    <Helper1 text="Down Payment" text1="$97,000 (20%)" />
                    <Helper1 text="Closing Costs" text1="$9,200" />
                    <div className="content-stretch flex items-start justify-between pt-[12px] relative shrink-0 w-full" data-name="acqRow4">
                      <div aria-hidden="true" className="absolute border-[#d1d5db] border-solid border-t inset-0 pointer-events-none" />
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px] whitespace-nowrap">Total Acquisition</p>
                      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[19px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">$106,200 cash deployed</p>
                    </div>
                    <Separator className="bg-[#d1d5db] h-px shrink-0 w-[565.33px]" />
                    <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[12px] items-start leading-[21px] not-italic relative shrink-0 text-[14px] w-full whitespace-nowrap" data-name="loanInfo">
                      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="loanRow1">
                        <p className="relative shrink-0 text-[#6b7684]">Lender</p>
                        <p className="relative shrink-0 text-[#14181b]">First Midwest Bank</p>
                      </div>
                      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="loanRow2">
                        <p className="relative shrink-0 text-[#6b7684]">Loan Amount</p>
                        <p className="relative shrink-0 text-[#14181b]">$388,000</p>
                      </div>
                      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="loanRow3">
                        <p className="relative shrink-0 text-[#6b7684]">Interest Rate</p>
                        <p className="relative shrink-0 text-[#14181b]">3.875% Fixed</p>
                      </div>
                      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="loanRow4">
                        <p className="relative shrink-0 text-[#6b7684]">Loan Term</p>
                        <p className="relative shrink-0 text-[#14181b]">30 Years</p>
                      </div>
                      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="loanRow5">
                        <p className="relative shrink-0 text-[#6b7684]">Origination Date</p>
                        <p className="relative shrink-0 text-[#14181b]">Mar 15, 2021</p>
                      </div>
                      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="loanRow6">
                        <p className="relative shrink-0 text-[#6b7684]">Maturity Date</p>
                        <p className="relative shrink-0 text-[#14181b]">Mar 15, 2051</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#f5f6f7] content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-[442.67px]" data-name="incomeDistributionCard">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <Wrapper additionalClassNames="bg-white">{`Income & Expense Distribution`}</Wrapper>
              <CardContent additionalClassNames="bg-white">
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="distMethod">
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px] whitespace-nowrap">Distribution Method</p>
                  <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="radioGrp">
                    <RadioGrpRadio>
                      <Wrapper5>
                        <g id="Frame">
                          <rect fill="var(--fill-0, #2563EB)" height="16" rx="8" width="16" />
                          <circle cx="8" cy="8" fill="var(--fill-0, #F5F6F7)" id="Ellipse" r="3" />
                        </g>
                      </Wrapper5>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">Pro-Rata by Share</p>
                    </RadioGrpRadio>
                    <RadioGrpRadio>
                      <div className="bg-[#f5f6f7] relative rounded-[9999px] shrink-0 size-[16px]" data-name="Frame">
                        <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[9999px]" />
                      </div>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">Custom</p>
                    </RadioGrpRadio>
                  </div>
                </div>
                <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start leading-[21px] not-italic relative shrink-0 text-[14px] w-full whitespace-nowrap" data-name="rentSplit">
                  <p className="relative shrink-0 text-[#6b7684]">Rent Income Split</p>
                  <div className="content-stretch flex items-start justify-between relative shrink-0 text-[#14181b] w-full" data-name="rentRow1">
                    <p className="relative shrink-0">J. Smith 60%</p>
                    <p className="relative shrink-0">$1,080/mo</p>
                  </div>
                  <div className="content-stretch flex items-start justify-between relative shrink-0 text-[#14181b] w-full" data-name="rentRow2">
                    <p className="relative shrink-0">M. Jones 40%</p>
                    <p className="relative shrink-0">$720/mo</p>
                  </div>
                </div>
                <Separator className="bg-[#d1d5db] h-px shrink-0 w-[378.67px]" />
                <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start leading-[21px] not-italic relative shrink-0 text-[14px] w-full whitespace-nowrap" data-name="expenseSplit">
                  <p className="relative shrink-0 text-[#6b7684]">Expense Responsibility</p>
                  <ExpRow text="J. Smith 60%" text1="shared costs" />
                  <ExpRow text="M. Jones 40%" text1="shared costs" />
                </div>
                <ButtonText text="Edit Distribution Rules" />
              </CardContent>
            </div>
          </div>
          <div className="bg-white content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="documentsRow">
            <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="ownershipDocsCard">
              <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
                <div className="h-[68px] relative shrink-0 w-full" data-name="Card Header">
                  <div className="flex flex-row items-center size-full">
                    <div className="content-stretch flex items-center justify-between px-[40px] relative size-full">
                      <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[25px] min-h-px min-w-px not-italic relative text-[#14181b] text-[18px]">Ownership Documents</p>
                      <ButtonText1 text="Upload Doc" />
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full" data-name="Card Content">
                  <div className="bg-[#f5f6f7] relative shrink-0 w-full" data-name="tableHeader">
                    <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                    <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal items-start justify-between leading-[18px] not-italic px-[40px] py-[12px] relative text-[#6b7684] text-[12px] w-full">
                      <p className="relative shrink-0 w-[220px]">NAME</p>
                      <p className="relative shrink-0 w-[140px]">TYPE</p>
                      <p className="relative shrink-0 w-[100px]">DATE</p>
                      <p className="relative shrink-0 w-[120px]">OWNER</p>
                      <p className="relative shrink-0 w-[100px]">STATUS</p>
                    </div>
                  </div>
                  <Doc>
                    <DocName text="file-text" text1="Property Deed" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[140px]">Title Document</p>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[100px]">Mar 2021</p>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[120px]">Both</p>
                    <BadgeText text="Current" additionalClassNames="bg-[#059669]" />
                  </Doc>
                  <Doc>
                    <DocName text="file-text" text1="Purchase Agreement" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[140px]">Contract</p>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[100px]">Feb 2021</p>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[120px]">Both</p>
                    <BadgeText text="Current" additionalClassNames="bg-[#059669]" />
                  </Doc>
                  <Doc>
                    <DocName text="file-text" text1="Mortgage Note" />
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[140px]">Loan Document</p>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[100px]">Mar 2021</p>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[120px]">Both</p>
                    <BadgeText text="Current" additionalClassNames="bg-[#059669]" />
                  </Doc>
                  <div className="relative shrink-0 w-full" data-name="doc4">
                    <Wrapper2>
                      <DocName text="file-text" text1="Co-Owner Agreement" />
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[140px]">Legal Agreement</p>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[100px]">Mar 2021</p>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] w-[120px]">Both</p>
                      <BadgeText text="Current" additionalClassNames="bg-[#059669]" />
                    </Wrapper2>
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
            </div>
          </div>
          <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="activityLogRow">
            <div className="bg-white content-stretch flex flex-col items-start relative rounded-[8px] shrink-0 w-full" data-name="activityLogCard">
              <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
              <div className="h-[68px] relative shrink-0 w-full" data-name="Card Header">
                <div className="flex flex-col justify-center size-full">
                  <Wrapper6 additionalClassNames="px-[40px]">{`Ownership History & Activity`}</Wrapper6>
                </div>
              </div>
              <div className="relative shrink-0 w-full" data-name="Card Content">
                <div className="flex flex-col justify-center size-full">
                  <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[16px] items-start justify-center not-italic p-[40px] relative w-full">
                    <Act text="Jan 15, 2026" text1="📋" text2="1099 forms generated and sent to both owners" />
                    <Act text="Dec 01, 2025" text1="💰" text2="Annual equity statement distributed" />
                    <Act text="Mar 15, 2021" text1="🏠" text2="Property acquired — Tenancy in Common established" />
                    <Act text="Mar 15, 2021" text1="📄" text2="Deed recorded with Cook County" />
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