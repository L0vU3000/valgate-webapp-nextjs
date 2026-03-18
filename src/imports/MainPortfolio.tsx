import clsx from "clsx";
import svgPaths from "./svg-1ygq7c8h68";
type Wrapper6Props = {
  additionalClassNames?: string;
};

function Wrapper6({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper6Props>) {
  return (
    <div className={clsx("absolute left-0 w-[1096px]", additionalClassNames)}>
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] size-full">{children}</div>
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Wrapper5({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-[349px]">
      <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip px-[24px] py-[16px] relative rounded-[inherit] w-full">{children}</div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[12px]" />
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

function Wrapper4({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <div className="content-stretch flex items-center justify-center p-[8px] relative size-full">{children}</div>
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

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        {children}
      </svg>
    </div>
  );
}

function Icon1({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper1>
      <g id="Icon">{children}</g>
    </Wrapper1>
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
type IconProps = {
  additionalClassNames?: string;
};

function Icon({ children, additionalClassNames = "" }: React.PropsWithChildren<IconProps>) {
  return (
    <Wrapper3 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper3>
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

function Wrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}
type Text6Props = {
  text: string;
};

function Text6({ text, children }: React.PropsWithChildren<Text6Props>) {
  return (
    <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0">
      <div className="relative shrink-0 size-[7px]" data-name="Ellipse">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 7">
          {children}
        </svg>
      </div>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#14181b] text-[12px] tracking-[0.012px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type PageButtonsButtonTextProps = {
  text: string;
};

function PageButtonsButtonText({ text }: PageButtonsButtonTextProps) {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0 size-[36px]">
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <Wrapper4>
        <p className="font-['Inter:Semi_Bold','Noto_Sans:SemiBold',sans-serif] font-semibold leading-[19px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
      </Wrapper4>
    </div>
  );
}
type Text5Props = {
  text: string;
};

function Text5({ text }: Text5Props) {
  return (
    <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type ContainerText6Props = {
  text: string;
};

function ContainerText6({ text }: ContainerText6Props) {
  return (
    <Text6 text={text}>
      <circle cx="3.5" cy="3.5" fill="var(--fill-0, #F59E0B)" id="Ellipse" r="3.5" />
    </Text6>
  );
}
type ContainerText5Props = {
  text: string;
};

function ContainerText5({ text }: ContainerText5Props) {
  return (
    <Text6 text={text}>
      <circle cx="3.5" cy="3.5" fill="var(--fill-0, #E11D48)" id="Ellipse" r="3.5" />
    </Text6>
  );
}
type Text4Props = {
  text: string;
};

function Text4({ text }: Text4Props) {
  return (
    <div className="bg-[#fffbeb] relative rounded-[9999px] shrink-0">
      <div className="content-stretch flex items-start overflow-clip px-[8px] py-[2px] relative rounded-[inherit]">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[12px] not-italic relative shrink-0 text-[#92400e] text-[12px] whitespace-nowrap">{text}</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#fde68a] border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[3px] relative shrink-0 w-[52px]">
      <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
      <div className="absolute bg-[#059669] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
    </div>
  );
}
type ContainerText4Props = {
  text: string;
};

function ContainerText4({ text }: ContainerText4Props) {
  return (
    <Text6 text={text}>
      <circle cx="3.5" cy="3.5" fill="var(--fill-0, #059669)" id="Ellipse" r="3.5" />
    </Text6>
  );
}
type Text3Props = {
  text: string;
};

function Text3({ text }: Text3Props) {
  return (
    <div className="bg-[#f0f9ff] relative rounded-[9999px] shrink-0">
      <div className="content-stretch flex items-start overflow-clip px-[8px] py-[2px] relative rounded-[inherit]">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[12px] not-italic relative shrink-0 text-[#0369a1] text-[12px] whitespace-nowrap">{text}</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#bae6fd] border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}
type ContainerText3Props = {
  text: string;
};

function ContainerText3({ text }: ContainerText3Props) {
  return (
    <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[120px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type ContainerText2Props = {
  text: string;
  additionalClassNames?: string;
};

function ContainerText2({ text, additionalClassNames = "" }: ContainerText2Props) {
  return (
    <div className={clsx("content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type BadgeHouseTextProps = {
  text: string;
};

function BadgeHouseText({ text }: BadgeHouseTextProps) {
  return (
    <div className="bg-[#dbeafe] content-stretch flex items-start overflow-clip px-[8px] py-[2px] relative rounded-[9999px] shrink-0">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[12px] not-italic relative shrink-0 text-[#2563eb] text-[12px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type Container1Props = {
  text: string;
  text1: string;
};

function Container1({ text, text1 }: Container1Props) {
  return (
    <div className="content-stretch flex flex-col gap-[2px] h-[64px] items-start justify-center not-italic overflow-clip px-[12px] relative shrink-0 w-[240px] whitespace-nowrap">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] relative shrink-0 text-[#14181b] text-[14px]">{text}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#6b7684] text-[12px]">{text1}</p>
    </div>
  );
}
type ContainerText1Props = {
  text: string;
};

function ContainerText1({ text }: ContainerText1Props) {
  return (
    <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[48px]">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#6b7684] text-[12px] whitespace-nowrap">{text}</p>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[40px]">
      <div className="bg-white relative rounded-[4px] shrink-0 size-[14px]" data-name="Rectangle">
        <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
    </div>
  );
}
type ContainerTextProps = {
  text: string;
  additionalClassNames?: string;
};

function ContainerText({ text, additionalClassNames = "" }: ContainerTextProps) {
  return (
    <div className={clsx("content-stretch flex h-[44px] items-center overflow-clip px-[12px] relative shrink-0", additionalClassNames)}>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[12px] tracking-[0.012px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type FilterScrollBadgeTextProps = {
  text: string;
  additionalClassNames?: string;
};

function FilterScrollBadgeText({ text, additionalClassNames = "" }: FilterScrollBadgeTextProps) {
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
type BottomRowTextProps = {
  text: string;
};

function BottomRowText({ text }: BottomRowTextProps) {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0">
      <Text2 text="↑ +20%" />
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#6b7684] text-[12px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text2Props = {
  text: string;
};

function Text2({ text }: Text2Props) {
  return (
    <div className="bg-[#ecfdf5] relative rounded-[9999px] shrink-0">
      <div className="content-stretch flex items-start overflow-clip px-[8px] py-[2px] relative rounded-[inherit]">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[12px] not-italic relative shrink-0 text-[#065f46] text-[12px] whitespace-nowrap">{text}</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#a7f3d0] border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}
type IconPillTextProps = {
  text: string;
};

function IconPillText({ text }: IconPillTextProps) {
  return (
    <div className="bg-[#eef2f8] content-stretch flex items-center justify-center overflow-clip relative rounded-[9999px] shrink-0 size-[32px]">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">{text}</p>
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
                  <div className="relative shrink-0" data-name="Text Container">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                    </div>
                  </div>
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
                      <Icon additionalClassNames="relative shrink-0">
                        <path d={svgPaths.p137c7200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p254f3200} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon>
                    </div>
                    <div className="absolute left-[44px] rounded-[8px] size-[36px] top-0" data-name="Button">
                      <Icon additionalClassNames="absolute left-[9px] top-[9px]">
                        <path d={svgPaths.p985d280} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p2ac55e70} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon>
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
                        <Wrapper1>
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
                        </Wrapper1>
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

export default function MainPortfolio() {
  return (
    <div className="bg-[#f5f6f7] content-stretch flex items-start relative size-full" data-name="Main - Portfolio">
      <Sidebar className="bg-white relative rounded-[8px] self-stretch shrink-0 w-[280px]" />
      <div className="bg-[#f5f6f7] content-stretch flex flex-col items-start relative shrink-0" data-name="content-area">
        <div className="bg-white h-[157px] relative shrink-0 w-full" data-name="Main Headers">
          <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
          <div className="content-stretch flex flex-col gap-[16px] items-start pb-[2px] pt-[24px] px-[24px] relative size-full">
            <div className="content-stretch flex flex-col gap-[4px] h-[56px] items-start relative shrink-0 w-full" data-name="Container">
              <div className="h-[32px] relative shrink-0 w-full" data-name="Heading 1">
                <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[33px] left-0 not-italic text-[#14181b] text-[24px] top-0 whitespace-nowrap">Portfolio</p>
              </div>
              <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
                <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#515d66] text-[14px] top-0 whitespace-nowrap">Explore anything in your property database</p>
              </div>
            </div>
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Container">
              <div className="h-[36px] relative shrink-0 w-[80px]" data-name="Container">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
                  <div className="relative rounded-[8px] shrink-0 size-[36px]" data-name="Button">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                      <Icon additionalClassNames="relative shrink-0">
                        <path d={svgPaths.p126da180} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d="M15.75 15.75L12.525 12.525" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon>
                    </div>
                  </div>
                  <div className="flex-[1_0_0] h-[36px] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                      <Icon additionalClassNames="relative shrink-0">
                        <path d={svgPaths.p3f4e600} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p2aca4e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        <path d={svgPaths.p10b1cef0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </Icon>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[36px] relative shrink-0 w-[231.063px]" data-name="Container">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
                  <div className="bg-white relative rounded-[6px] shrink-0" data-name="Button">
                    <div aria-hidden="true" className="absolute border border-[#14181b] border-solid inset-0 pointer-events-none rounded-[6px]" />
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center px-[16px] py-[8px] relative">
                      <Icon1>
                        <path d={svgPaths.p36bb6c80} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      </Icon1>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">Filter</p>
                    </div>
                  </div>
                  <div className="bg-[#2563eb] flex-[1_0_0] min-h-px min-w-px relative rounded-[6px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]" data-name="Button">
                    <div className="flex flex-row items-center justify-center size-full">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[8px] relative w-full">
                        <Icon1>
                          <path d="M3.33333 8H12.6667" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M8 3.33333V12.6667" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </Icon1>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">Add Property</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#f5f6f7] content-stretch flex gap-[24px] items-center px-[32px] py-[16px] relative shrink-0 w-[1160px]" data-name="kpi-section">
          <Wrapper5>
            <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <IconPillText text="💼" />
              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[12px] tracking-[0.012px] whitespace-nowrap">Total Property</p>
            </div>
            <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#14181b] text-[30px] whitespace-nowrap">1,500</p>
            <BottomRowText text="Last month total 1,050" />
          </Wrapper5>
          <Wrapper5>
            <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <IconPillText text="📊" />
              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[12px] tracking-[0.012px] whitespace-nowrap">Number of Sales</p>
            </div>
            <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#14181b] text-[30px] whitespace-nowrap">320</p>
            <BottomRowText text="Last month total 950" />
          </Wrapper5>
          <Wrapper5>
            <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <IconPillText text="💰" />
              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[#515d66] text-[12px] tracking-[0.012px] whitespace-nowrap">Total Sales</p>
            </div>
            <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#14181b] text-[30px] whitespace-nowrap">$150k</p>
            <BottomRowText text="Last month total 1,500" />
          </Wrapper5>
        </div>
        <div className="bg-white h-[56px] relative shrink-0 w-[1160px]" data-name="province-filter-bar">
          <div className="absolute content-stretch flex gap-[8px] h-[56px] items-center left-0 pl-[32px] pr-[64px] py-[8px] top-0" data-name="filter-scroll">
            <FilterScrollBadgeText text="All" additionalClassNames="bg-[#2563eb]" />
            <FilterScrollBadgeText text="Banteay Meanchey" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Battambang" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kampong Cham" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kampong Chhnang" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kampong Speu" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kampong Thom" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kampot" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kandal" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kep" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Koh Kong" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Kratié" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Mondulkiri" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Oddar Meanchey" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Pailin" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Phnom Penh" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Preah Vihear" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Prey Veng" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Pursat" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Ratanakiri" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Siem Reap" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Sihanoukville" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Stung Treng" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Svay Rieng" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Takéo" additionalClassNames="bg-[#059669]" />
            <FilterScrollBadgeText text="Tbong Khmum" additionalClassNames="bg-[#059669]" />
          </div>
        </div>
        <div className="bg-white content-stretch flex flex-col h-[1124px] items-start overflow-clip px-[32px] relative shrink-0 w-[1160px]" data-name="table-card">
          <div className="h-[1068px] overflow-clip relative rounded-[12px] shrink-0 w-[1096px]" data-name="settings-group">
            <Wrapper6 additionalClassNames="bg-[#f5f6f7] h-[44px] top-0">
              <div className="h-[44px] shrink-0 w-[40px]" data-name="container" />
              <ContainerText text="#" additionalClassNames="w-[48px]" />
              <div className="h-[44px] shrink-0 w-[52px]" data-name="container" />
              <ContainerText text="Property" additionalClassNames="w-[240px]" />
              <ContainerText text="Type" additionalClassNames="w-[100px]" />
              <ContainerText text="Province" additionalClassNames="w-[140px]" />
              <ContainerText text="Status" additionalClassNames="w-[90px]" />
              <ContainerText text="Size ↕" additionalClassNames="w-[90px]" />
              <ContainerText text="Buy ↕" additionalClassNames="w-[120px]" />
              <ContainerText text="Title ↕" additionalClassNames="justify-center w-[100px]" />
              <ContainerText text="Health ↕" additionalClassNames="w-[76px]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[44px]">
              <Container />
              <ContainerText1 text="1" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Land near river" text1="PP00016 PH" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <BadgeHouseText text="House" />
              </div>
              <ContainerText2 text="Phnom Penh" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text2 text="Rented" />
              </div>
              <ContainerText2 text="850 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$1,278,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText4 text="100%" />
                <Container2 />
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[108px]">
              <Container />
              <ContainerText1 text="2" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Siem Reap Land Plot" text1="SR00015 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Siem Reap" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="1,200 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$456,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text4 text="Soft title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="28%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[15px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[172px]">
              <Container />
              <ContainerText1 text="3" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Kampong Chhnang Prop." text1="KPC00013" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Kampong Chhnang" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="2,500 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$125,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="43%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[22px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[236px]">
              <Container />
              <ContainerText1 text="4" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Angkor Property" text1="SR00007 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Siem Reap" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="900 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$234,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text4 text="Soft title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText6 text="67%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#f59e0b] h-[3px] left-0 rounded-[2px] top-0 w-[35px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[300px]">
              <Container />
              <ContainerText1 text="5" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Temple View Land" text1="SR00006 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Siem Reap" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="1,100 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$345,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText4 text="82%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#059669] h-[3px] left-0 rounded-[2px] top-0 w-[43px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[364px]">
              <Container />
              <ContainerText1 text="6" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Central Siem Reap" text1="SR00005 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Siem Reap" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text2 text="Rented" />
              </div>
              <ContainerText2 text="750 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$567,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText4 text="95%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#059669] h-[3px] left-0 rounded-[2px] top-0 w-[49px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[428px]">
              <Container />
              <ContainerText1 text="7" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Commercial Building" text1="SR00004 Building" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Building" />
              </div>
              <ContainerText2 text="Siem Reap" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text2 text="Rented" />
              </div>
              <ContainerText2 text="450 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$890,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText4 text="88%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#059669] h-[3px] left-0 rounded-[2px] top-0 w-[46px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[492px]">
              <Container />
              <ContainerText1 text="8" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Prey Veng Agricultural" text1="PV00002 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Prey Veng" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="5,000 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$180,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text4 text="Soft title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="34%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[18px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[556px]">
              <Container />
              <ContainerText1 text="9" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Riverside Plot" text1="PV00001 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Prey Veng" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="3,200 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$156,000" />
              <Text5 text="—" />
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="22%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[11px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[620px]">
              <Container />
              <ContainerText1 text="10" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Phnom Penh Urban" text1="PP00033 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Phnom Penh" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="600 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$980,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText6 text="75%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#f59e0b] h-[3px] left-0 rounded-[2px] top-0 w-[39px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[684px]">
              <Container />
              <ContainerText1 text="11" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="BKK1 Land" text1="PP00032 Land" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Phnom Penh" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text2 text="Rented" />
              </div>
              <ContainerText2 text="480 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$1,450,000" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText4 text="100%" />
                <Container2 />
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[748px]">
              <Container />
              <ContainerText1 text="12" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Property 12" text1="GEN00012" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Building" />
              </div>
              <ContainerText2 text="Prey Veng" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="4,325 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$1,232,356" />
              <Text5 text="—" />
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="12%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[6px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[812px]">
              <Container />
              <ContainerText1 text="13" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Property 13" text1="GEN00013" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <BadgeHouseText text="House" />
              </div>
              <ContainerText2 text="Kampot" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text4 text="Vacant" />
              </div>
              <ContainerText2 text="3,806 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$356,146" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text4 text="Soft title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="19%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[10px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[876px]">
              <Container />
              <ContainerText1 text="14" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Property 14" text1="GEN00014" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <BadgeHouseText text="House" />
              </div>
              <ContainerText2 text="Prey Veng" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text2 text="Rented" />
              </div>
              <ContainerText2 text="4,119 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$405,484" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text3 text="Hard title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="10%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[5px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[940px]">
              <Container />
              <ContainerText1 text="15" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Property 15" text1="GEN00015" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Phnom Penh" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text2 text="Rented" />
              </div>
              <ContainerText2 text="2,256 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$955,491" />
              <div className="content-stretch flex h-[64px] items-center justify-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text4 text="Soft title" />
              </div>
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="33%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[17px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
            <Wrapper6 additionalClassNames="bg-white h-[64px] top-[1004px]">
              <Container />
              <ContainerText1 text="16" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[52px]" data-name="container">
                <div className="bg-[#acb4bc] rounded-[6px] shrink-0 size-[36px]" data-name="Rectangle" />
              </div>
              <Container1 text="Property 16" text1="GEN00016" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[100px]" data-name="container">
                <Text2 text="Land" />
              </div>
              <ContainerText2 text="Phnom Penh" additionalClassNames="w-[140px]" />
              <div className="content-stretch flex h-[64px] items-center overflow-clip px-[12px] relative shrink-0 w-[90px]" data-name="container">
                <Text2 text="Rented" />
              </div>
              <ContainerText2 text="4,917 m²" additionalClassNames="w-[90px]" />
              <ContainerText3 text="$1,179,626" />
              <Text5 text="—" />
              <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start justify-center overflow-clip px-[12px] relative shrink-0 w-[76px]" data-name="container">
                <ContainerText5 text="24%" />
                <div className="h-[3px] relative shrink-0 w-[52px]" data-name="container">
                  <div className="absolute bg-[#acb4bc] h-[3px] left-0 rounded-[2px] top-0 w-[52px]" data-name="Rectangle" />
                  <div className="absolute bg-[#e11d48] h-[3px] left-0 rounded-[2px] top-0 w-[12px]" data-name="Rectangle" />
                </div>
              </div>
            </Wrapper6>
          </div>
          <div className="bg-[#e8eaed] content-stretch flex h-[56px] items-center justify-between overflow-clip relative shrink-0 w-[1096px]" data-name="pagination-footer">
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Showing 1–25 of 1,500 results</p>
            <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-name="page-buttons">
              <PageButtonsButtonText text="←" />
              <div className="bg-[#2563eb] relative rounded-[6px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[36px]" data-name="Button">
                <Wrapper4>
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[19px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">1</p>
                </Wrapper4>
              </div>
              <PageButtonsButtonText text="2" />
              <PageButtonsButtonText text="3" />
              <div className="content-stretch flex items-end justify-between relative shrink-0 size-[36px]" data-name="context-menu">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px] whitespace-nowrap">...</p>
              </div>
              <PageButtonsButtonText text="60" />
              <PageButtonsButtonText text="→" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}