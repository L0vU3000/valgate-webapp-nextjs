import clsx from "clsx";
import svgPaths from "./svg-ppbp5p9tay";

function ListItem({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative">{children}</div>
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

function Container({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-[#f5f6f7] h-[44px] relative rounded-[12px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center pl-[12px] relative size-full">{children}</div>
      </div>
    </div>
  );
}
type Icon1Props = {
  additionalClassNames?: string;
};

function Icon1({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon1Props>) {
  return (
    <Wrapper additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper>
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
type TextText1Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText1({ text, additionalClassNames = "" }: TextText1Props) {
  return (
    <div className={clsx("h-[20px] relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[21px] left-0 not-italic text-[#515d66] text-[14px] top-0 whitespace-nowrap">{text}</p>
      </div>
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

export default function MainSuccession() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Main - Succession">
      <div className="bg-white h-full relative rounded-[8px] shrink-0 w-[280px]" data-name="Sidebar">
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
                        <Wrapper additionalClassNames="absolute left-[9px] top-[9px]">
                          <g clipPath="url(#clip0_1_15026)" id="Icon">
                            <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </g>
                          <defs>
                            <clipPath id="clip0_1_15026">
                              <rect fill="white" height="18" width="18" />
                            </clipPath>
                          </defs>
                        </Wrapper>
                        <div className="absolute bg-[#059669] left-[24px] rounded-[9999px] size-[8px] top-[24px]" data-name="Text" />
                      </div>
                    </div>
                    <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="Container">
                      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
                      <div className="content-stretch flex flex-col gap-[8px] items-start p-[12px] relative w-full">
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
                          <div className="relative shrink-0 size-[16px]" data-name="Icon">
                            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                              <g clipPath="url(#clip0_1_15029)" id="Icon">
                                <path d={svgPaths.p874e300} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M13.3333 2V4.66667" id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M14.6667 3.33333H12" id="Vector_3" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M2.66667 11.3333V12.6667" id="Vector_4" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M3.33333 12H2" id="Vector_5" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                              </g>
                              <defs>
                                <clipPath id="clip0_1_15029">
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
      <div className="flex-[1_0_0] h-full min-h-px min-w-px relative" data-name="succession-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
          <div className="relative shrink-0 w-[448px]" data-name="Container">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[24px] items-center relative w-full">
              <div className="bg-[#eef2f8] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[80px]" data-name="Container">
                <div className="relative shrink-0 size-[40px]" data-name="Icon">
                  <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
                    <g id="Icon">
                      <path d={svgPaths.pfcdd580} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.33333" />
                      <path d={svgPaths.p1517b200} id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.33333" />
                      <path d={svgPaths.p2a06b680} id="Vector_3" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.33333" />
                      <path d={svgPaths.p2e47c70} id="Vector_4" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.33333" />
                    </g>
                  </svg>
                </div>
              </div>
              <div className="bg-[#eef2f8] h-[28px] relative rounded-[9999px] shrink-0 w-[79.688px]" data-name="Container">
                <div className="absolute left-[12px] size-[14px] top-[7px]" data-name="Icon">
                  <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                    <g id="Icon">
                      <path d={svgPaths.p29efa600} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                      <path d={svgPaths.p3042bc80} id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                    </g>
                  </svg>
                </div>
                <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[17px] left-[51.5px] not-italic text-[#2563eb] text-[14px] text-center top-[4px] whitespace-nowrap">Soon</p>
              </div>
              <div className="content-stretch flex h-[36px] items-start relative shrink-0 w-full" data-name="section-title">
                <p className="flex-[1_0_0] font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] min-h-px min-w-px relative text-[#14181b] text-[30px] text-center">Succession Planning</p>
              </div>
              <div className="h-[104px] relative shrink-0 w-full" data-name="body-text">
                <p className="-translate-x-1/2 absolute font-['Inter:Regular',sans-serif] font-normal leading-[24px] left-[224.27px] not-italic text-[#515d66] text-[16px] text-center top-0 w-[385px]">Plan and organize property transfers, heirs, and legal documentation for a smooth succession. Ensure your property portfolio is properly structured for the next generation.</p>
              </div>
              <div className="content-stretch flex gap-[12px] h-[36px] items-start relative shrink-0 w-full" data-name="Container">
                <div className="bg-[#e8eaed] flex-[1_0_0] h-[36px] min-h-px min-w-px relative rounded-[8px]" data-name="Input">
                  <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center px-[12px] py-[4px] relative size-full">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] not-italic relative shrink-0 text-[#6b7684] text-[14px] whitespace-nowrap">Enter your email</p>
                    </div>
                  </div>
                  <div aria-hidden="true" className="absolute border border-[#14181b] border-solid inset-0 pointer-events-none rounded-[8px]" />
                </div>
                <div className="bg-[#2563eb] h-[36px] relative rounded-[8px] shrink-0 w-[109.578px]" data-name="Button">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[16px] py-[8px] relative size-full">
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">Get notified</p>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[16px] h-[304px] items-start relative shrink-0 w-full" data-name="Container">
                <div className="h-[20px] relative shrink-0 w-full" data-name="subsection-title">
                  <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[19px] left-[224.55px] not-italic text-[#14181b] text-[14px] text-center top-0 whitespace-nowrap">Coming Features</p>
                </div>
                <div className="content-stretch flex flex-col gap-[12px] h-[268px] items-start relative shrink-0 w-full" data-name="Container">
                  <Container>
                    <div className="bg-[#2563eb] rounded-[9999px] shrink-0 size-[6px]" data-name="Container" />
                    <TextText1 text="Organize heirs and beneficiaries" additionalClassNames="w-[207.297px]" />
                  </Container>
                  <Container>
                    <div className="bg-[#2563eb] rounded-[9999px] shrink-0 size-[6px]" data-name="Container" />
                    <TextText1 text="Structure ownership transfers" additionalClassNames="w-[192.063px]" />
                  </Container>
                  <Container>
                    <div className="bg-[#2563eb] rounded-[9999px] shrink-0 size-[6px]" data-name="Container" />
                    <TextText1 text="Store legal succession documents" additionalClassNames="w-[220.719px]" />
                  </Container>
                  <Container>
                    <div className="bg-[#2563eb] rounded-[9999px] shrink-0 size-[6px]" data-name="Container" />
                    <TextText1 text="Track inheritance tax obligations" additionalClassNames="w-[209.25px]" />
                  </Container>
                  <Container>
                    <div className="bg-[#2563eb] rounded-[9999px] shrink-0 size-[6px]" data-name="Container" />
                    <TextText1 text="Generate succession reports" additionalClassNames="w-[185.75px]" />
                  </Container>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}