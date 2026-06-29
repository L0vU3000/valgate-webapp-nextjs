"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      // "around" puts PreviousMonthButton + MonthCaption + NextMonthButton directly
      // inside each Month div in DOM order, so CSS grid can lay them out as a single row.
      navLayout="around"
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",

        // 3-column grid: [prev btn] [caption] [next btn] on row 1,
        // month_grid spans all 3 columns on row 2.
        month: "grid grid-cols-[2.25rem_1fr_2.25rem] gap-x-2 gap-y-4",

        month_caption: "flex justify-center items-center h-9",
        // caption_label is reused inside each Dropdown as a visual mirror of the select value.
        // We're using the native <select> directly so this duplicate span must be hidden.
        caption_label: "hidden",

        // Dropdown container (rendered inside MonthCaption when captionLayout="dropdown")
        dropdowns: "flex items-center gap-1.5",
        dropdown_root: "relative",
        // The native <select> — no box, inherits font, cursor pointer
        dropdown: [
          "appearance-none cursor-pointer bg-transparent text-[13px] font-semibold text-foreground",
          "border border-border rounded-lg py-1 pl-2.5 pr-6 outline-none",
          "hover:border-slate-400 focus:border-primary transition-colors duration-150",
        ].join(" "),
        months_dropdown: "",
        years_dropdown: "",

        // Nav buttons — these use button_previous / button_next class names when
        // navLayout="around", sized to fill their grid cell (2.25rem = 36px = size-9)
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-9 p-0 opacity-80 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-9 p-0 opacity-80 hover:opacity-100",
        ),

        // Grid spans all 3 grid columns so it sits below the full header row
        month_grid: "col-span-3 w-full border-collapse",

        weekdays: "flex",
        // Fixed w-9 cells — every column is the same width so Feb ≡ Dec in width
        weekday: "w-9 text-center text-[11px] uppercase tracking-wider text-muted-foreground font-medium",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-[13px] w-9",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal rounded-full aria-selected:opacity-100",
        ),

        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-semibold",
        outside: "opacity-40",
        disabled: "opacity-30 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) =>
          props.orientation === "left" ? (
            <ChevronLeft className="size-[14px]" />
          ) : (
            <ChevronRight className="size-[14px]" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
