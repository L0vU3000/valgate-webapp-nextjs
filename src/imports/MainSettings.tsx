import clsx from "clsx";
import svgPaths from "./svg-22df8xxbpx";

function TabButton({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-[#14181b] h-[18.391px] relative rounded-[9999px] shrink-0 w-[32px]">
      <div aria-hidden="true" className="absolute border border-[#14181b] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center pl-[17px] pr-px py-px relative size-full">{children}</div>
    </div>
  );
}
type ContainerProps = {
  additionalClassNames?: string;
};

function Container({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerProps>) {
  return (
    <div className={clsx("h-[36px] relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[2px] items-start relative size-full">{children}</div>
    </div>
  );
}
type SectionProps = {
  additionalClassNames?: string;
};

function Section({ children, additionalClassNames = "" }: React.PropsWithChildren<SectionProps>) {
  return (
    <div className={clsx("bg-white relative rounded-[16px] shrink-0 w-full", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start pb-[2px] pt-[24px] px-[24px] relative size-full">{children}</div>
    </div>
  );
}
type Icon2Props = {
  additionalClassNames?: string;
};

function Icon2({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon2Props>) {
  return (
    <div className={clsx("size-[16px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
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

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[25px] left-0 not-italic text-[#14181b] text-[18px] top-0 whitespace-nowrap">{children}</p>
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

function Wrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}
type ButtonTextProps = {
  text: string;
  additionalClassNames?: string;
};

function ButtonText({ text, additionalClassNames = "" }: ButtonTextProps) {
  return (
    <div className={clsx("absolute bg-white content-stretch flex h-[36px] items-center justify-center left-0 px-[17px] py-[9px] rounded-[8px]", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border border-[#14181b] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type InputTextProps = {
  text: string;
};

function InputText({ text }: InputTextProps) {
  return (
    <div className="bg-[#e8eaed] h-[36px] relative rounded-[8px] shrink-0 w-full">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center px-[12px] py-[4px] relative size-full">
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#14181b] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}
type Text2Props = {
  text: string;
};

function Text2({ text }: Text2Props) {
  return (
    <div className="absolute content-stretch flex h-[14px] items-center left-0 top-0 w-[718px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type PrimitiveLabelTextProps = {
  text: string;
};

function PrimitiveLabelText({ text }: PrimitiveLabelTextProps) {
  return (
    <div className="content-stretch flex h-[14px] items-center relative shrink-0 w-full">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type SubsectionTitleTextProps = {
  text: string;
  additionalClassNames?: string;
};

function SubsectionTitleText({ text, additionalClassNames = "" }: SubsectionTitleTextProps) {
  return (
    <div className={clsx("h-[28px] relative shrink-0", additionalClassNames)}>
      <Wrapper2>{text}</Wrapper2>
    </div>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text }: Text1Props) {
  return (
    <div className="absolute h-[20px] left-0 top-[20px] w-[718px]">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#515d66] text-[14px] top-0 whitespace-nowrap">{text}</p>
    </div>
  );
}
type BodyTextTextProps = {
  text: string;
};

function BodyTextText({ text }: BodyTextTextProps) {
  return (
    <div className="h-[20px] relative shrink-0 w-full">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#515d66] text-[14px] top-0 whitespace-nowrap">{text}</p>
    </div>
  );
}

function Icon() {
  return (
    <Wrapper>
      <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </Wrapper>
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

export default function MainSettings() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Main - Settings">
      <div className="bg-white relative rounded-[8px] self-stretch shrink-0 w-[280px]" data-name="Sidebar">
        <div className="overflow-clip rounded-[inherit] size-full">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
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
                            <Wrapper>
                              <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Wrapper>
                            <TextText text="Home" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Wrapper>
                              <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Wrapper>
                            <TextText text="Portfolio" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Wrapper>
                              <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Wrapper>
                            <TextText text="Map" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Wrapper>
                              <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Wrapper>
                            <TextText text="Analytics" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon />
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
                              <Wrapper>
                                <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              </Wrapper>
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
                          <g clipPath="url(#clip0_1_15187)" id="Icon">
                            <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </g>
                          <defs>
                            <clipPath id="clip0_1_15187">
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
                          <Icon2 additionalClassNames="relative shrink-0">
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
                          </Icon2>
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
      <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="settings-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center overflow-clip py-[24px] relative rounded-[inherit] w-full">
          <div className="content-stretch flex flex-col gap-[32px] h-[1532px] items-start relative shrink-0 w-[768px]" data-name="Container">
            <div className="content-stretch flex flex-col gap-[4px] h-[56px] items-start relative shrink-0 w-full" data-name="Container">
              <div className="h-[32px] relative shrink-0 w-full" data-name="section-title">
                <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[33px] left-0 not-italic text-[#14181b] text-[24px] top-0 whitespace-nowrap">Settings</p>
              </div>
              <BodyTextText text="Manage your account and workspace preferences" />
            </div>
            <div className="content-stretch flex flex-col gap-[24px] h-[1444px] items-start relative shrink-0 w-full" data-name="Container">
              <Section additionalClassNames="h-[282px]">
                <div className="content-stretch flex gap-[8px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
                  <Wrapper>
                    <path d={svgPaths.p2026e800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p32ab0300} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </Wrapper>
                  <SubsectionTitleText text="Profile" additionalClassNames="w-[54.469px]" />
                </div>
                <div className="h-[180px] relative shrink-0 w-full" data-name="Container">
                  <div className="absolute content-stretch flex flex-col gap-[8px] h-[56px] items-start left-0 top-0 w-[718px]" data-name="Container">
                    <PrimitiveLabelText text="Full Name" />
                    <InputText text="Jon Doe" />
                  </div>
                  <div className="absolute content-stretch flex flex-col gap-[8px] h-[56px] items-start left-0 top-[72px] w-[718px]" data-name="Container">
                    <PrimitiveLabelText text="Email" />
                    <InputText text="jon.doe@example.com" />
                  </div>
                  <div className="absolute bg-[#2563eb] h-[36px] left-0 rounded-[8px] top-[144px] w-[125.594px]" data-name="Button">
                    <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[63px] not-italic text-[14px] text-center text-white top-[8px] whitespace-nowrap">Save Changes</p>
                  </div>
                </div>
              </Section>
              <Section additionalClassNames="h-[258px]">
                <div className="content-stretch flex gap-[8px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
                  <Icon />
                  <SubsectionTitleText text="Workspace" additionalClassNames="w-[93.969px]" />
                </div>
                <div className="content-stretch flex flex-col gap-[16px] h-[156px] items-start relative shrink-0 w-full" data-name="Container">
                  <div className="content-stretch flex flex-col gap-[8px] h-[56px] items-start relative shrink-0 w-full" data-name="Container">
                    <PrimitiveLabelText text="Workspace Name" />
                    <InputText text="KLYP estate" />
                  </div>
                  <div className="h-[84px] relative shrink-0 w-full" data-name="Container">
                    <Text2 text="Members" />
                    <div className="absolute h-[20px] left-0 top-[20px] w-[718px]" data-name="body-text">
                      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#515d66] text-[14px] top-0 w-[189px]">3 members in this workspace</p>
                    </div>
                    <ButtonText text="Manage Members" additionalClassNames="top-[48px] w-[151.984px]" />
                  </div>
                </div>
              </Section>
              <Section additionalClassNames="h-[229px]">
                <div className="content-stretch flex gap-[8px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
                  <Wrapper>
                    <path d={svgPaths.p25fc4100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </Wrapper>
                  <SubsectionTitleText text="Security" additionalClassNames="w-[70.141px]" />
                </div>
                <div className="content-stretch flex flex-col gap-[16px] h-[127px] items-start relative shrink-0 w-full" data-name="Container">
                  <div className="h-[58px] relative shrink-0 w-full" data-name="Container">
                    <Text2 text="Change Password" />
                    <ButtonText text="Update Password" additionalClassNames="top-[22px] w-[149.641px]" />
                  </div>
                  <div className="bg-[#14181b] h-px shrink-0 w-full" data-name="tab-nav" />
                  <div className="content-stretch flex h-[36px] items-center justify-between relative shrink-0 w-full" data-name="Container">
                    <Container additionalClassNames="w-[188.297px]">
                      <PrimitiveLabelText text="Two-Factor Authentication" />
                      <BodyTextText text="Add an extra layer of security" />
                    </Container>
                    <div className="bg-[#e8eaed] h-[18.391px] relative rounded-[9999px] shrink-0 w-[32px]" data-name="tab-button">
                      <div aria-hidden="true" className="absolute border border-[#14181b] border-solid inset-0 pointer-events-none rounded-[9999px]" />
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center p-px relative size-full">
                        <div className="bg-white rounded-[9999px] shrink-0 size-[16px]" data-name="Primitive.span" />
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
              <Section additionalClassNames="h-[276px]">
                <div className="content-stretch flex gap-[8px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
                  <Wrapper>
                    <path d={svgPaths.p1c3efea0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p25877f40} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </Wrapper>
                  <SubsectionTitleText text="Notifications" additionalClassNames="w-[107.281px]" />
                </div>
                <div className="content-stretch flex flex-col gap-[16px] h-[174px] items-start relative shrink-0 w-full" data-name="Container">
                  <div className="content-stretch flex h-[36px] items-center justify-between relative shrink-0 w-full" data-name="Container">
                    <Container additionalClassNames="w-[274.703px]">
                      <PrimitiveLabelText text="Tax Reminders" />
                      <BodyTextText text="Get notified about upcoming tax payments" />
                    </Container>
                    <TabButton>
                      <div className="bg-white rounded-[9999px] shrink-0 size-[16px]" data-name="Primitive.span" />
                    </TabButton>
                  </div>
                  <div className="bg-[#14181b] h-px shrink-0 w-full" data-name="tab-nav" />
                  <div className="content-stretch flex h-[36px] items-center justify-between relative shrink-0 w-full" data-name="Container">
                    <Container additionalClassNames="w-[230.172px]">
                      <PrimitiveLabelText text="Valuation Updates" />
                      <BodyTextText text="Receive property valuation changes" />
                    </Container>
                    <TabButton>
                      <div className="bg-white rounded-[9999px] shrink-0 size-[16px]" data-name="Primitive.span" />
                    </TabButton>
                  </div>
                  <div className="bg-[#14181b] h-px shrink-0 w-full" data-name="tab-nav" />
                  <div className="content-stretch flex h-[36px] items-center justify-between relative shrink-0 w-full" data-name="Container">
                    <Container additionalClassNames="w-[195.969px]">
                      <PrimitiveLabelText text="System Alerts" />
                      <BodyTextText text="Important system notifications" />
                    </Container>
                    <TabButton>
                      <div className="bg-white rounded-[9999px] shrink-0 size-[16px]" data-name="Primitive.span" />
                    </TabButton>
                  </div>
                </div>
              </Section>
              <Section additionalClassNames="h-[303px]">
                <div className="content-stretch flex gap-[8px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
                  <Wrapper>
                    <path d={svgPaths.p2e7662c0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.pbd81000} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p2a44e700} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </Wrapper>
                  <div className="h-[28px] relative shrink-0 w-[122.641px]" data-name="subsection-title">
                    <Wrapper2>{`Data & Privacy`}</Wrapper2>
                  </div>
                </div>
                <div className="content-stretch flex flex-col gap-[16px] h-[201px] items-start relative shrink-0 w-full" data-name="Container">
                  <div className="h-[84px] relative shrink-0 w-full" data-name="Container">
                    <Text2 text="Export Data" />
                    <Text1 text="Download all your property data" />
                    <ButtonText text="Export Portfolio Data" additionalClassNames="top-[48px] w-[171.656px]" />
                  </div>
                  <div className="bg-[#14181b] h-px shrink-0 w-full" data-name="tab-nav" />
                  <div className="h-[84px] relative shrink-0 w-full" data-name="Container">
                    <div className="absolute content-stretch flex h-[14px] items-center left-0 top-0 w-[718px]" data-name="Primitive.label">
                      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#e11d48] text-[14px] whitespace-nowrap">Delete Account</p>
                    </div>
                    <Text1 text="Permanently delete your account and all data" />
                    <div className="absolute bg-[#e11d48] h-[36px] left-0 rounded-[8px] top-[48px] w-[149.078px]" data-name="Button">
                      <Icon2 additionalClassNames="absolute left-[12px] top-[10px]">
                        <g id="Icon">
                          <path d="M2 4H14" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d={svgPaths.p64eb800} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d={svgPaths.p56ef700} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M6.66667 7.33333V11.3333" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          <path d="M9.33333 7.33333V11.3333" id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </g>
                      </Icon2>
                      <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[87.5px] not-italic text-[14px] text-center text-white top-[8px] whitespace-nowrap">Delete Account</p>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}