import clsx from "clsx";
import svgPaths from "./svg-ueulpa9qvj";
type ExpenseBreakdownEllipseProps = {
  additionalClassNames?: string;
};

function ExpenseBreakdownEllipse({ children, additionalClassNames = "" }: React.PropsWithChildren<ExpenseBreakdownEllipseProps>) {
  return (
    <div className={clsx("absolute left-[20px] size-[8px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
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
    <div className={additionalClassNames}>
      <div className="overflow-clip relative rounded-[inherit] size-full">{children}</div>
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}
type Wrapper3Props = {
  additionalClassNames?: string;
};

function Wrapper3({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper3Props>) {
  return <Wrapper4 additionalClassNames={clsx("bg-white relative rounded-[12px] shrink-0 w-[389px]", additionalClassNames)}>{children}</Wrapper4>;
}
type Wrapper2Props = {
  additionalClassNames?: string;
};

function Wrapper2({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper2Props>) {
  return <Wrapper4 additionalClassNames={clsx("bg-white flex-[1_0_0] min-h-px min-w-px relative rounded-[12px]", additionalClassNames)}>{children}</Wrapper4>;
}

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative">{children}</div>
    </div>
  );
}
type Wrapper1Props = {
  additionalClassNames?: string;
};

function Wrapper1({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper1Props>) {
  return (
    <div className={clsx("size-[18px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        {children}
      </svg>
    </div>
  );
}
type Icon1Props = {
  additionalClassNames?: string;
};

function Icon1({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon1Props>) {
  return (
    <Wrapper1 additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper1>
  );
}

function Icon({ children }: React.PropsWithChildren<{}>) {
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
    <div className="bg-white flex-[1_0_0] h-[104px] min-h-px min-w-px relative rounded-[12px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start justify-between not-italic p-[16px] relative size-full">{children}</div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}
type Badge3Props = {
  additionalClassNames?: string;
};

function Badge3({ additionalClassNames = "" }: Badge3Props) {
  return (
    <div className={clsx("absolute bg-[#059669] left-[360px] rounded-[9999px]", additionalClassNames)}>
      <div className="flex flex-row items-center justify-center size-full">
        <Text1 text="MED" />
      </div>
    </div>
  );
}
type Badge2Props = {
  additionalClassNames?: string;
};

function Badge2({ additionalClassNames = "" }: Badge2Props) {
  return (
    <div className={clsx("absolute bg-[#e11d48] left-[360px] rounded-[9999px]", additionalClassNames)}>
      <div className="flex flex-row items-center justify-center size-full">
        <Text1 text="HIGH" />
      </div>
    </div>
  );
}
type Badge1Props = {
  additionalClassNames?: string;
};

function Badge1({ additionalClassNames = "" }: Badge1Props) {
  return (
    <div className={clsx("absolute bg-[#059669] left-[280px] rounded-[9999px]", additionalClassNames)}>
      <div className="flex flex-row items-center justify-center size-full">
        <Text1 text="Pending" />
      </div>
    </div>
  );
}
type BadgeProps = {
  additionalClassNames?: string;
};

function Badge({ additionalClassNames = "" }: BadgeProps) {
  return (
    <div className={clsx("absolute bg-[#059669] left-[280px] rounded-[9999px]", additionalClassNames)}>
      <div className="flex flex-row items-center justify-center size-full">
        <Text1 text="Renewing" />
      </div>
    </div>
  );
}
type Helper1Props = {
  text: string;
  text1: string;
  text2: string;
};

function Helper1({ text, text1, text2 }: Helper1Props) {
  return (
    <Wrapper>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#515d66] text-[12px] w-full">{text}</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[33px] relative shrink-0 text-[#14181b] text-[24px] w-full">{text1}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#881337] text-[12px] w-full">{text2}</p>
    </Wrapper>
  );
}
type HelperProps = {
  text: string;
  text1: string;
  text2: string;
};

function Helper({ text, text1, text2 }: HelperProps) {
  return (
    <Wrapper>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#515d66] text-[12px] w-full">{text}</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[33px] relative shrink-0 text-[#14181b] text-[24px] w-full">{text1}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#065f46] text-[12px] w-full">{text2}</p>
    </Wrapper>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text }: Text1Props) {
  return (
    <div className="content-stretch flex items-center justify-center px-[8px] py-[4px] relative">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[12px] text-white tracking-[0.012px] whitespace-nowrap">{text}</p>
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
        <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">
          <p className="leading-[24px]">{text}</p>
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
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">{text}</p>
    </div>
  );
}

export default function MainAnalytics() {
  return (
    <div className="bg-[#f5f6f7] content-stretch flex items-start relative size-full" data-name="Main - Analytics">
      <div className="bg-white relative rounded-[8px] self-stretch shrink-0 w-[280px]" data-name="Sidebar">
        <div className="overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex flex-col items-start relative size-full">
            <div className="flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="Sidebar">
              <div aria-hidden="true" className="absolute border-[#d1d5db] border-r border-solid inset-0 pointer-events-none" />
              <div className="content-stretch flex flex-col items-start pr-px relative size-full">
                <div className="h-[81px] relative shrink-0 w-[279px]" data-name="Logo Container">
                  <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center pb-px pl-[24px] relative size-full">
                    <div className="bg-[#2563eb] relative rounded-[8px] shrink-0 size-[32px]" data-name="Icon Container">
                      <Text text="V" />
                    </div>
                    <div className="relative shrink-0" data-name="Text Container">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative shrink-0" data-name="User Container">
                  <div aria-hidden="true" className="absolute border-[#d1d5db] border-b border-solid inset-0 pointer-events-none" />
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center px-[24px] py-[12px] relative">
                    <div className="content-stretch flex items-start overflow-clip relative rounded-[9999px] shrink-0 size-[40px]" data-name="User Pic Container">
                      <div className="bg-[#2563eb] flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[9999px]" data-name="Text">
                        <Text text="JD" />
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[179px]" data-name="Container">
                      <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-full" data-name="Paragraph">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Jon Doe</p>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#6b7684] text-[16px] whitespace-nowrap">3 Members</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-[1_0_0] min-h-px min-w-px relative w-[279px]" data-name="Navigation">
                  <div className="overflow-clip rounded-[inherit] size-full">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[12px] pt-[16px] px-[12px] relative size-full">
                      <div className="content-stretch flex flex-col gap-[4px] h-[284px] items-start relative shrink-0 w-full" data-name="List">
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon>
                              <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon>
                            <TextText text="Home" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon>
                              <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon>
                            <TextText text="Portfolio" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon>
                              <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon>
                            <TextText text="Map" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon>
                              <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon>
                            <TextText text="Analytics" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon>
                              <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon>
                            <TextText text="Succession" />
                            <div className="bg-[#dbeafe] relative rounded-[9999px] shrink-0" data-name="Text">
                              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[8px] py-[4px] relative">
                                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#2563eb] text-[14px] text-center whitespace-nowrap">Soon</p>
                              </div>
                            </div>
                          </div>
                        </ListItem>
                        <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="List Item">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex h-full items-start relative">
                            <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                              <Icon>
                                <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              </Icon>
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
                        <Wrapper1 additionalClassNames="absolute left-[9px] top-[9px]">
                          <g clipPath="url(#clip0_1_14947)" id="Icon">
                            <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </g>
                          <defs>
                            <clipPath id="clip0_1_14947">
                              <rect fill="white" height="18" width="18" />
                            </clipPath>
                          </defs>
                        </Wrapper1>
                        <div className="absolute bg-[#059669] left-[24px] rounded-[9999px] size-[8px] top-[24px]" data-name="Text" />
                      </div>
                    </div>
                    <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="Container">
                      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
                      <div className="content-stretch flex flex-col gap-[8px] items-start p-[12px] relative w-full">
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                          <div className="relative shrink-0 size-[16px]" data-name="Icon">
                            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                              <g clipPath="url(#clip0_1_14931)" id="Icon">
                                <path d={svgPaths.p874e300} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M13.3333 2V4.66667" id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M14.6667 3.33333H12" id="Vector_3" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M2.66667 11.3333V12.6667" id="Vector_4" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M3.33333 12H2" id="Vector_5" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                              </g>
                              <defs>
                                <clipPath id="clip0_1_14931">
                                  <rect fill="white" height="16" width="16" />
                                </clipPath>
                              </defs>
                            </svg>
                          </div>
                          <div className="h-[16px] relative shrink-0 w-[113.594px]" data-name="Text">
                            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
                              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Valgate Intelligence</p>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Paragraph">
                          <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[24px] min-h-px min-w-px not-italic relative text-[#515d66] text-[16px]">AI-powered insights for your portfolio</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
      </div>
      <div className="bg-[#f5f6f7] content-stretch flex flex-[1_0_0] flex-col h-[1192px] items-start min-h-px min-w-px overflow-clip relative" data-name="content-area">
        <div className="bg-white h-[64px] relative shrink-0 w-full" data-name="topbar">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-center justify-between px-[24px] py-[12px] relative size-full">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#14181b] text-[20px] whitespace-nowrap">Analytics</p>
              <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="quick-settings">
                <div className="bg-[#2563eb] content-stretch flex items-center justify-end overflow-clip px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-name="container">
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic relative shrink-0 text-[12px] text-white tracking-[0.012px] whitespace-nowrap">All Properties</p>
                </div>
                <div className="bg-white relative rounded-[16px] shrink-0" data-name="container">
                  <div className="content-stretch flex items-center justify-end overflow-clip px-[16px] py-[8px] relative rounded-[inherit]">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#515d66] text-[12px] whitespace-nowrap">Last 12 months</p>
                  </div>
                  <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[16px]" />
                </div>
                <div className="bg-white relative rounded-[6px] shrink-0" data-name="Button">
                  <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[6px]" />
                  <div className="flex flex-row items-center justify-end size-full">
                    <div className="content-stretch flex items-center justify-end px-[16px] py-[8px] relative">
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-pre">{`↓  Export`}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#f5f6f7] flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="page-content">
          <div className="overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex flex-col gap-[32px] items-start pb-[32px] pt-[24px] px-[24px] relative size-full">
              <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 w-full" data-name="Section - Portfolio">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[15px] not-italic relative shrink-0 text-[#6b7684] text-[10px] w-full">PORTFOLIO OVERVIEW</p>
                <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="KPI Row">
                  <Helper text="Total Revenue (MTD)" text1="$142,800" text2="▲ 8.2% vs last month" />
                  <Helper text="Occupancy Rate" text1="94.3%" text2="▲ 1.1% vs last month" />
                  <Helper1 text="Avg Days to Lease" text1="18 days" text2="▼ 3 days longer" />
                  <Helper1 text="Outstanding Rent" text1="$9,450" text2="▼ 3 units overdue" />
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 w-full" data-name="Section - Financial">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[15px] not-italic relative shrink-0 text-[#6b7684] text-[10px] w-full">FINANCIAL PERFORMANCE</p>
                <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="Financial Row">
                  <Wrapper2 additionalClassNames="h-[270px]">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[20px] not-italic text-[#14181b] text-[14px] top-[18px] whitespace-nowrap">Revenue vs Expenses</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[38px] whitespace-nowrap">Monthly · Last 12 months</p>
                    <div className="absolute bg-[#f5f6f7] h-[155px] left-[20px] rounded-[6px] top-[60px] w-[739px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[22px] not-italic text-[#6b7684] text-[9px] top-[64px] whitespace-nowrap">$180K</p>
                    <div className="absolute bg-[#e8eaed] h-px left-[54px] top-[70px] w-[701px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[22px] not-italic text-[#6b7684] text-[9px] top-[91px] whitespace-nowrap">$120K</p>
                    <div className="absolute bg-[#e8eaed] h-px left-[54px] top-[97px] w-[701px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[22px] not-italic text-[#6b7684] text-[9px] top-[118px] whitespace-nowrap">$60K</p>
                    <div className="absolute bg-[#e8eaed] h-px left-[54px] top-[124px] w-[701px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[22px] not-italic text-[#6b7684] text-[9px] top-[145px] whitespace-nowrap">$0</p>
                    <div className="absolute bg-[#e8eaed] h-px left-[54px] top-[151px] w-[701px]" data-name="Rectangle" />
                    <div className="absolute bg-[#2563eb] h-[76px] left-[76.13px] rounded-[2px] top-[139px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[42px] left-[86.13px] rounded-[2px] top-[173px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[79.13px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">J</p>
                    <div className="absolute bg-[#2563eb] h-[73px] left-[134.38px] rounded-[2px] top-[142px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[39px] left-[144.38px] rounded-[2px] top-[176px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[137.38px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">F</p>
                    <div className="absolute bg-[#2563eb] h-[81px] left-[192.63px] rounded-[2px] top-[134px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[45px] left-[202.63px] rounded-[2px] top-[170px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[195.63px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">M</p>
                    <div className="absolute bg-[#2563eb] h-[84px] left-[250.88px] rounded-[2px] top-[131px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[48px] left-[260.88px] rounded-[2px] top-[167px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[253.88px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">A</p>
                    <div className="absolute bg-[#2563eb] h-[78px] left-[309.13px] rounded-[2px] top-[137px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[42px] left-[319.13px] rounded-[2px] top-[173px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[312.13px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">M</p>
                    <div className="absolute bg-[#2563eb] h-[87px] left-[367.38px] rounded-[2px] top-[128px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[52px] left-[377.38px] rounded-[2px] top-[163px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[370.38px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">J</p>
                    <div className="absolute bg-[#2563eb] h-[90px] left-[425.63px] rounded-[2px] top-[125px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[47px] left-[435.63px] rounded-[2px] top-[168px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[428.63px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">J</p>
                    <div className="absolute bg-[#2563eb] h-[85px] left-[483.88px] rounded-[2px] top-[130px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[50px] left-[493.88px] rounded-[2px] top-[165px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[486.88px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">A</p>
                    <div className="absolute bg-[#2563eb] h-[93px] left-[542.13px] rounded-[2px] top-[122px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[56px] left-[552.13px] rounded-[2px] top-[159px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[545.13px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">S</p>
                    <div className="absolute bg-[#2563eb] h-[97px] left-[600.38px] rounded-[2px] top-[118px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[49px] left-[610.38px] rounded-[2px] top-[166px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[603.38px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">O</p>
                    <div className="absolute bg-[#2563eb] h-[101px] left-[658.63px] rounded-[2px] top-[114px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[53px] left-[668.63px] rounded-[2px] top-[162px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[661.63px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">N</p>
                    <div className="absolute bg-[#2563eb] h-[110px] left-[716.88px] rounded-[2px] top-[105px] w-[8px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[59px] left-[726.88px] rounded-[2px] top-[156px] w-[8px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[719.88px] not-italic text-[#6b7684] text-[9px] top-[219px] whitespace-nowrap">D</p>
                    <div className="absolute bg-[#2563eb] left-[20px] rounded-[2px] size-[10px] top-[235px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[34px] not-italic text-[#515d66] text-[12px] top-[233px] whitespace-nowrap">Revenue</p>
                    <div className="absolute bg-[#f59e0b] left-[98px] rounded-[2px] size-[10px] top-[235px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[112px] not-italic text-[#515d66] text-[12px] top-[233px] whitespace-nowrap">Expenses</p>
                  </Wrapper2>
                  <Wrapper3 additionalClassNames="h-[270px]">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[20px] not-italic text-[#14181b] text-[14px] top-[18px] whitespace-nowrap">Expense Breakdown</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[38px] whitespace-nowrap">By category this month</p>
                    <div className="absolute bg-[#2563eb] h-[14px] left-[20px] rounded-bl-[7px] rounded-tl-[7px] top-[64px] w-[140px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[14px] left-[160px] top-[64px] w-[77px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] h-[14px] left-[237px] top-[64px] w-[49px]" data-name="Rectangle" />
                    <div className="absolute bg-[#6b7684] h-[14px] left-[286px] rounded-br-[7px] rounded-tr-[7px] top-[64px] w-[84px]" data-name="Rectangle" />
                    <ExpenseBreakdownEllipse additionalClassNames="top-[92px]">
                      <circle cx="4" cy="4" fill="var(--fill-0, #2563EB)" id="Ellipse" r="4" />
                    </ExpenseBreakdownEllipse>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[32px] not-italic text-[#515d66] text-[12px] top-[90px] whitespace-nowrap">Maintenance</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[351px] not-italic text-[#14181b] text-[12px] top-[90px] whitespace-nowrap">40%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[32px] rounded-[2px] top-[106px] w-[299px]" data-name="Rectangle" />
                    <div className="absolute bg-[#2563eb] h-[4px] left-[32px] rounded-[2px] top-[106px] w-[120px]" data-name="Rectangle" />
                    <ExpenseBreakdownEllipse additionalClassNames="top-[132px]">
                      <circle cx="4" cy="4" fill="var(--fill-0, #F59E0B)" id="Ellipse" r="4" />
                    </ExpenseBreakdownEllipse>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[32px] not-italic text-[#515d66] text-[12px] top-[130px] whitespace-nowrap">Management</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[351px] not-italic text-[#14181b] text-[12px] top-[130px] whitespace-nowrap">22%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[32px] rounded-[2px] top-[146px] w-[299px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[4px] left-[32px] rounded-[2px] top-[146px] w-[66px]" data-name="Rectangle" />
                    <ExpenseBreakdownEllipse additionalClassNames="top-[172px]">
                      <circle cx="4" cy="4" fill="var(--fill-0, #059669)" id="Ellipse" r="4" />
                    </ExpenseBreakdownEllipse>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[32px] not-italic text-[#515d66] text-[12px] top-[170px] whitespace-nowrap">Utilities</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[351px] not-italic text-[#14181b] text-[12px] top-[170px] whitespace-nowrap">14%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[32px] rounded-[2px] top-[186px] w-[299px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] h-[4px] left-[32px] rounded-[2px] top-[186px] w-[42px]" data-name="Rectangle" />
                    <ExpenseBreakdownEllipse additionalClassNames="top-[212px]">
                      <circle cx="4" cy="4" fill="var(--fill-0, #6B7684)" id="Ellipse" r="4" />
                    </ExpenseBreakdownEllipse>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[32px] not-italic text-[#515d66] text-[12px] top-[210px] whitespace-nowrap">Other</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[351px] not-italic text-[#14181b] text-[12px] top-[210px] whitespace-nowrap">24%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[32px] rounded-[2px] top-[226px] w-[299px]" data-name="Rectangle" />
                    <div className="absolute bg-[#6b7684] h-[4px] left-[32px] rounded-[2px] top-[226px] w-[72px]" data-name="Rectangle" />
                    <div className="absolute bg-[#e8eaed] h-px left-[20px] top-[216px] w-[349px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[226px] whitespace-nowrap">Net operating income</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[325px] not-italic text-[#14181b] text-[12px] top-[226px] tracking-[0.012px] whitespace-nowrap">$88,200</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[244px] whitespace-nowrap">NOI margin</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[345px] not-italic text-[#14181b] text-[12px] top-[244px] tracking-[0.012px] whitespace-nowrap">61.8%</p>
                  </Wrapper3>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 w-full" data-name="Section - Occupancy">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[15px] not-italic relative shrink-0 text-[#6b7684] text-[10px] w-full">{`OCCUPANCY & LEASES`}</p>
                <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="Occupancy Row">
                  <Wrapper2 additionalClassNames="h-[260px]">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[20px] not-italic text-[#14181b] text-[14px] top-[18px] whitespace-nowrap">Occupancy by Property</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[36px] whitespace-nowrap">Current vs 95% target</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#14181b] text-[12px] top-[62px] whitespace-nowrap">Maple Apartments</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[345.33px] not-italic text-[#14181b] text-[12px] top-[62px] whitespace-nowrap">98%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[20px] rounded-[2px] top-[78px] w-[341.333px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] h-[4px] left-[20px] rounded-[2px] top-[78px] w-[335px]" data-name="Rectangle" />
                    <div className="absolute bg-[#acb4bc] h-[8px] left-[344px] top-[75px] w-[1.5px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#14181b] text-[12px] top-[100px] whitespace-nowrap">Riverside Complex</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[345.33px] not-italic text-[#14181b] text-[12px] top-[100px] whitespace-nowrap">91%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[20px] rounded-[2px] top-[116px] w-[341.333px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f59e0b] h-[4px] left-[20px] rounded-[2px] top-[116px] w-[311px]" data-name="Rectangle" />
                    <div className="absolute bg-[#acb4bc] h-[8px] left-[344px] top-[113px] w-[1.5px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#14181b] text-[12px] top-[138px] whitespace-nowrap">Park View Lofts</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[345.33px] not-italic text-[#14181b] text-[12px] top-[138px] whitespace-nowrap">96%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[20px] rounded-[2px] top-[154px] w-[341.333px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] h-[4px] left-[20px] rounded-[2px] top-[154px] w-[328px]" data-name="Rectangle" />
                    <div className="absolute bg-[#acb4bc] h-[8px] left-[344px] top-[151px] w-[1.5px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#14181b] text-[12px] top-[176px] whitespace-nowrap">Harbor Heights</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[345.33px] not-italic text-[#14181b] text-[12px] top-[176px] whitespace-nowrap">87%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[20px] rounded-[2px] top-[192px] w-[341.333px]" data-name="Rectangle" />
                    <div className="absolute bg-[#e11d48] h-[4px] left-[20px] rounded-[2px] top-[192px] w-[297px]" data-name="Rectangle" />
                    <div className="absolute bg-[#acb4bc] h-[8px] left-[344px] top-[189px] w-[1.5px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#14181b] text-[12px] top-[214px] whitespace-nowrap">Westside Studios</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[345.33px] not-italic text-[#14181b] text-[12px] top-[214px] whitespace-nowrap">94%</p>
                    <div className="absolute bg-[#e8eaed] h-[4px] left-[20px] rounded-[2px] top-[230px] w-[341.333px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] h-[4px] left-[20px] rounded-[2px] top-[230px] w-[321px]" data-name="Rectangle" />
                    <div className="absolute bg-[#acb4bc] h-[8px] left-[344px] top-[227px] w-[1.5px]" data-name="Rectangle" />
                  </Wrapper2>
                  <Wrapper2 additionalClassNames="h-[260px]">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[20px] not-italic text-[#14181b] text-[14px] top-[18px] whitespace-nowrap">Upcoming Lease Expirations</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[36px] whitespace-nowrap">Next 90 days</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[20px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Tenant</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[158px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Unit</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[210px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Expires</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[280px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Status</p>
                    <div className="absolute bg-[#e8eaed] h-px left-[20px] top-[72px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[20px] not-italic text-[#14181b] text-[12px] top-[86px] whitespace-nowrap">J. Martinez</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[158px] not-italic text-[#515d66] text-[12px] top-[86px] whitespace-nowrap">#204</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[210px] not-italic text-[#515d66] text-[12px] top-[86px] whitespace-nowrap">Jan 15</p>
                    <Badge additionalClassNames="top-[83px]" />
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[112px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[20px] not-italic text-[#14181b] text-[12px] top-[120px] whitespace-nowrap">S. Chen</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[158px] not-italic text-[#515d66] text-[12px] top-[120px] whitespace-nowrap">#312</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[210px] not-italic text-[#515d66] text-[12px] top-[120px] whitespace-nowrap">Jan 22</p>
                    <Badge1 additionalClassNames="top-[117px]" />
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[146px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[20px] not-italic text-[#14181b] text-[12px] top-[154px] whitespace-nowrap">A. Patel</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[158px] not-italic text-[#515d66] text-[12px] top-[154px] whitespace-nowrap">#107</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[210px] not-italic text-[#515d66] text-[12px] top-[154px] whitespace-nowrap">Feb 1</p>
                    <div className="absolute bg-[#e11d48] left-[280px] rounded-[9999px] top-[151px]" data-name="Badge">
                      <div className="flex flex-row items-center justify-center size-full">
                        <Text1 text="Vacating" />
                      </div>
                    </div>
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[180px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[20px] not-italic text-[#14181b] text-[12px] top-[188px] whitespace-nowrap">K. Wilson</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[158px] not-italic text-[#515d66] text-[12px] top-[188px] whitespace-nowrap">#418</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[210px] not-italic text-[#515d66] text-[12px] top-[188px] whitespace-nowrap">Feb 8</p>
                    <Badge1 additionalClassNames="top-[185px]" />
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[214px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[20px] not-italic text-[#14181b] text-[12px] top-[222px] whitespace-nowrap">L. Park</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[158px] not-italic text-[#515d66] text-[12px] top-[222px] whitespace-nowrap">#506</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[210px] not-italic text-[#515d66] text-[12px] top-[222px] whitespace-nowrap">Feb 14</p>
                    <Badge additionalClassNames="top-[219px]" />
                  </Wrapper2>
                  <Wrapper2 additionalClassNames="h-[260px]">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[20px] not-italic text-[#14181b] text-[14px] top-[18px] whitespace-nowrap">Rent Collection</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[36px] whitespace-nowrap">Current month status</p>
                    <div className="absolute bg-[#f5f6f7] h-[72px] left-[20px] not-italic overflow-clip rounded-[8px] top-[60px] w-[164.667px] whitespace-nowrap" data-name="container">
                      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[33px] left-[68.33px] text-[#059669] text-[24px] top-[16px]">87</p>
                      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[70.33px] text-[#6b7684] text-[10px] top-[48px]">Paid</p>
                    </div>
                    <div className="absolute bg-[#fff1f2] h-[72px] left-[196.67px] not-italic overflow-clip rounded-[8px] top-[60px] w-[164.667px] whitespace-nowrap" data-name="container">
                      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[33px] left-[76.33px] text-[#e11d48] text-[24px] top-[16px]">3</p>
                      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[62.33px] text-[#881337] text-[10px] top-[48px]">Overdue</p>
                    </div>
                    <div className="absolute bg-[#e8eaed] h-px left-[20px] top-[148px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[158px] whitespace-nowrap">On-time rate</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[328.83px] not-italic text-[#059669] text-[12px] top-[158px] whitespace-nowrap">96.7%</p>
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[180px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[188px] whitespace-nowrap">Avg days late</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[309.33px] not-italic text-[#14181b] text-[12px] top-[188px] whitespace-nowrap">4.2 days</p>
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[210px] w-[341.333px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[218px] whitespace-nowrap">Pending collections</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[322.33px] not-italic text-[#e11d48] text-[12px] top-[218px] whitespace-nowrap">$9,450</p>
                  </Wrapper2>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 w-full" data-name="Section - Operations">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[15px] not-italic relative shrink-0 text-[#6b7684] text-[10px] w-full">{`OPERATIONS & TRENDS`}</p>
                <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="Operations Row">
                  <Wrapper2 additionalClassNames="h-[240px]">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[20px] not-italic text-[#14181b] text-[14px] top-[18px] whitespace-nowrap">Maintenance Volume</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[36px] whitespace-nowrap">Open work orders by category</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[20px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Category</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[220px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Open</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[276px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Avg days</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[360px] not-italic text-[#6b7684] text-[10px] top-[58px] whitespace-nowrap">Priority</p>
                    <div className="absolute bg-[#e8eaed] h-px left-[20px] top-[72px] w-[739px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[20px] not-italic text-[#14181b] text-[12px] top-[88px] tracking-[0.012px] whitespace-nowrap">Plumbing</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[220px] not-italic text-[#515d66] text-[12px] top-[88px] whitespace-nowrap">7</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[276px] not-italic text-[#515d66] text-[12px] top-[88px] whitespace-nowrap">3.4d</p>
                    <Badge2 additionalClassNames="top-[85px]" />
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[110px] w-[739px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[20px] not-italic text-[#14181b] text-[12px] top-[118px] tracking-[0.012px] whitespace-nowrap">HVAC</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[220px] not-italic text-[#515d66] text-[12px] top-[118px] whitespace-nowrap">4</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[276px] not-italic text-[#515d66] text-[12px] top-[118px] whitespace-nowrap">5.1d</p>
                    <Badge2 additionalClassNames="top-[115px]" />
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[140px] w-[739px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[20px] not-italic text-[#14181b] text-[12px] top-[148px] tracking-[0.012px] whitespace-nowrap">Electrical</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[220px] not-italic text-[#515d66] text-[12px] top-[148px] whitespace-nowrap">2</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[276px] not-italic text-[#515d66] text-[12px] top-[148px] whitespace-nowrap">2.8d</p>
                    <Badge3 additionalClassNames="top-[145px]" />
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[170px] w-[739px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[20px] not-italic text-[#14181b] text-[12px] top-[178px] tracking-[0.012px] whitespace-nowrap">Appliances</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[220px] not-italic text-[#515d66] text-[12px] top-[178px] whitespace-nowrap">5</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[276px] not-italic text-[#515d66] text-[12px] top-[178px] whitespace-nowrap">6.2d</p>
                    <Badge3 additionalClassNames="top-[175px]" />
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[200px] w-[739px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[20px] not-italic text-[#14181b] text-[12px] top-[208px] tracking-[0.012px] whitespace-nowrap">General</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[220px] not-italic text-[#515d66] text-[12px] top-[208px] whitespace-nowrap">11</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[276px] not-italic text-[#515d66] text-[12px] top-[208px] whitespace-nowrap">8.0d</p>
                    <div className="absolute bg-[#059669] left-[360px] rounded-[9999px] top-[205px]" data-name="Badge">
                      <div className="flex flex-row items-center justify-center size-full">
                        <Text1 text="LOW" />
                      </div>
                    </div>
                  </Wrapper2>
                  <Wrapper3 additionalClassNames="h-[240px]">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[20px] not-italic text-[#14181b] text-[14px] top-[18px] whitespace-nowrap">Rent Payment Activity</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[36px] whitespace-nowrap">Daily payments received — last 5 weeks</p>
                    <div className="absolute bg-[#ecfdf5] left-[20px] rounded-[4px] size-[22px] top-[58px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[46px] rounded-[4px] size-[22px] top-[58px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[72px] rounded-[4px] size-[22px] top-[58px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[98px] rounded-[4px] size-[22px] top-[58px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[124px] rounded-[4px] size-[22px] top-[58px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[150px] rounded-[4px] size-[22px] top-[58px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[176px] rounded-[4px] size-[22px] top-[58px]" data-name="Rectangle" />
                    <div className="absolute bg-[#ecfdf5] left-[20px] rounded-[4px] size-[22px] top-[84px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[46px] rounded-[4px] size-[22px] top-[84px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[72px] rounded-[4px] size-[22px] top-[84px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[98px] rounded-[4px] size-[22px] top-[84px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[124px] rounded-[4px] size-[22px] top-[84px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[150px] rounded-[4px] size-[22px] top-[84px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[176px] rounded-[4px] size-[22px] top-[84px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[20px] rounded-[4px] size-[22px] top-[110px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[46px] rounded-[4px] size-[22px] top-[110px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[72px] rounded-[4px] size-[22px] top-[110px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[98px] rounded-[4px] size-[22px] top-[110px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[124px] rounded-[4px] size-[22px] top-[110px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[150px] rounded-[4px] size-[22px] top-[110px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[176px] rounded-[4px] size-[22px] top-[110px]" data-name="Rectangle" />
                    <div className="absolute bg-[#ecfdf5] left-[20px] rounded-[4px] size-[22px] top-[136px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[46px] rounded-[4px] size-[22px] top-[136px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[72px] rounded-[4px] size-[22px] top-[136px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[98px] rounded-[4px] size-[22px] top-[136px]" data-name="Rectangle" />
                    <div className="absolute bg-[#ecfdf5] left-[124px] rounded-[4px] size-[22px] top-[136px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[150px] rounded-[4px] size-[22px] top-[136px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[176px] rounded-[4px] size-[22px] top-[136px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[20px] rounded-[4px] size-[22px] top-[162px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[46px] rounded-[4px] size-[22px] top-[162px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[72px] rounded-[4px] size-[22px] top-[162px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[98px] rounded-[4px] size-[22px] top-[162px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[124px] rounded-[4px] size-[22px] top-[162px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[150px] rounded-[4px] size-[22px] top-[162px]" data-name="Rectangle" />
                    <div className="absolute bg-[#f5f6f7] left-[176px] rounded-[4px] size-[22px] top-[162px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[28px] not-italic text-[#6b7684] text-[9px] top-[192px] whitespace-nowrap">M</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[54px] not-italic text-[#6b7684] text-[9px] top-[192px] whitespace-nowrap">T</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[80px] not-italic text-[#6b7684] text-[9px] top-[192px] whitespace-nowrap">W</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[106px] not-italic text-[#6b7684] text-[9px] top-[192px] whitespace-nowrap">T</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[132px] not-italic text-[#6b7684] text-[9px] top-[192px] whitespace-nowrap">F</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[158px] not-italic text-[#6b7684] text-[9px] top-[192px] whitespace-nowrap">S</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[184px] not-italic text-[#6b7684] text-[9px] top-[192px] whitespace-nowrap">S</p>
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[20px] not-italic text-[#6b7684] text-[9px] top-[211px] whitespace-nowrap">Less</p>
                    <div className="absolute bg-[#ecfdf5] left-[50px] rounded-[2px] size-[10px] top-[208px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[64px] rounded-[2px] size-[10px] top-[208px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[78px] rounded-[2px] size-[10px] top-[208px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[92px] rounded-[2px] size-[10px] top-[208px]" data-name="Rectangle" />
                    <div className="absolute bg-[#059669] left-[106px] rounded-[2px] size-[10px] top-[208px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[122px] not-italic text-[#6b7684] text-[9px] top-[211px] whitespace-nowrap">More</p>
                    <div className="absolute bg-[#e8eaed] h-px left-[20px] top-[228px] w-[349px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[236px] whitespace-nowrap">Avg daily receipts</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[333px] not-italic text-[#14181b] text-[12px] top-[236px] whitespace-nowrap">$4,760</p>
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[258px] w-[349px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[264px] whitespace-nowrap">Peak day</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[327px] not-italic text-[#14181b] text-[12px] top-[264px] whitespace-nowrap">Tuesday</p>
                    <div className="absolute bg-[#f5f6f7] h-px left-[20px] top-[286px] w-[349px]" data-name="Rectangle" />
                    <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-[20px] not-italic text-[#515d66] text-[12px] top-[292px] whitespace-nowrap">Collection rate</p>
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[339px] not-italic text-[#14181b] text-[12px] top-[292px] whitespace-nowrap">96.7%</p>
                  </Wrapper3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}