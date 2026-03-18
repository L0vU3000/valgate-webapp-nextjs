import clsx from "clsx";
import svgPaths from "./svg-ailyf88uhq";

function Wrapper2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 w-full">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[24px] items-start px-[32px] relative w-full">{children}</div>
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

function Wrapper1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-row items-center justify-center size-full">
      <div className="content-stretch flex items-center justify-center px-[16px] py-[8px] relative">{children}</div>
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

function Button({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white h-[72px] relative rounded-[12px] shrink-0 w-full">
      <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[8px] relative size-full">{children}</div>
      </div>
    </div>
  );
}

function NavigationMenuContent({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0 w-full">
      <div aria-hidden="true" className="absolute border border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)]" />
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[8px] items-center px-[24px] py-[40px] relative w-full">{children}</div>
      </div>
    </div>
  );
}
type Icon3Props = {
  additionalClassNames?: string;
};

function Icon3({ children, additionalClassNames = "" }: React.PropsWithChildren<Icon3Props>) {
  return (
    <Wrapper additionalClassNames={additionalClassNames}>
      <g id="Icon">{children}</g>
    </Wrapper>
  );
}

function Icon2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}
type FileNameRowProps = {
  additionalClassNames?: string;
};

function FileNameRow({ additionalClassNames = "" }: FileNameRowProps) {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] relative shrink-0">
      <Text4 text="123.jpg" additionalClassNames="flex-col items-start justify-center" />
      <div className="h-[29px] relative shrink-0 w-[28px]">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 29">
          <g id="lucide/x">
            <rect fill="white" height="29" width="28" />
            <path d={svgPaths.p228ea760} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}
type FieldColProps = {
  text: string;
  text1: string;
};

function FieldCol({ text, text1 }: FieldColProps) {
  return (
    <div className="content-stretch flex flex-col font-['Inter:Medium',sans-serif] font-medium gap-[4px] items-start justify-center not-italic relative shrink-0">
      <p className="leading-[17px] relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
      <p className="leading-[14px] relative shrink-0 text-[#6b7684] text-[12px] tracking-[0.012px] w-[227px]">{text1}</p>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[27px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 27 27">
        <g id="Icon">
          <path d={svgPaths.p2b644500} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p3935ad00} id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
        </g>
      </svg>
    </div>
  );
}

function Helper() {
  return (
    <div className="h-0 relative shrink-0 w-full">
      <div className="absolute inset-[-1px_0_0_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1096 1">
          <line id="Line 4" stroke="var(--stroke-0, #6B7684)" x2="1096" y1="0.5" y2="0.5" />
        </svg>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[32px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="Icon">
          <path d={svgPaths.p3b698600} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p2e828300} id="Vector_2" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
        </g>
      </svg>
    </div>
  );
}
type ButtonText1Props = {
  text: string;
};

function ButtonText1({ text }: ButtonText1Props) {
  return (
    <div className="bg-[#2563eb] relative rounded-[6px] shrink-0">
      <Wrapper1>
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">{text}</p>
      </Wrapper1>
    </div>
  );
}
type FieldColTextProps = {
  text: string;
};

function FieldColText({ text }: FieldColTextProps) {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center not-italic relative shrink-0 text-[14px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] relative shrink-0 text-[#14181b] whitespace-nowrap">{`Drag & Drop Photos Here`}</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[21px] relative shrink-0 text-[#6b7684] text-center w-[227px]">{text}</p>
    </div>
  );
}

function LucideImage() {
  return (
    <div className="relative shrink-0 size-[56px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
        <g id="lucide/image">
          <rect fill="white" height="56" width="56" />
          <path d={svgPaths.pe6a2970} id="Vector" stroke="var(--stroke-0, #14181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
type Text4Props = {
  text: string;
  additionalClassNames?: string;
};

function Text4({ text, additionalClassNames = "" }: Text4Props) {
  return (
    <div className={clsx("content-stretch flex relative shrink-0", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">{text}</p>
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
      <Wrapper1>
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[17px] not-italic relative shrink-0 text-[#14181b] text-[14px] whitespace-nowrap">{text}</p>
      </Wrapper1>
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
  return <Text3 text={text} additionalClassNames={clsx("content-stretch flex relative shrink-0", additionalClassNames)} />;
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

export default function AddPropertyFlowStep5PhotosDocs() {
  return (
    <div className="bg-white content-stretch flex items-start relative size-full" data-name="Add Property Flow - Step 5: Photos & Docs">
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
                      <Text1 text="Jon Doe" additionalClassNames="items-center overflow-clip w-full" />
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
                            <Icon2>
                              <path d={svgPaths.p275d2400} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p21a7e80} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon2>
                            <TextText text="Home" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon2>
                              <path d={svgPaths.p17c65ff0} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p1aa35900} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p2b6cafc0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p3fc7e680} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon2>
                            <TextText text="Portfolio" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon2>
                              <path d={svgPaths.p3be00900} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M12.5 4.80333V17.3033" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M7.5 2.69667V15.1967" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon2>
                            <TextText text="Map" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon2>
                              <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon2>
                            <TextText text="Analytics" />
                          </div>
                        </ListItem>
                        <ListItem>
                          <div className="content-stretch flex gap-[12px] h-[44px] items-center px-[12px] relative rounded-[8px] shrink-0 w-[255px]" data-name="Button">
                            <Icon2>
                              <path d={svgPaths.p25397b80} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p2c4f400} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p2241fff0} id="Vector_3" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.pae3c380} id="Vector_4" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </Icon2>
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
                              <Icon2>
                                <path d={svgPaths.ped54800} id="Vector" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.p3b27f100} id="Vector_2" stroke="var(--stroke-0, #515D66)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              </Icon2>
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
                          <div className="relative shrink-0 size-[16px]" data-name="Icon">
                            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
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
                            </svg>
                          </div>
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
      <div className="bg-white relative shrink-0 w-[1160px]" data-name="property-detail-page">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center overflow-clip pb-[32px] relative rounded-[inherit] w-full">
          <div className="relative shrink-0 w-full" data-name="page-heading">
            <div className="flex flex-row items-center size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-[12px] pt-[32px] px-[32px] relative w-full">
                <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#6b7684] text-[30px] whitespace-nowrap">Add New Property</p>
                <ButtonText text="Save as Draft" />
              </div>
            </div>
          </div>
          <div className="relative shrink-0 w-full" data-name="media-section">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
              <div className="max-w-[1160px] relative shrink-0 w-full" data-name="progress-bar">
                <div className="content-stretch flex flex-col gap-[8px] items-start max-w-[inherit] px-[32px] py-[24px] relative w-full">
                  <div className="h-[16px] relative shrink-0 w-full" data-name="progress">
                    <div className="absolute bg-[#e8eaed] inset-0 rounded-[16px]" data-name="area" />
                    <div className="absolute bg-[#2563eb] inset-[0_33.33%_0_0] rounded-[16px]" data-name="progress" />
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#2563eb] text-[16px] whitespace-nowrap">{`Step 4 of 6: Photos & Documents`}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-[1160px] relative shrink-0 w-full" data-name="Container">
            <div className="flex flex-col items-center max-w-[inherit] size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[24px] items-center max-w-[inherit] px-[32px] py-[24px] relative w-full">
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
                    <p className="font-['Plus_Jakarta_Sans:SemiBold',sans-serif] font-semibold leading-[36px] relative shrink-0 text-[#14181b] text-[30px] whitespace-nowrap">{`Photos & Documents`}</p>
                  </div>
                  <Text4 text="Upload images and important documents for your property" additionalClassNames="items-center w-full" />
                </div>
              </div>
            </div>
          </div>
          <Wrapper2>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[25px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">Property Photos</p>
            <Helper />
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">Upload photos to help with identification and documentation</p>
            <NavigationMenuContent>
              <div className="bg-white content-stretch flex flex-col gap-[8px] items-center p-[12px] relative rounded-[6px] shrink-0" data-name="navigation menu content item">
                <LucideImage />
                <FieldColText text="or" />
              </div>
              <ButtonText1 text="Browse Files" />
            </NavigationMenuContent>
            <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="upload-grid">
              <div className="bg-white content-stretch flex flex-col gap-[12px] items-center justify-center p-[24px] relative rounded-[12px] shrink-0 size-[162.67px]" data-name="Button">
                <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                  <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[64px]" data-name="Container">
                    <Icon />
                  </div>
                </div>
                <Text1 text="123.jpg" additionalClassNames="flex-col items-start justify-center" />
              </div>
              <div className="bg-white content-stretch flex flex-col gap-[12px] items-center justify-center p-[24px] relative rounded-[12px] shrink-0 size-[162.67px]" data-name="Button">
                <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                  <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[64px]" data-name="Container">
                    <Icon />
                  </div>
                </div>
                <Text1 text="123.jpg" additionalClassNames="flex-col items-start justify-center" />
              </div>
              <div className="bg-white content-stretch flex flex-col gap-[12px] items-center justify-center p-[24px] relative rounded-[12px] shrink-0 size-[162.67px]" data-name="Button">
                <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                  <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[64px]" data-name="Container">
                    <Icon />
                  </div>
                </div>
                <Text1 text="123.jpg" additionalClassNames="flex-col items-start justify-center" />
              </div>
              <div className="bg-white content-stretch flex flex-col gap-[12px] items-center justify-center p-[24px] relative rounded-[12px] shrink-0 size-[162.67px]" data-name="Button">
                <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                  <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[64px]" data-name="Container">
                    <Icon />
                  </div>
                </div>
                <Text1 text="123.jpg" additionalClassNames="flex-col items-start justify-center" />
              </div>
              <div className="bg-white content-stretch flex flex-col gap-[12px] items-center justify-center p-[24px] relative rounded-[12px] shrink-0 size-[162.67px]" data-name="Button">
                <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                  <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[64px]" data-name="Container">
                    <Icon />
                  </div>
                </div>
                <Text1 text="123.jpg" additionalClassNames="flex-col items-start justify-center" />
              </div>
              <div className="bg-white content-stretch flex flex-col items-center justify-center p-[24px] relative rounded-[12px] shrink-0 size-[162.67px]" data-name="Button">
                <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-dashed inset-0 pointer-events-none rounded-[12px]" />
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="icon-wrapper">
                  <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[16px] shrink-0 size-[64px]" data-name="Container">
                    <div className="relative shrink-0 size-[37px]" data-name="lucide/plus">
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 37 37">
                        <g id="lucide/plus">
                          <rect fill="white" height="37" width="37" />
                          <path d={svgPaths.p3cf66980} id="Vector" stroke="var(--stroke-0, #2563EB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Wrapper2>
          <Wrapper2>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[25px] not-italic relative shrink-0 text-[#14181b] text-[18px] whitespace-nowrap">Property Photos</p>
            <Helper />
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#515d66] text-[16px] whitespace-nowrap">Upload photos to help with identification and documentation</p>
            <NavigationMenuContent>
              <div className="bg-white content-stretch flex flex-col gap-[8px] items-center p-[12px] relative rounded-[6px] shrink-0" data-name="navigation menu content item">
                <LucideImage />
                <FieldColText text="or" />
              </div>
              <ButtonText1 text="Browse Files" />
            </NavigationMenuContent>
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="upload-grid">
              <div className="bg-white content-stretch flex h-[72px] items-center justify-between px-[8px] relative rounded-[12px] shrink-0 w-[1096px]" data-name="Button">
                <div aria-hidden="true" className="absolute border-2 border-[#e8eaed] border-solid inset-0 pointer-events-none rounded-[12px]" />
                <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="file-info">
                  <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[57px]" data-name="icon-wrapper">
                    <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[49px]" data-name="Container">
                      <Icon1 />
                    </div>
                  </div>
                  <FieldCol text="Title_Deed_SR00015.pdf" text1="Uploaded 2 minutes ago" />
                </div>
                <FileNameRow />
              </div>
              <Button>
                <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="file-info">
                  <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[57px]" data-name="icon-wrapper">
                    <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[49px]" data-name="Container">
                      <Icon1 />
                    </div>
                  </div>
                  <FieldCol text="Title_Deed_SR00015.pdf" text1="Uploaded 2 minutes ago" />
                </div>
                <FileNameRow />
              </Button>
              <Button>
                <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="file-info">
                  <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[57px]" data-name="icon-wrapper">
                    <div className="bg-[#f0f9ff] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[49px]" data-name="Container">
                      <Icon1 />
                    </div>
                  </div>
                  <FieldCol text="Title_Deed_SR00015.pdf" text1="Uploaded 2 minutes ago" />
                </div>
                <FileNameRow />
              </Button>
            </div>
          </Wrapper2>
          <div className="bg-white h-[73px] max-w-[1160px] relative shrink-0 w-[1160px]" data-name="action-bar">
            <div aria-hidden="true" className="absolute border-[#e8eaed] border-solid border-t-2 inset-0 pointer-events-none" />
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[32px] relative size-full">
              <ButtonText text="Save as Draft" />
              <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="button-group">
                <ButtonText text="Go Back" />
                <ButtonText1 text="Continue" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-[1_0_0] h-[80px] min-h-px min-w-px relative" data-name="page-heading">
        <div className="flex flex-row items-center size-full">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid size-full" />
        </div>
      </div>
    </div>
  );
}