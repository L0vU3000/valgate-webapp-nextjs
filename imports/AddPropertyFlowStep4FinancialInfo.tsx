import clsx from "clsx";
import svgPaths from "./svg-9sqglb27fo";

function NavigationMenuContent({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0 w-full">
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)]" />
      <div className="content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full">{children}</div>
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
    <div className="flex flex-row items-center justify-center size-full">
      <div className="content-stretch flex items-center justify-center px-[16px] py-[8px] relative">{children}</div>
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

function Helper() {
  return (
    <div className="h-0 relative shrink-0 w-full">
      <div className="absolute inset-[-1px_0_0_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 394.67 1">
          <line id="Line 3" stroke="var(--stroke-0, #D1D5DB)" x2="394.67" y1="0.5" y2="0.5" />
        </svg>
      </div>
    </div>
  );
}
type InputWithButton1Props = {
  text: string;
  text1: string;
};

function InputWithButton1({ text, text1 }: InputWithButton1Props) {
  return (
    <div className="content-stretch flex font-['Inter:Medium',sans-serif] font-medium h-[20px] items-start justify-between leading-[17px] not-italic relative shrink-0 text-[14px] w-[394.67px] whitespace-nowrap">
      <p className="relative shrink-0 text-[#515d66]">{text}</p>
      <p className="relative shrink-0 text-[#059669]">{text1}</p>
    </div>
  );
}
type InputWithButtonProps = {
  text: string;
  text1: string;
};

function InputWithButton({ text, text1 }: InputWithButtonProps) {
  return (
    <div className="content-stretch flex h-[20px] items-start justify-between not-italic relative shrink-0 text-[14px] w-[394.67px] whitespace-nowrap">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] relative shrink-0 text-[#515d66]">{text}</p>
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[19px] relative shrink-0 text-[#14181b]">{text1}</p>
    </div>
  );
}
type RadioButtonTextProps = {
  text: string;
};

function RadioButtonText({ text }: RadioButtonTextProps) {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <Wrapper1>
        <circle cx="8" cy="8" fill="var(--fill-0, white)" id="Ellipse 4" r="7.5" stroke="var(--stroke-0, #E8EAED)" />
      </Wrapper1>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type FieldProps = {
  additionalClassNames?: string;
};

function Field({ additionalClassNames = "" }: FieldProps) {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0 w-full">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-[-1px] pointer-events-none rounded-[7px]" />
      <div className="flex flex-row items-center size-full">
        <Text1 text="100%" additionalClassNames="pl-[12px] pr-[16px] py-[8px]" />
      </div>
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
      <Wrapper2>
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
      </Wrapper2>
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
type Text3Props = {
  text: string;
  additionalClassNames?: string;
};

function Text3({ text, additionalClassNames = "" }: Text3Props) {
  return (
    <div className={additionalClassNames}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text2Props = {
  text: string;
  additionalClassNames?: string;
};

function Text2({ text, additionalClassNames = "" }: Text2Props) {
  return <Text3 text={text} additionalClassNames={clsx("bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex relative", additionalClassNames)} />;
}
type Text1Props = {
  text: string;
  additionalClassNames?: string;
};

function Text1({ text, additionalClassNames = "" }: Text1Props) {
  return <Text3 text={text} additionalClassNames={clsx("content-stretch flex items-center relative w-full", additionalClassNames)} />;
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

export default function AddPropertyFlowStep4FinancialInfo() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Add Property Flow - Step 4: Financial Info">
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
                      <Text2 text="Valgate" additionalClassNames="items-center justify-center" />
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
                      <Text1 text="Jon Doe" additionalClassNames="overflow-clip shrink-0" />
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
                          <g clipPath="url(#clip0_1_15187)" id="Icon">
                            <path d={svgPaths.p32db8200} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </g>
                          <defs>
                            <clipPath id="clip0_1_15187">
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
                            <Text2 text="Valgate Intelligence" additionalClassNames="items-start size-full" />
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
      <div className="bg-[#f5f6f7] relative shrink-0 w-[1160px]" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center overflow-clip pb-[24px] relative rounded-[inherit] w-full">
          <div className="relative shrink-0 w-full" data-name="page-heading">
            <div className="flex flex-row items-center size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-[12px] pt-[32px] px-[32px] relative w-full">
                <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#6b7684] text-[30px] whitespace-nowrap">Add New Property</p>
                <ButtonText text="Save as Draft" />
              </div>
            </div>
          </div>
          <div className="max-w-[1160px] relative shrink-0 w-full" data-name="step-indicator">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start max-w-[inherit] p-[32px] relative w-full">
              <div className="h-[16px] relative shrink-0 w-[1096px]" data-name="progress">
                <div className="absolute bg-[#e8eaed] inset-0 rounded-[16px]" data-name="area" />
                <div className="absolute bg-[#2563eb] bottom-0 left-0 right-1/2 rounded-[16px] top-0" data-name="progress" />
              </div>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#2563eb] text-[16px] whitespace-nowrap">Step 3 of 6: Financial Information</p>
            </div>
          </div>
          <div className="max-w-[1160px] relative shrink-0 w-full" data-name="Container">
            <div className="flex flex-col items-center max-w-[inherit] size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[24px] items-center max-w-[inherit] p-[32px] relative w-full">
                <div className="content-stretch flex gap-[8px] h-[20px] items-center relative shrink-0 w-full" data-name="Button">
                  <div className="h-[18px] relative shrink-0 w-[9px]" data-name="Icon">
                    <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 18">
                      <g id="Icon">
                        <path d="M7 14L2 9L7 4" id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </g>
                    </svg>
                  </div>
                  <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="Text">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative w-full">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[16px] text-center whitespace-nowrap">Back to Portfolio</p>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
                  <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="section-title">
                    <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#14181b] text-[30px] whitespace-nowrap">Financial Information</p>
                  </div>
                  <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="body-text">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">Enter purchase details and ongoing expenses</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative shrink-0 w-full" data-name="form-footer">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[24px] items-start px-[32px] relative w-full">
              <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-[629.33px]" data-name="form-panel">
                <div className="bg-white relative rounded-[6px] shrink-0 w-full" data-name="popover">
                  <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)]" />
                  <div className="content-stretch flex flex-col gap-[24px] items-start p-[16px] relative w-full">
                    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="form-section">
                      <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal items-start leading-[24px] not-italic relative shrink-0 text-[16px]" data-name="form-row">
                        <p className="relative shrink-0 text-[#14181b] whitespace-nowrap">Purchase Information</p>
                        <p className="relative shrink-0 text-[#acb4bc] w-[286px]">Set the dimensions for the layer.</p>
                      </div>
                      <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="form-row">
                        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start min-h-px min-w-px relative" data-name="input">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Purchase Price</p>
                          <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                            <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                              <Field />
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start min-h-px min-w-px relative" data-name="input">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Purchase Date</p>
                          <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                            <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                              <Field />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="input">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Current Market Value (Optional)</p>
                        <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                          <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                            <Field />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="form-section">
                      <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal items-start leading-[24px] not-italic relative shrink-0 text-[16px]" data-name="section-header">
                        <p className="relative shrink-0 text-[#14181b] whitespace-nowrap">{`Ownership & Financing`}</p>
                        <p className="relative shrink-0 text-[#acb4bc] w-[286px]">Set the dimensions for the layer.</p>
                      </div>
                      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="field-group">
                        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="field-stack">
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Ownership Status</p>
                          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="radio group">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="radio button">
                              <Wrapper1>
                                <g id="Group 6">
                                  <circle cx="8" cy="8" fill="var(--fill-0, white)" id="Ellipse 4" r="7.5" stroke="var(--stroke-0, #E8EAED)" />
                                  <circle cx="8" cy="8" fill="var(--fill-0, #2563EB)" id="Ellipse 5" r="4" />
                                </g>
                              </Wrapper1>
                              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">Fully owned (No Morgage)</p>
                            </div>
                            <RadioButtonText text="Financed (Morgage/Loan" />
                            <RadioButtonText text="Leased" />
                            <RadioButtonText text="Other" />
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex gap-[16px] items-start relative shrink-0 w-full" data-name="form-row">
                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="field-col">
                          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="input">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Outstanding Mortgage</p>
                            <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                                <Field />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="field-col">
                          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="input">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Monthly Payment</p>
                            <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                                <Field />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="form-section">
                      <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal items-start leading-[24px] not-italic relative shrink-0 text-[16px]" data-name="section-header">
                        <p className="relative shrink-0 text-[#14181b] whitespace-nowrap">{`Property Taxes & Insurance`}</p>
                        <p className="relative shrink-0 text-[#acb4bc] w-[286px]">Set the dimensions for the layer.</p>
                      </div>
                      <div className="content-stretch flex gap-[16px] items-start relative shrink-0 w-full" data-name="field-columns">
                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="field-col">
                          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="input">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Annual Property Tax</p>
                            <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                                <Field />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="field-col">
                          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="input">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Tax Assessment Value</p>
                            <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                                <Field />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-[595.33px]" data-name="input">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Annual Insurance Premium</p>
                        <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="input/with button">
                          <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px relative" data-name="default">
                            <Field />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[442.67px]" data-name="info-sidebar">
                <NavigationMenuContent>
                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="panel-header">
                    <div className="h-[24px] relative shrink-0 w-[16px]" data-name="lucide/dollar-sign">
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 24">
                        <g id="lucide/dollar-sign">
                          <rect fill="white" height="24" width="16" />
                          <path d={svgPaths.pb21aae0} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </g>
                      </svg>
                    </div>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Financial Summary</p>
                  </div>
                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="summary-list">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="form-row">
                      <InputWithButton text="Purchase Price" text1="$250,000" />
                    </div>
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="summary-row">
                      <InputWithButton text="Outstanding mortgage" text1="$180,000" />
                    </div>
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="summary-item">
                      <InputWithButton1 text="Current Equity" text1="$70,000" />
                    </div>
                    <Helper />
                  </div>
                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="expense-list">
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">Monthly Expenses</p>
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="form-row">
                      <InputWithButton text="Mortgage" text1="$250,000" />
                    </div>
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="summary-row">
                      <InputWithButton text="Tax (monthly)" text1="$180,000" />
                    </div>
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="summary-item">
                      <InputWithButton1 text="Insurance" text1="$70,000" />
                    </div>
                    <Helper />
                  </div>
                  <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="summary-item">
                    <InputWithButton1 text="Total" text1="$70,000" />
                  </div>
                </NavigationMenuContent>
                <NavigationMenuContent>
                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="summary-item">
                    <div className="relative shrink-0 size-[24px]" data-name="lucide/info">
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <g id="lucide/info">
                          <rect fill="white" height="24" width="24" />
                          <path d={svgPaths.p33cad000} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </g>
                      </svg>
                    </div>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#14181b] text-[16px] whitespace-nowrap">Financial Tips</p>
                  </div>
                  <ul className="block font-['Inter:Regular',sans-serif] font-normal leading-[0] list-disc not-italic relative shrink-0 text-[#515d66] text-[14px] whitespace-nowrap">
                    <li className="mb-0 ms-[21px]">
                      <span className="leading-[21px]">Use a memorable property name</span>
                    </li>
                    <li className="mb-0 ms-[21px]">
                      <span className="leading-[21px]">Double-check address for accuracy</span>
                    </li>
                    <li className="mb-0 ms-[21px]">
                      <span className="leading-[21px]">Year built affects tax calculations</span>
                    </li>
                    <li className="ms-[21px]">
                      <span className="leading-[21px]">Leave optional fields blank if not</span>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </div>
            </div>
          </div>
          <div className="bg-white h-[73px] max-w-[1160px] relative shrink-0 w-[1160px]" data-name="action-bar">
            <div aria-hidden="true" className="absolute border-[#e8eaed] border-solid border-t-2 inset-0 pointer-events-none" />
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[32px] relative size-full">
              <ButtonText text="Save as Draft" />
              <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="button-group">
                <ButtonText text="Go Back" />
                <div className="bg-[#2563eb] relative rounded-[6px] shrink-0" data-name="button">
                  <Wrapper2>
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Continue</p>
                  </Wrapper2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}