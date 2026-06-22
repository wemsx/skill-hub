import React, { cloneElement, useLayoutEffect, useRef, useState } from "react";

const DefaultHomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const DefaultCompassIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
);

const DefaultBellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export type LimelightNavItem = {
  id: string | number;
  icon: React.ReactElement<{ className?: string }>;
  label?: string;
  onClick?: () => void;
};

const defaultNavItems: LimelightNavItem[] = [
  { id: "default-home", icon: <DefaultHomeIcon />, label: "Home" },
  { id: "default-explore", icon: <DefaultCompassIcon />, label: "Explore" },
  { id: "default-notifications", icon: <DefaultBellIcon />, label: "Notifications" },
];

type LimelightNavProps = {
  items?: LimelightNavItem[];
  defaultActiveIndex?: number;
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
  limelightClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
  orientation?: "horizontal" | "vertical";
};

/**
 * Adaptive-width navigation with a limelight marker that tracks the active item.
 */
export function LimelightNav({
  items = defaultNavItems,
  defaultActiveIndex = 0,
  activeIndex,
  onTabChange,
  className = "",
  limelightClassName = "",
  iconContainerClassName = "",
  iconClassName = "",
  orientation = "horizontal",
}: LimelightNavProps) {
  const [internalActiveIndex, setInternalActiveIndex] = useState(defaultActiveIndex);
  const [isReady, setIsReady] = useState(false);
  const currentActiveIndex = activeIndex ?? internalActiveIndex;
  const navItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (items.length === 0) return;

    const limelight = limelightRef.current;
    const activeItem = navItemRefs.current[currentActiveIndex];

    if (limelight && !activeItem) {
      limelight.style.left = "-999px";
      limelight.style.top = "-999px";
      return;
    }

    if (limelight && activeItem) {
      if (orientation === "vertical") {
        const newTop = activeItem.offsetTop + activeItem.offsetHeight / 2 - limelight.offsetHeight / 2;
        limelight.style.top = `${newTop}px`;
        limelight.style.left = "0";
      } else {
        const newLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
        limelight.style.left = `${newLeft}px`;
        limelight.style.top = "0";
      }

      if (!isReady) {
        window.setTimeout(() => setIsReady(true), 50);
      }
    }
  }, [currentActiveIndex, isReady, items, orientation]);

  if (items.length === 0) {
    return null;
  }

  const handleItemClick = (index: number, itemOnClick?: () => void) => {
    if (activeIndex == null) {
      setInternalActiveIndex(index);
    }
    onTabChange?.(index);
    itemOnClick?.();
  };

  return (
    <nav
      className={`relative inline-flex items-center h-16 rounded-lg bg-card text-foreground border border-border px-2 ${className}`}
    >
      {items.map(({ id, icon, label, onClick }, index) => (
        <button
          key={id}
          ref={(element) => {
            navItemRefs.current[index] = element;
          }}
          className={`relative z-20 flex h-full cursor-pointer items-center justify-center p-5 bg-transparent border-0 text-inherit ${iconContainerClassName}`}
          onClick={() => handleItemClick(index, onClick)}
          aria-label={label}
          type="button"
        >
          {cloneElement(icon, {
            className: `w-6 h-6 transition-opacity duration-100 ease-in-out ${
              currentActiveIndex === index ? "opacity-100" : "opacity-40"
            } ${icon.props.className ?? ""} ${iconClassName}`,
          })}
        </button>
      ))}

      <div
        ref={limelightRef}
        className={`absolute z-10 rounded-full bg-primary ${
          orientation === "vertical"
            ? "left-0 w-[5px] h-11 shadow-[50px_0_15px_var(--primary)]"
            : "top-0 w-11 h-[5px] shadow-[0_50px_15px_var(--primary)]"
        } ${
          isReady ? "transition-[left,top] duration-400 ease-in-out" : ""
        } ${limelightClassName}`}
        style={{ left: "-999px", top: "-999px" }}
      >
        <div
          className={
            orientation === "vertical"
              ? "absolute left-[5px] top-[-30%] w-14 h-[160%] [clip-path:polygon(0_25%,100%_5%,100%_95%,0_75%)] bg-gradient-to-r from-primary/30 to-transparent pointer-events-none"
              : "absolute left-[-30%] top-[5px] w-[160%] h-14 [clip-path:polygon(5%_100%,25%_0,75%_0,95%_100%)] bg-gradient-to-b from-primary/30 to-transparent pointer-events-none"
          }
        />
      </div>
    </nav>
  );
}
